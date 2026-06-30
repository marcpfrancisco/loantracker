import { Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";
import type { BudgetEntry } from "@/types/budget";

interface BudgetEntryListProps {
  entries: BudgetEntry[];
  currency: string;
  onDelete?: (entryId: string) => void;
  isDeleting?: boolean;
}

export function BudgetEntryList({ entries, currency, onDelete, isDeleting }: BudgetEntryListProps) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        No entries yet. Add income, expenses, or allocations to get started.
      </p>
    );
  }

  return (
    <ul className="divide-border/40 divide-y">
      {entries.map((entry) => {
        const label = entry.budget_categories?.name ?? "Unknown";
        const date = new Date(entry.entry_date + "T12:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        return (
          <li key={entry.id} className="flex items-start gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-foreground truncate text-sm font-medium">{label}</p>
                <p className="text-foreground shrink-0 text-sm tabular-nums">
                  {formatCurrency(Number(entry.amount), currency)}
                </p>
              </div>
              <p className="text-muted-foreground text-xs">
                {date}
                {entry.description ? ` · ${entry.description}` : ""}
                {entry.wealth_accounts?.name ? ` · ${entry.wealth_accounts.name}` : ""}
                {entry.card_accounts?.name ? ` · ${entry.card_accounts.name}` : ""}
              </p>
            </div>
            {onDelete && (
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => onDelete(entry.id)}
                className="text-muted-foreground shrink-0 rounded p-1 hover:text-rose-400 disabled:opacity-50"
                aria-label="Delete entry"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
