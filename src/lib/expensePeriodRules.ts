export type PaidStatus = "unpaid" | "partial" | "paid";

export type PeriodClosureInput = {
  period: string;
  is_locked: boolean;
  is_archived: boolean;
  paid_status: PaidStatus;
  outstanding?: number;
  total_owed?: number;
};

export function currentMonthStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export function isPastMonth(period: string): boolean {
  return period < currentMonthStr();
}

export function isCurrentMonth(period: string): boolean {
  return period === currentMonthStr();
}

export function computePaidStatus(totalOwed: number, totalPaid: number): PaidStatus {
  const outstanding = Math.max(0, totalOwed - totalPaid);
  if (totalOwed === 0 && totalPaid === 0) return "unpaid";
  if (outstanding <= 0) return "paid";
  if (totalPaid === 0) return "unpaid";
  return "partial";
}

export function isPeriodSettled(input: Pick<PeriodClosureInput, "outstanding" | "total_owed" | "paid_status">): boolean {
  const outstanding = input.outstanding ?? 0;
  const totalOwed = input.total_owed ?? 0;
  return input.paid_status === "paid" || (totalOwed > 0 && outstanding <= 0);
}

/** Block adding or editing expense items. */
export function isPeriodClosedForItems(input: PeriodClosureInput): boolean {
  if (input.is_archived) return true;
  if (isPastMonth(input.period)) return true;
  if (isCurrentMonth(input.period) && input.is_locked) return true;
  return false;
}

/** Block recording or deleting payments. */
export function isPeriodClosedForPayments(input: PeriodClosureInput): boolean {
  if (input.is_archived) return true;
  if (isCurrentMonth(input.period) && input.is_locked) return true;
  if (isPastMonth(input.period) && isPeriodSettled(input)) return true;
  return false;
}

export function getPeriodClosedMessage(input: PeriodClosureInput): string {
  if (input.is_archived) return "This month is archived — no changes allowed.";
  if (isPastMonth(input.period)) {
    return isPeriodSettled(input)
      ? "This past month is fully paid and closed."
      : "Past months are closed — you can record payments but not add new items.";
  }
  if (isCurrentMonth(input.period) && input.is_locked) {
    return "This month is locked — unlock to add or edit items.";
  }
  return "";
}

/** Lock/unlock only applies to the current calendar month. */
export function canTogglePeriodLock(period: string): boolean {
  return isCurrentMonth(period);
}
