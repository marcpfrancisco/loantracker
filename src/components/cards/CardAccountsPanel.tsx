import { Pencil, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";
import type { CardAccount } from "@/types/cards";
import { CARD_KIND_LABELS } from "@/types/cards";

interface CardAccountsPanelProps {
  cards: CardAccount[];
  currency: string;
  onAdd?: () => void;
  onEdit?: (cardId: string) => void;
  onUpdateBalance?: (cardId: string) => void;
}

export function CardAccountsPanel({
  cards,
  currency,
  onAdd,
  onEdit,
  onUpdateBalance,
}: CardAccountsPanelProps) {
  const totalOwed = cards.reduce((s, c) => s + Number(c.outstanding_balance), 0);
  const totalLimit = cards
    .filter((c) => c.card_kind === "credit" && c.credit_limit != null)
    .reduce((s, c) => s + Number(c.credit_limit), 0);

  return (
    <div className="border-border/60 bg-card rounded-xl border p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-foreground text-sm font-semibold">Your cards</p>
          <p className="text-muted-foreground text-xs">
            {cards.length === 0 ? (
              "Track credit and debit cards separately from savings"
            ) : (
              <>
                Total owed {formatCurrency(totalOwed, currency)}
                {totalLimit > 0 && (
                  <span className="text-muted-foreground/80">
                    {" "}
                    · {formatCurrency(totalLimit, currency)} combined limit
                  </span>
                )}
              </>
            )}
          </p>
        </div>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="text-primary inline-flex shrink-0 items-center gap-1 text-xs font-medium hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        )}
      </div>

      {cards.length === 0 ? (
        <div className="border-border/60 rounded-lg border border-dashed py-8 text-center">
          <p className="text-muted-foreground text-sm">No cards for {currency} yet</p>
          <p className="text-muted-foreground mt-1 text-xs">
            e.g. ENBD Share Visa, Mashreq debit, Tabby
          </p>
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="bg-primary text-primary-foreground mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              Add your first card
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {cards.map((card) => {
            const owed = Number(card.outstanding_balance);
            const limit = card.credit_limit != null ? Number(card.credit_limit) : null;
            const utilization =
              limit && limit > 0 ? Math.min(100, Math.round((owed / limit) * 100)) : null;

            return (
              <div
                key={card.id}
                className="border-border/50 bg-muted/30 flex flex-col gap-2 rounded-lg border px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-sm font-medium">{card.name}</p>
                    <p className="text-muted-foreground truncate text-[10px]">
                      {card.issuer ? `${card.issuer} · ` : ""}
                      {CARD_KIND_LABELS[card.card_kind]}
                      {card.last_four ? ` · •••• ${card.last_four}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(card.id)}
                        className="text-muted-foreground hover:text-foreground rounded p-1"
                        aria-label={`Edit ${card.name}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <p
                    className={cn(
                      "text-sm tabular-nums",
                      owed > 0 ? "text-rose-400" : "text-muted-foreground"
                    )}
                  >
                    {card.card_kind === "credit"
                      ? owed > 0
                        ? `${formatCurrency(owed, currency)} owed`
                        : "Paid off"
                      : formatCurrency(owed, currency)}
                  </p>
                  {utilization != null && (
                    <div className="mt-1.5">
                      <div className="bg-muted h-1 overflow-hidden rounded-full">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            utilization >= 80 ? "bg-rose-500" : "bg-primary/70"
                          )}
                          style={{ width: `${utilization}%` }}
                        />
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-[10px]">
                        {utilization}% of {formatCurrency(limit!, currency)} limit
                      </p>
                    </div>
                  )}
                  {card.statement_day != null && (
                    <p className="text-muted-foreground mt-1 text-[10px]">
                      Statement day {card.statement_day}
                    </p>
                  )}
                </div>

                {onUpdateBalance && (
                  <button
                    type="button"
                    onClick={() => onUpdateBalance(card.id)}
                    className="text-muted-foreground hover:text-primary self-start text-[10px] hover:underline"
                  >
                    Update balance
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
