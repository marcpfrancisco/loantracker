import { Pencil, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";
import type { WealthAccount } from "@/types/budget";
import { WEALTH_ACCOUNT_KIND_LABELS } from "@/types/budget";

interface WealthAccountsPanelProps {
  accounts: WealthAccount[];
  currency: string;
  onAddAccount?: () => void;
  onEditBalance?: (accountId: string | null) => void;
  onEditAccount?: (accountId: string) => void;
}

export function WealthAccountsPanel({
  accounts,
  currency,
  onAddAccount,
  onEditBalance,
  onEditAccount,
}: WealthAccountsPanelProps) {
  const totalCash = accounts.reduce((s, a) => s + Number(a.cash_balance), 0);
  const totalMarket = accounts.reduce((s, a) => s + Number(a.market_value ?? a.cash_balance), 0);
  const allZero =
    accounts.length > 0 &&
    accounts.every((a) => Number(a.cash_balance) === 0 && a.market_value == null);

  return (
    <div className="border-border/60 bg-card rounded-xl border p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-foreground text-sm font-semibold">Wealth accounts</p>
          <p className="text-muted-foreground text-xs">
            {accounts.length === 0 ? (
              "Add your savings, e-wallets, and investments"
            ) : allZero ? (
              <span className="text-amber-500/90">Balances not set yet</span>
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
        <div className="flex shrink-0 items-center gap-2">
          {onAddAccount && (
            <button
              type="button"
              onClick={onAddAccount}
              className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          )}
          {onEditBalance && accounts.length > 0 && (
            <button
              type="button"
              onClick={() => onEditBalance(null)}
              className="text-muted-foreground hover:text-foreground text-xs hover:underline"
            >
              Set balances
            </button>
          )}
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="border-border/60 rounded-lg border border-dashed py-8 text-center">
          <p className="text-muted-foreground text-sm">No accounts yet for {currency}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            e.g. Mashreq Neo Savings, Cash on hand, GCash, MP2
          </p>
          {onAddAccount && (
            <button
              type="button"
              onClick={onAddAccount}
              className="bg-primary text-primary-foreground mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              Add your first account
            </button>
          )}
        </div>
      ) : (
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
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-sm font-medium">{account.name}</p>
                    <p className="text-muted-foreground truncate text-[10px]">
                      {account.institution ? `${account.institution} · ` : ""}
                      {WEALTH_ACCOUNT_KIND_LABELS[account.account_kind] ?? account.account_kind}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    {onEditAccount && (
                      <button
                        type="button"
                        onClick={() => onEditAccount(account.id)}
                        className="text-muted-foreground hover:text-foreground rounded p-1"
                        aria-label={`Edit ${account.name}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                    {onEditBalance && (
                      <button
                        type="button"
                        onClick={() => onEditBalance(account.id)}
                        className="text-muted-foreground hover:text-primary rounded px-1 py-0.5 text-[10px] hover:underline"
                      >
                        Balance
                      </button>
                    )}
                  </div>
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
      )}
    </div>
  );
}
