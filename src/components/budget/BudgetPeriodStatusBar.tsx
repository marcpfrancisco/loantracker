import { useState } from "react";
import { Lock, LockOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatMonthLabel,
  getBudgetPeriodClosedMessage,
  isBudgetPeriodClosed,
  isPastBudgetMonth,
} from "@/lib/budgetRules";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { BudgetPeriod } from "@/types/budget";

interface BudgetPeriodStatusBarProps {
  period: BudgetPeriod;
  monthKey: string;
  isPending: boolean;
  onToggleStatus: (status: "open" | "closed") => void;
}

export function BudgetPeriodStatusBar({
  period,
  monthKey,
  isPending,
  onToggleStatus,
}: BudgetPeriodStatusBarProps) {
  const [confirmClose, setConfirmClose] = useState(false);
  const closed = isBudgetPeriodClosed(period);
  const isPast = isPastBudgetMonth(monthKey);

  return (
    <>
      <div
        className={cn(
          "flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
          closed ? "border-amber-500/30 bg-amber-500/5" : "border-border/60 bg-card"
        )}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-foreground text-sm font-medium">{formatMonthLabel(monthKey)}</p>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase",
                closed
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
              )}
            >
              {closed ? "Closed" : "Open"}
            </span>
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
            {closed
              ? getBudgetPeriodClosedMessage()
              : isPast
                ? "Past month still open — close when totals are final."
                : "Add entries and set targets while this month is open."}
          </p>
        </div>

        {closed ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => onToggleStatus("open")}
            className="border-border/60 text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50"
          >
            <LockOpen className="h-3.5 w-3.5" />
            Reopen month
          </button>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => setConfirmClose(true)}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-600 disabled:opacity-50 dark:text-amber-400"
          >
            <Lock className="h-3.5 w-3.5" />
            Close month
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmClose}
        title="Close this budget month?"
        description="Entries and targets will be locked. You can reopen later if you need to make changes."
        confirmLabel="Close month"
        cancelLabel="Keep open"
        variant="warning"
        isPending={isPending}
        onConfirm={() => {
          onToggleStatus("closed");
          setConfirmClose(false);
        }}
        onCancel={() => setConfirmClose(false)}
      />
    </>
  );
}
