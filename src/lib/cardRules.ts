import type { BudgetEntryType } from "@/types/budget";
import type { CardKind, CardStatementStatus, CardTxnType } from "@/types/cards";

/** Maps a budget entry + card kind to a ledger transaction type, if any. */
export function cardTxnTypeForBudgetEntry(
  entryType: BudgetEntryType,
  cardKind: CardKind
): CardTxnType | null {
  if (cardKind !== "credit") return null;
  if (entryType === "expense") return "charge";
  if (entryType === "transfer") return "payment";
  return null;
}

export function cardTxnIncreasesBalance(txnType: CardTxnType): boolean {
  return txnType === "charge" || txnType === "fee";
}

export function cardTxnTypeLabel(txnType: CardTxnType): string {
  switch (txnType) {
    case "charge":
      return "Charge";
    case "payment":
      return "Payment";
    case "refund":
      return "Refund";
    case "fee":
      return "Fee";
  }
}

export function cardStatementStatusLabel(status: CardStatementStatus): string {
  switch (status) {
    case "open":
      return "Open";
    case "closed":
      return "Closed";
    case "paid":
      return "Paid";
  }
}

/** Compute charge/payment txn needed to move balance from current to target. */
export function balanceAdjustmentTxn(
  currentBalance: number,
  targetBalance: number
): { txnType: "charge" | "payment"; amount: number } | null {
  const delta = targetBalance - currentBalance;
  if (Math.abs(delta) < 0.005) return null;
  if (delta > 0) return { txnType: "charge", amount: delta };
  return { txnType: "payment", amount: Math.abs(delta) };
}

export function formatStatementPeriod(start: string, end: string): string {
  const startDate = new Date(start + "T12:00:00");
  const endDate = new Date(end + "T12:00:00");
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const yearOpts: Intl.DateTimeFormatOptions = { ...opts, year: "numeric" };
  if (startDate.getFullYear() === endDate.getFullYear()) {
    return `${startDate.toLocaleDateString("en-US", opts)} – ${endDate.toLocaleDateString("en-US", yearOpts)}`;
  }
  return `${startDate.toLocaleDateString("en-US", yearOpts)} – ${endDate.toLocaleDateString("en-US", yearOpts)}`;
}
