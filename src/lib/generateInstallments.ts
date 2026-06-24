import { computeInstallmentAmounts } from "@/lib/installmentStrategies";
import type { LoanType } from "@/types/enums";
import type { FirstDueStrategy } from "@/types/schema";

export interface InstallmentScheduleParams {
  loan_type: LoanType;
  principal: number;
  interest_rate: number | null;
  service_fee: number;
  installments_total: number;
  started_at: string;
  due_day_of_month: number | null;
  first_due_strategy: FirstDueStrategy;
  installment_overrides?: number[];
}

export interface InstallmentScheduleEntry {
  installment_no: number;
  due_date: string;
  amount: number;
  /** When true, first installment is marked paid at checkout (e.g. Tabby). */
  paid_at_checkout: boolean;
}

/** Build the full installment schedule for a loan (amounts + due dates). */
export function buildInstallmentSchedule(params: InstallmentScheduleParams): InstallmentScheduleEntry[] {
  const {
    principal,
    interest_rate,
    service_fee,
    installments_total,
    started_at,
    due_day_of_month,
    loan_type,
    first_due_strategy,
    installment_overrides,
  } = params;

  const { baseAmount, lastAmount } = computeInstallmentAmounts(loan_type, {
    principal,
    interest_rate,
    service_fee,
    installments_total,
  });

  const startDate = new Date(started_at + "T00:00:00");
  const startDay = startDate.getDate();
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();

  const firstOffset =
    first_due_strategy === "same_month_if_possible"
      ? due_day_of_month !== null && startDay <= due_day_of_month
        ? 0
        : 1
      : first_due_strategy === "immediate_first_then_monthly"
        ? 0
        : 1;

  const isImmediateFirst = first_due_strategy === "immediate_first_then_monthly";

  return Array.from({ length: installments_total }, (_, i) => {
    const rawMonth = startMonth + firstOffset + i;
    const targetYear = startYear + Math.floor(rawMonth / 12);
    const targetMonth = rawMonth % 12;
    const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const targetDay =
      due_day_of_month !== null ? Math.min(due_day_of_month, lastDayOfMonth) : startDay;

    const mo = String(targetMonth + 1).padStart(2, "0");
    const d = String(targetDay).padStart(2, "0");

    const amount =
      installment_overrides?.[i] ?? (i === installments_total - 1 ? lastAmount : baseAmount);

    return {
      installment_no: i + 1,
      due_date: `${targetYear}-${mo}-${d}`,
      amount,
      paid_at_checkout: isImmediateFirst && i === 0,
    };
  });
}
