import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatCurrency";
import { isBurnGroup, isGoalGroup } from "@/lib/budgetRules";
import type { CategorySummary } from "@/types/budget";

interface BudgetCategoryRowProps {
  summary: CategorySummary;
  currency: string;
  onEditTarget?: (categoryId: string, currentTarget: number) => void;
}

export function BudgetCategoryRow({ summary, currency, onEditTarget }: BudgetCategoryRowProps) {
  const showBar = isBurnGroup(summary.group_key) || isGoalGroup(summary.group_key);
  const overBudget =
    isBurnGroup(summary.group_key) && summary.target > 0 && summary.actual > summary.target;
  const metGoal =
    isGoalGroup(summary.group_key) && summary.target > 0 && summary.actual >= summary.target;

  const barColor = useMemo(() => {
    if (overBudget) return "bg-rose-500";
    if (metGoal) return "bg-emerald-500";
    if (isGoalGroup(summary.group_key)) return "bg-sky-500";
    return "bg-primary";
  }, [overBudget, metGoal, summary.group_key]);

  return (
    <div className="flex flex-col gap-2 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-medium">{summary.name}</p>
          <p className="text-muted-foreground text-xs">
            {formatCurrency(summary.actual, currency)}
            {summary.target > 0 && (
              <span>
                {" "}
                / {formatCurrency(summary.target, currency)}
                {isGoalGroup(summary.group_key) ? " goal" : " budget"}
              </span>
            )}
          </p>
        </div>
        {onEditTarget && summary.group_key !== "income" && (
          <button
            type="button"
            onClick={() => onEditTarget(summary.category_id, summary.target)}
            className="text-muted-foreground hover:text-foreground shrink-0 text-xs underline-offset-2 hover:underline"
          >
            Set target
          </button>
        )}
      </div>
      {showBar && summary.target > 0 && (
        <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
          <div
            className={cn("h-full rounded-full transition-all", barColor)}
            style={{ width: `${Math.min(100, summary.percent_used)}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface BudgetGroupSectionProps {
  groupKey: import("@/types/budget").BudgetGroupKey;
  label: string;
  categories: CategorySummary[];
  currency: string;
  defaultOpen?: boolean;
  readOnly?: boolean;
  onEditTarget?: (categoryId: string, currentTarget: number) => void;
}

export function BudgetGroupSection({
  groupKey,
  label,
  categories,
  currency,
  defaultOpen = true,
  readOnly = false,
  onEditTarget,
}: BudgetGroupSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const groupCategories = categories.filter((c) => c.group_key === groupKey);
  const groupTotal = groupCategories.reduce((s, c) => s + c.actual, 0);

  if (groupCategories.length === 0) return null;

  return (
    <section className="border-border/60 bg-card overflow-hidden rounded-xl border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <p className="text-foreground text-sm font-semibold">{label}</p>
          <p className="text-muted-foreground text-xs">{formatCurrency(groupTotal, currency)}</p>
        </div>
        <span className="text-muted-foreground text-xs">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="border-border/60 divide-border/40 divide-y border-t px-4">
          {groupCategories.map((cat) => (
            <BudgetCategoryRow
              key={cat.category_id}
              summary={cat}
              currency={currency}
              onEditTarget={readOnly ? undefined : onEditTarget}
            />
          ))}
        </div>
      )}
    </section>
  );
}
