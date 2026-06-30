import { Pencil } from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";
import type { WealthAccount } from "@/types/budget";
import { WEALTH_ACCOUNT_KIND_LABELS } from "@/types/budget";

interface WealthAccountsPanelProps {
  accounts: WealthAccount[];
  currency: string;
  onEditBalance?: (accountId: string | null) => void;
}

export function WealthAccountsPanel({
  accounts,
  currency,
  onEditBalance,
}: WealthAccountsPanelProps) {
  if (accounts.length === 0) return null;

  const totalCash = accounts.reduce((s, a) => s + Number(a.cash_balance), 0);
  const totalMarket = accounts.reduce((s, a) => s + Number(a.market_value ?? a.cash_balance), 0);
  const allZero = accounts.every((a) => Number(a.cash_balance) === 0 && a.market_value == null);

  return (
    <div className="border-border/60 bg-card rounded-xl border p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-foreground text-sm font-semibold">Wealth accounts</p>
          <p className="text-muted-foreground text-xs">
            {allZero ? (
              <span className="text-amber-500/90">No balances set yet</span>
            ) : (
              <>
                Cash {formatCurrency(totalCash, currency)}
                {totalMarket !== totalCash && (
                  <span> · Total {formatCurrency(totalMarket, currency)}</span>
                )}
              </>
            )}
          </p>
        </div>
        {onEditBalance && (
          <button
            type="button"
            onClick={() => onEditBalance(null)}
            className="text-primary shrink-0 text-xs font-medium hover:underline"
          >
            Set all
          </button>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {accounts.map((account) => {
          const cash = Number(account.cash_balance);
          const unset = cash === 0 && account.market_value == null;

          return (
            <div
              key={account.id}
              className="border-border/50 bg-muted/30 flex flex-col gap-1 rounded-lg border px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-foreground truncate text-sm font-medium">{account.name}</p>
                  <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                    {WEALTH_ACCOUNT_KIND_LABELS[account.account_kind] ?? account.account_kind}
                  </p>
                </div>
                {onEditBalance && (
                  <button
                    type="button"
                    onClick={() => onEditBalance(account.id)}
                    className="text-muted-foreground hover:text-foreground shrink-0 rounded p-1"
                    aria-label={`Edit ${account.name} balance`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p
                className={
                  unset
                    ? "text-muted-foreground text-sm italic"
                    : "text-foreground text-sm tabular-nums"
                }
              >
                {unset ? "Not set" : formatCurrency(cash, currency)}
              </p>
              {account.market_value != null && Number(account.market_value) !== cash && (
                <p className="text-muted-foreground text-xs">
                  Market {formatCurrency(Number(account.market_value), currency)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
