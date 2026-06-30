import { formatCurrency } from "@/lib/formatCurrency";
import type { WealthAccount } from "@/types/budget";

interface WealthAccountsPanelProps {
  accounts: WealthAccount[];
  currency: string;
}

const KIND_LABELS: Record<string, string> = {
  savings: "Savings",
  emergency: "Emergency",
  mp2: "MP2",
  uitf: "UITF",
  reit: "REIT",
  bond: "Bonds",
  stocks: "Stocks",
  other: "Other",
};

export function WealthAccountsPanel({ accounts, currency }: WealthAccountsPanelProps) {
  if (accounts.length === 0) return null;

  const totalCash = accounts.reduce((s, a) => s + Number(a.cash_balance), 0);
  const totalMarket = accounts.reduce((s, a) => s + Number(a.market_value ?? a.cash_balance), 0);

  return (
    <div className="border-border/60 bg-card rounded-xl border p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-foreground text-sm font-semibold">Wealth accounts</p>
          <p className="text-muted-foreground text-xs">
            Cash {formatCurrency(totalCash, currency)}
            {totalMarket !== totalCash && (
              <span> · Total {formatCurrency(totalMarket, currency)}</span>
            )}
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="border-border/50 bg-muted/30 flex flex-col gap-0.5 rounded-lg border px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-foreground truncate text-sm font-medium">{account.name}</p>
              <span className="text-muted-foreground shrink-0 text-[10px] tracking-wide uppercase">
                {KIND_LABELS[account.account_kind] ?? account.account_kind}
              </span>
            </div>
            <p className="text-foreground text-sm tabular-nums">
              {formatCurrency(Number(account.cash_balance), currency)}
            </p>
            {account.market_value != null &&
              Number(account.market_value) !== Number(account.cash_balance) && (
                <p className="text-muted-foreground text-xs">
                  Market {formatCurrency(Number(account.market_value), currency)}
                </p>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}
