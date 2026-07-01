import { Link } from "react-router";
import { Trash2, Split } from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";
import {
  canConvertTransactionToLoan,
  cardTxnIncreasesBalance,
  cardTxnTypeLabel,
} from "@/lib/cardRules";
import { cn } from "@/lib/utils";
import type { CardTransaction } from "@/types/cards";

interface CardTransactionListProps {
  transactions: CardTransaction[];
  currency: string;
  onDelete?: (transactionId: string) => void;
  onConvert?: (transaction: CardTransaction) => void;
  isDeleting?: boolean;
  showConvertActions?: boolean;
}

export function CardTransactionList({
  transactions,
  currency,
  onDelete,
  onConvert,
  isDeleting,
  showConvertActions = false,
}: CardTransactionListProps) {
  if (transactions.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        No transactions yet. Add a charge, payment, or link from Budget.
      </p>
    );
  }

  return (
    <ul className="divide-border/40 divide-y">
      {transactions.map((txn) => {
        const increases = cardTxnIncreasesBalance(txn.txn_type);
        const label =
          txn.merchant?.trim() ||
          txn.description?.trim() ||
          txn.budget_categories?.name ||
          cardTxnTypeLabel(txn.txn_type);
        const date = new Date(txn.txn_date + "T12:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        const canConvert = showConvertActions && onConvert && canConvertTransactionToLoan(txn);

        return (
          <li key={txn.id} className="flex items-start gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-foreground truncate text-sm font-medium">{label}</p>
                <p
                  className={cn(
                    "shrink-0 text-sm tabular-nums",
                    increases ? "text-rose-400" : "text-emerald-500"
                  )}
                >
                  {increases ? "+" : "−"}
                  {formatCurrency(Number(txn.amount), currency)}
                </p>
              </div>
              <p className="text-muted-foreground text-xs">
                {date} · {cardTxnTypeLabel(txn.txn_type)}
                {txn.budget_entry_id ? " · from budget" : ""}
                {txn.linked_loan ? (
                  <>
                    {" "}
                    ·{" "}
                    <Link
                      to={`/loans/${txn.linked_loan.id}`}
                      className="text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {txn.linked_loan.installments_total}-mo plan · {txn.linked_loan.status}
                    </Link>
                  </>
                ) : null}
                {txn.description && txn.merchant ? ` · ${txn.description}` : ""}
              </p>
              {canConvert && (
                <button
                  type="button"
                  onClick={() => onConvert(txn)}
                  className="text-primary mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium hover:underline"
                >
                  <Split className="h-3 w-3" />
                  Convert to installment plan
                </button>
              )}
            </div>
            {onDelete && !txn.budget_entry_id && !txn.linked_loan && (
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => onDelete(txn.id)}
                className="text-muted-foreground shrink-0 rounded p-1 hover:text-rose-400 disabled:opacity-50"
                aria-label="Delete transaction"
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
