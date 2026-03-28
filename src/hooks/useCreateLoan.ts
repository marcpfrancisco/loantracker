import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { computeInstallmentAmounts } from "@/lib/installmentStrategies";
import type { LoanType, CurrencyType, RegionType, TablesInsert } from "@/types/database";

export interface CreateLoanPayload {
  borrower_id: string;
  source_id: string;
  loan_type: LoanType;
  region: RegionType;
  currency: CurrencyType;
  principal: number;
  interest_rate: number | null;
  service_fee: number;
  installments_total: number;
  started_at: string;
  due_day_of_month: number | null;
  notes: string | null;
}

function generateInstallments(
  loanId: string,
  payload: CreateLoanPayload
): TablesInsert<"installments">[] {
  const { principal, interest_rate, service_fee, installments_total, started_at, due_day_of_month, loan_type } =
    payload;

  const { baseAmount, lastAmount } = computeInstallmentAmounts(loan_type, {
    principal,
    interest_rate,
    service_fee,
    installments_total,
  });

  return Array.from({ length: installments_total }, (_, i) => {
    const dueDate = new Date(started_at + "T00:00:00");
    dueDate.setMonth(dueDate.getMonth() + i);
    if (due_day_of_month !== null) {
      dueDate.setDate(due_day_of_month);
    }

    return {
      loan_id: loanId,
      installment_no: i + 1,
      due_date: dueDate.toISOString().split("T")[0],
      amount: i === installments_total - 1 ? lastAmount : baseAmount,
      status: "unpaid" as const,
    };
  });
}

async function createLoan(payload: CreateLoanPayload): Promise<void> {
  const { data: loan, error: loanError } = await supabase
    .from("loans")
    .insert({
      borrower_id: payload.borrower_id,
      source_id: payload.source_id,
      loan_type: payload.loan_type,
      currency: payload.currency,
      principal: payload.principal,
      interest_rate: payload.interest_rate,
      service_fee: payload.service_fee,
      installments_total: payload.installments_total,
      status: "active",
      region: payload.region,
      started_at: payload.started_at,
      due_day_of_month: payload.due_day_of_month,
      notes: payload.notes,
    })
    .select("id")
    .single();

  if (loanError) throw loanError;

  const installments = generateInstallments(loan.id, payload);
  const { error: installError } = await supabase.from("installments").insert(installments);
  if (installError) throw installError;
}

export function useCreateLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createLoan,
    onSuccess: () => {
      toast.success("Loan created successfully.");
      void queryClient.invalidateQueries({ queryKey: ["loans"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "borrowers"] });
      void queryClient.invalidateQueries({ queryKey: ["my-loans"] });
      void queryClient.invalidateQueries({ queryKey: ["upcoming-installments"] });
    },
    onError: () => {
      toast.error("Failed to create loan. Please try again.");
    },
  });
}
