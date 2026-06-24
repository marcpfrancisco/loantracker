import { CREDIT_SOURCE_CONFIGS, type FirstDueStrategy } from "./../types/schema";
import { buildInstallmentSchedule } from "@/lib/generateInstallments";
import type { TablesInsert } from "@/types/database";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { LoanType, CurrencyType, RegionType } from "@/types/enums";

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
  first_due_strategy: FirstDueStrategy;
  /**
   * When provided, overrides the computed per-installment amounts.
   * Length must equal installments_total.
   * Used for Tabby where the app may show non-equal splits.
   */
  installment_overrides?: number[];
}

function generateInstallments(
  loanId: string,
  payload: CreateLoanPayload
): TablesInsert<"installments">[] {
  const schedule = buildInstallmentSchedule({
    loan_type: payload.loan_type,
    principal: payload.principal,
    interest_rate: payload.interest_rate,
    service_fee: payload.service_fee,
    installments_total: payload.installments_total,
    started_at: payload.started_at,
    due_day_of_month: payload.due_day_of_month,
    first_due_strategy: payload.first_due_strategy,
    installment_overrides: payload.installment_overrides,
  });

  return schedule.map((entry) => ({
    loan_id: loanId,
    installment_no: entry.installment_no,
    due_date: entry.due_date,
    amount: entry.amount,
    status: entry.paid_at_checkout ? ("paid" as const) : ("unpaid" as const),
    paid_at: entry.paid_at_checkout
      ? new Date(payload.started_at + "T00:00:00").toISOString()
      : null,
  }));
}

async function createLoan(payload: CreateLoanPayload): Promise<{ loanId: string }> {
  const loanConfig = CREDIT_SOURCE_CONFIGS.flatMap((s) => s.loan_types).find(
    (l) => l.loan_type === payload.loan_type
  );

  if (!loanConfig) {
    throw new Error(`Loan config not found for type: ${payload.loan_type}`);
  }

  const resolvedPayload: CreateLoanPayload = {
    ...payload,
    first_due_strategy: loanConfig.first_due_strategy,
  };

  const { data: loan, error: loanError } = await supabase
    .from("loans")
    .insert({
      borrower_id: resolvedPayload.borrower_id,
      source_id: resolvedPayload.source_id,
      loan_type: resolvedPayload.loan_type,
      currency: resolvedPayload.currency,
      principal: resolvedPayload.principal,
      interest_rate: resolvedPayload.interest_rate,
      service_fee: resolvedPayload.service_fee,
      installments_total: resolvedPayload.installments_total,
      status: "active",
      region: resolvedPayload.region,
      started_at: resolvedPayload.started_at,
      due_day_of_month: resolvedPayload.due_day_of_month,
      notes: resolvedPayload.notes,
      first_due_strategy: resolvedPayload.first_due_strategy,
    })
    .select("id")
    .single();

  if (loanError) throw loanError;

  const installments = generateInstallments(loan.id, resolvedPayload);

  const { error: installError } = await supabase.from("installments").insert(installments);

  if (installError) throw installError;

  return { loanId: loan.id };
}

export function useCreateLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createLoan,
    onSuccess: ({ loanId }) => {
      toast.success("Loan created successfully.");
      void queryClient.invalidateQueries({ queryKey: ["loans"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "borrowers"] });
      void queryClient.invalidateQueries({ queryKey: ["my-loans"] });
      void queryClient.invalidateQueries({ queryKey: ["upcoming-installments"] });
      void supabase.functions.invoke("notify-loan-created", { body: { loanId } });
    },
    onError: () => {
      toast.error("Failed to create loan. Please try again.");
    },
  });
}
