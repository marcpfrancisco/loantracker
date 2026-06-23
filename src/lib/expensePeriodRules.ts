export type PaidStatus = "unpaid" | "partial" | "paid";

export type PeriodClosureInput = {
  period: string;
  is_locked: boolean;
  is_archived: boolean;
  paid_status: PaidStatus;
  outstanding?: number;
  total_owed?: number;
};

/** Round to 2 decimal places — matches currency display and avoids float dust. */
export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function computeOutstanding(totalOwed: number, totalPaid: number): number {
  return Math.max(0, roundMoney(totalOwed - totalPaid));
}

export function hasOutstandingBalance(outstanding: number): boolean {
  return roundMoney(outstanding) > 0;
}

// Fixed string comparison from supabase
// Supabase return values like: 2026-01-01 00:00:00.000000+00
// We want to compare the date part only (2026-01-01)
export function normalizePeriodKey(period: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(period);
  return match ? match[1] : period.slice(0, 10);
}

export function currentMonthStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export function isPastMonth(period: string): boolean {
  return normalizePeriodKey(period) < currentMonthStr();
}

export function isCurrentMonth(period: string): boolean {
  return normalizePeriodKey(period) === currentMonthStr();
}

export function computePaidStatus(totalOwed: number, totalPaid: number): PaidStatus {
  const outstanding = computeOutstanding(totalOwed, totalPaid);
  if (totalOwed === 0 && totalPaid === 0) return "unpaid";
  if (!hasOutstandingBalance(outstanding)) return "paid";
  if (totalPaid === 0) return "unpaid";
  return "partial";
}

export function isPeriodSettled(
  input: Pick<PeriodClosureInput, "outstanding" | "total_owed">
): boolean {
  const totalOwed = roundMoney(input.total_owed ?? 0);
  if (totalOwed <= 0) return false;
  return !hasOutstandingBalance(input.outstanding ?? 0);
}

/** Block adding or editing expense items. */
export function isPeriodClosedForItems(input: PeriodClosureInput): boolean {
  const periodKey = normalizePeriodKey(input.period);
  if (input.is_archived) return true;
  if (isPastMonth(periodKey)) return true;
  if (isCurrentMonth(periodKey) && input.is_locked) return true;
  return false;
}

/** Block recording or deleting payments. */
export function isPeriodClosedForPayments(input: PeriodClosureInput): boolean {
  const periodKey = normalizePeriodKey(input.period);
  if (input.is_archived) return true;
  if (isCurrentMonth(periodKey) && input.is_locked) return true;
  if (isPastMonth(periodKey) && isPeriodSettled(input)) return true;
  return false;
}

export function getPeriodClosedMessage(input: PeriodClosureInput): string {
  const periodKey = normalizePeriodKey(input.period);
  if (input.is_archived) return "This month is archived — no changes allowed.";
  if (isPastMonth(periodKey)) {
    return isPeriodSettled(input)
      ? "This past month is fully paid and closed."
      : "Past months are closed — you can record payments but not add new items.";
  }
  if (isCurrentMonth(periodKey) && input.is_locked) {
    return "This month is locked — unlock to add or edit items.";
  }
  return "";
}

/** Lock/unlock only applies to the current calendar month. */
export function canTogglePeriodLock(period: string): boolean {
  return isCurrentMonth(normalizePeriodKey(period));
}
