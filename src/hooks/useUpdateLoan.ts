import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { buildInstallmentSchedule } from "@/lib/generateInstallments";
import { roundInterestRatePercent } from "@/lib/interestRate";
import type { LoanType } from "@/types/enums";
import type { FirstDueStrategy } from "@/types/schema";
import type { InstallmentDetail } from "@/hooks/useLoanDetail";

export interface UpdateLoanPayload {
  loanId: string;
  principal: number;
  interest_rate: number | null;
  service_fee: number;
  due_day_of_month: number | null;
  notes: string | null;
  started_at: string;
  installments_total: number;
  loan_type: LoanType;
  first_due_strategy: FirstDueStrategy;
  installments: InstallmentDetail[];
}

async function updateLoan(payload: UpdateLoanPayload): Promise<void> {
  const paid = payload.installments.filter((i) => i.status === "paid");
  const paidCount = paid.length;
  const interestRate = roundInterestRatePercent(payload.interest_rate);

  if (payload.installments_total < paidCount) {
    throw new Error(
      `Cannot set ${payload.installments_total} installments — ${paidCount} already paid.`
    );
  }

  const { error: loanError } = await supabase
    .from("loans")
    .update({
      principal: payload.principal,
      interest_rate: interestRate,
      service_fee: payload.service_fee,
      due_day_of_month: payload.due_day_of_month,
      notes: payload.notes,
      started_at: payload.started_at,
      installments_total: payload.installments_total,
    })
    .eq("id", payload.loanId);

  if (loanError) throw loanError;

  const schedule = buildInstallmentSchedule({
    loan_type: payload.loan_type,
    principal: payload.principal,
    interest_rate: interestRate,
    service_fee: payload.service_fee,
    installments_total: payload.installments_total,
    started_at: payload.started_at,
    due_day_of_month: payload.due_day_of_month,
    first_due_strategy: payload.first_due_strategy,
  });

  const existingByNo = new Map(payload.installments.map((i) => [i.installment_no, i]));

  // Remove unpaid installments beyond the new total
  const toDelete = payload.installments.filter(
    (i) => i.status !== "paid" && i.installment_no > payload.installments_total
  );
  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("installments")
      .delete()
      .in(
        "id",
        toDelete.map((i) => i.id)
      );
    if (error) throw error;
  }

  for (const entry of schedule) {
    const existing = existingByNo.get(entry.installment_no);

    if (existing?.status === "paid") continue;

    if (existing) {
      const { error } = await supabase
        .from("installments")
        .update({
          amount: entry.amount,
          due_date: entry.due_date,
        })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("installments").insert({
        loan_id: payload.loanId,
        installment_no: entry.installment_no,
        due_date: entry.due_date,
        amount: entry.amount,
        status: "unpaid",
      });
      if (error) throw error;
    }
  }
}

export function useUpdateLoan(loanId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateLoan,
    onSuccess: () => {
      toast.success("Loan updated successfully.");
      void queryClient.invalidateQueries({ queryKey: ["loan", loanId] });
      void queryClient.invalidateQueries({ queryKey: ["loans"] });
      void queryClient.invalidateQueries({ queryKey: ["loans-infinite"] });
      void queryClient.invalidateQueries({ queryKey: ["my-loans"] });
      void queryClient.invalidateQueries({ queryKey: ["upcoming-installments"] });
      void queryClient.invalidateQueries({ queryKey: ["overdue-installments"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update loan. Please try again.");
    },
  });
}
