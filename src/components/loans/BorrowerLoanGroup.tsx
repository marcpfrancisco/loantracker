import { useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LoanListItem } from "@/hooks/useLoans";

// ── Helpers ────────────────────────────────────────────────────────────────────

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays <= 7) return `${diffDays}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isLoanOverdue(loan: LoanListItem) {
  return (
    loan.status === "active" &&
    loan.nextDueDate !== null &&
    new Date(loan.nextDueDate + "T00:00:00") < new Date(new Date().toDateString())
  );
}

// ── Status badge styles ────────────────────────────────────────────────────────

const statusStyles = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  completed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  defaulted: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
} as const;

// ── CompactLoanRow ─────────────────────────────────────────────────────────────

export function CompactLoanRow({ loan }: { loan: LoanListItem }) {
  const navigate = useNavigate();
  const progress = loan.installments_total > 0 ? loan.paidCount / loan.installments_total : 0;
  const isOverdue = isLoanOverdue(loan);

  return (
    <button
      type="button"
      onClick={() => void navigate(`/loans/${loan.id}`)}
      className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
    >
      {/* Source + status + progress */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-foreground truncate text-sm font-medium">
            {loan.credit_source.name}
          </span>
          <span
            className={cn(
              "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium capitalize",
              statusStyles[loan.status]
            )}
          >
            {loan.status}
          </span>
          {loan.pendingCount > 0 && (
            <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
              {loan.pendingCount} pending
            </span>
          )}
        </div>
        {/* Slim progress bar */}
        <div className="mt-1.5 flex items-center gap-2">
          <div className="bg-muted h-1 flex-1 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span className="text-muted-foreground shrink-0 text-[10px] tabular-nums">
            {loan.paidCount}/{loan.installments_total}
          </span>
        </div>
      </div>

      {/* Principal + due date */}
      <div className="shrink-0 text-right">
        <p className="text-foreground text-sm font-semibold tabular-nums">
          {formatCurrency(loan.principal, loan.currency)}
        </p>
        {loan.status === "active" && loan.nextDueDate && (
          <p
            className={cn(
              "text-[10px] tabular-nums",
              isOverdue ? "font-medium text-rose-400" : "text-muted-foreground"
            )}
          >
            <CalendarClock className="mr-0.5 inline h-2.5 w-2.5" />
            {formatDueDate(loan.nextDueDate)}
          </p>
        )}
        {loan.status === "active" && !loan.nextDueDate && (
          <p className="text-muted-foreground text-[10px]">All submitted</p>
        )}
      </div>

      <ChevronDown className="text-muted-foreground/40 group-hover:text-muted-foreground h-3.5 w-3.5 shrink-0 -rotate-90 transition-colors" />
    </button>
  );
}

// ── BorrowerLoanGroup ──────────────────────────────────────────────────────────

interface BorrowerLoanGroupProps {
  borrowerName: string;
  loans: LoanListItem[];
  defaultOpen?: boolean;
}

export function BorrowerLoanGroup({
  borrowerName,
  loans,
  defaultOpen = true,
}: BorrowerLoanGroupProps) {
  const [open, setOpen] = useState(defaultOpen);

  const activeCount = loans.filter((l) => l.status === "active").length;
  const hasOverdue = loans.some(isLoanOverdue);

  return (
    <div className="bg-card border-border/60 overflow-hidden rounded-xl border">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/20"
      >
        {/* Avatar */}
        <div className="bg-primary/10 text-primary border-primary/20 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold">
          {getInitials(borrowerName)}
        </div>

        {/* Name + stats */}
        <div className="min-w-0 flex-1 text-left">
          <p className="text-foreground truncate text-sm font-semibold">{borrowerName}</p>
          <p className="text-muted-foreground text-xs">
            {loans.length} loan{loans.length !== 1 ? "s" : ""}
            {activeCount > 0 && <span> · {activeCount} active</span>}
          </p>
        </div>

        {/* Overdue indicator */}
        {hasOverdue && (
          <span className="rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-400">
            Overdue
          </span>
        )}

        {/* Chevron */}
        <ChevronDown
          className={cn(
            "text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Loan rows */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-border/60 border-t">
              {loans.map((loan, i) => (
                <div
                  key={loan.id}
                  className={cn(i < loans.length - 1 && "border-border/40 border-b")}
                >
                  <CompactLoanRow loan={loan} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Group skeleton ─────────────────────────────────────────────────────────────

export function BorrowerLoanGroupSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="bg-card border-border/60 overflow-hidden rounded-xl border">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
        <div className="flex-1 space-y-1.5">
          <div className="bg-muted h-3.5 w-28 animate-pulse rounded" />
          <div className="bg-muted h-2.5 w-16 animate-pulse rounded" />
        </div>
      </div>
      <div className="border-border/60 border-t">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-3 px-4 py-3",
              i < rows - 1 && "border-border/40 border-b"
            )}
          >
            <div className="flex-1 space-y-1.5">
              <div className="bg-muted h-3 w-24 animate-pulse rounded" />
              <div className="bg-muted h-1 w-full animate-pulse rounded-full" />
            </div>
            <div className="space-y-1 text-right">
              <div className="bg-muted h-3.5 w-16 animate-pulse rounded" />
              <div className="bg-muted h-2.5 w-12 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── groupLoansByBorrower util ──────────────────────────────────────────────────

export interface BorrowerGroup {
  id: string;
  name: string;
  loans: LoanListItem[];
}

export function groupLoansByBorrower(loans: LoanListItem[]): BorrowerGroup[] {
  const map = new Map<string, BorrowerGroup>();

  for (const loan of loans) {
    const id = loan.borrower?.id ?? "__unknown";
    const name = loan.borrower?.full_name ?? "Unknown Borrower";
    if (!map.has(id)) map.set(id, { id, name, loans: [] });
    map.get(id)!.loans.push(loan);
  }

  return [...map.values()].sort((a, b) => {
    // Borrowers with overdue loans float first, then alphabetical
    const aOverdue = a.loans.some(isLoanOverdue);
    const bOverdue = b.loans.some(isLoanOverdue);
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
