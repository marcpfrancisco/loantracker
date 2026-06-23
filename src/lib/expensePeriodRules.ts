import type { PaidStatus } from "@/lib/expensePeriodStyles";

export type PeriodClosureInput = {
  period: string;
  is_locked: boolean;
  is_archived: boolean;
  paid_status: PaidStatus;
};

export function isPastMonth(period: string): boolean {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  return period < currentMonth;
}

/** Whether items/payments should be blocked for this period. */
export function isPeriodClosedForItems(input: PeriodClosureInput): boolean {
  if (input.is_archived) return true;
  if (input.is_locked) return true;
  if (input.paid_status === "paid" && isPastMonth(input.period)) return true;
  return false;
}

export function getPeriodClosedMessage(input: PeriodClosureInput): string {
  if (input.is_archived) return "This month is archived — no changes allowed.";
  if (input.is_locked) return "This month is locked — unlock to add items.";
  if (input.paid_status === "paid" && isPastMonth(input.period)) {
    return "This month is fully paid and closed.";
  }
  return "";
}

export function computePaidStatus(totalOwed: number, totalPaid: number): PaidStatus {
  const outstanding = Math.max(0, totalOwed - totalPaid);
  if (totalPaid === 0) return "unpaid";
  return outstanding <= 0 ? "paid" : "partial";
}
