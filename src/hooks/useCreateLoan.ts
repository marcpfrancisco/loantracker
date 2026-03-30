import { CREDIT_SOURCE_CONFIGS, type FirstDueStrategy } from "./../types/schema";
import type { TablesInsert } from "@/types/database";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { computeInstallmentAmounts } from "@/lib/installmentStrategies";
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
}

function generateInstallments(
  loanId: string,
  payload: CreateLoanPayload
): TablesInsert<"installments">[] {
  const {
    principal,
    interest_rate,
    service_fee,
    installments_total,
    started_at,
    due_day_of_month,
    loan_type,
    first_due_strategy,
  } = payload;

  const { baseAmount, lastAmount } = computeInstallmentAmounts(loan_type, {
    principal,
    interest_rate,
    service_fee,
    installments_total,
  });

  const startDate = new Date(started_at + "T00:00:00");
  const startDay = startDate.getDate();
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth(); // 0-indexed

  // Determine if first installment is same month or next
  const firstOffset =
    first_due_strategy === "same_month_if_possible"
      ? due_day_of_month !== null && startDay <= due_day_of_month
        ? 0
        : 1
      : 1;

  return Array.from({ length: installments_total }, (_, i) => {
    const rawMonth = startMonth + firstOffset + i;

    const targetYear = startYear + Math.floor(rawMonth / 12);
    const targetMonth = rawMonth % 12;

    const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

    const targetDay =
      due_day_of_month !== null ? Math.min(due_day_of_month, lastDayOfMonth) : startDay;

    const mo = String(targetMonth + 1).padStart(2, "0");
    const d = String(targetDay).padStart(2, "0");

    return {
      loan_id: loanId,
      installment_no: i + 1,
      due_date: `${targetYear}-${mo}-${d}`,
      amount: i === installments_total - 1 ? lastAmount : baseAmount,
      status: "unpaid" as const,
    };
  });
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
