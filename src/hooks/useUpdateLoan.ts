import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { computeInstallmentAmounts } from "@/lib/installmentStrategies";
import type { LoanType } from "@/types/enums";
import type { InstallmentDetail } from "@/hooks/useLoanDetail";

export interface UpdateLoanPayload {
  loanId: string;
  // Editable fields
  principal: number;
  interest_rate: number | null;
  service_fee: number;
  due_day_of_month: number | null;
  notes: string | null;
  // Needed for installment recomputation
  loan_type: LoanType;
  installments_total: number;
  originalDueDay: number | null;
  installments: InstallmentDetail[];
}

async function updateLoan(payload: UpdateLoanPayload): Promise<void> {
  // 1. Update the loan row
  const { error: loanError } = await supabase
    .from("loans")
    .update({
      principal: payload.principal,
      interest_rate: payload.interest_rate,
      service_fee: payload.service_fee,
      due_day_of_month: payload.due_day_of_month,
      notes: payload.notes,
    })
    .eq("id", payload.loanId);

  if (loanError) throw loanError;

  // 2. Recompute unpaid/pending installments
  const unpaid = payload.installments.filter((i) => i.status !== "paid");
  if (unpaid.length === 0) return;

  const { baseAmount, lastAmount } = computeInstallmentAmounts(payload.loan_type, {
    principal: payload.principal,
    interest_rate: payload.interest_rate,
    service_fee: payload.service_fee,
    installments_total: payload.installments_total,
  });

  const dueDayChanged = payload.due_day_of_month !== payload.originalDueDay;

  await Promise.all(
    unpaid.map((inst) => {
      const isLast = inst.installment_no === payload.installments_total;
      const newAmount = isLast ? lastAmount : baseAmount;

      const updates: { amount: number; due_date?: string } = { amount: newAmount };

      if (dueDayChanged && payload.due_day_of_month !== null) {
        // Preserve year/month; only update the day component
        const [year, month] = inst.due_date.split("-").map(Number);
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        const newDay = Math.min(payload.due_day_of_month, lastDayOfMonth);
        updates.due_date = `${year}-${String(month).padStart(2, "0")}-${String(newDay).padStart(2, "0")}`;
      }

      return supabase.from("installments").update(updates).eq("id", inst.id);
    })
  );
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
    onError: () => {
      toast.error("Failed to update loan. Please try again.");
    },
  });
}
