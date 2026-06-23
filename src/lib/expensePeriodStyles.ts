import {
  isCurrentMonth,
  isPastMonth,
  isPeriodSettled,
  normalizePeriodKey,
  type PaidStatus,
  type PeriodClosureInput,
} from "@/lib/expensePeriodRules";

export type { PaidStatus };

export type PeriodVisualStatus = "archived" | "paid" | "locked" | "closed" | "ongoing" | "draft";

export const PERIOD_STATUS_STYLES: Record<PeriodVisualStatus, string> = {
  paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  locked: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  closed: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  ongoing: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  draft: "bg-zinc-500/10 text-zinc-400 border-zinc-500/25 border-dashed",
  archived: "bg-violet-500/15 text-violet-400 border-violet-500/30",
};

export const PERIOD_STATUS_SEGMENT: Record<PeriodVisualStatus, string> = {
  paid: "bg-emerald-500",
  locked: "bg-orange-500",
  closed: "bg-zinc-500",
  ongoing: "bg-sky-500",
  draft: "bg-zinc-500/60",
  archived: "bg-violet-500",
};

export const PERIOD_STATUS_EMPTY_SEGMENT = "bg-muted/50";

export const MONTH_INITIALS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"] as const;

export const PERIOD_STATUS_LEGEND: { status: PeriodVisualStatus; label: string }[] = [
  { status: "paid", label: "Paid" },
  { status: "ongoing", label: "Ongoing" },
  { status: "locked", label: "Locked" },
  { status: "closed", label: "Closed" },
  { status: "draft", label: "Draft" },
  { status: "archived", label: "Archived" },
];

export function getPeriodVisualStatus(
  opts: PeriodClosureInput & { isVirtual?: boolean }
): PeriodVisualStatus {
  const periodKey = normalizePeriodKey(opts.period);
  if (opts.is_archived) return "archived";
  if (isPeriodSettled(opts)) return "paid";
  if (isPastMonth(periodKey)) return "closed";
  if (isCurrentMonth(periodKey) && opts.is_locked) return "locked";
  if (opts.isVirtual) return "draft";
  return "ongoing";
}

/** Sort periods Jan → Dec within each year bucket. */
export function sortPeriodsChronologically<T extends { period: string }>(periods: T[]): T[] {
  return [...periods].sort((a, b) => a.period.localeCompare(b.period));
}

/** Group periods by year (newest year first), months ascending within each year. */
export function groupPeriodsByYear<T extends { period: string }>(
  periods: T[]
): { year: string; periods: T[] }[] {
  const byYear = periods.reduce<Record<string, T[]>>((acc, p) => {
    const year = p.period.slice(0, 4);
    (acc[year] ??= []).push(p);
    return acc;
  }, {});

  return Object.keys(byYear)
    .sort((a, b) => b.localeCompare(a))
    .map((year) => ({ year, periods: sortPeriodsChronologically(byYear[year]) }));
}
