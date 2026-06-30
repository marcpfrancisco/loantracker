import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatCurrency";
import type { OpeningBalanceInput } from "@/hooks/useWealthMutations";
import type { WealthAccount, WealthAccountKind } from "@/types/budget";
import { WEALTH_ACCOUNT_KIND_LABELS } from "@/types/budget";

const inputClass =
  "border-border/60 bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30";

function isInvestmentKind(kind: WealthAccountKind): boolean {
  return ["mp2", "uitf", "reit", "bond", "stocks"].includes(kind);
}

interface AccountBalanceRow {
  accountId: string;
  cashBalance: string;
  marketValue: string;
}

function buildBalanceRows(accounts: WealthAccount[]): AccountBalanceRow[] {
  return accounts.map((a) => ({
    accountId: a.id,
    cashBalance: Number(a.cash_balance) > 0 ? String(Number(a.cash_balance)) : "",
    marketValue:
      a.market_value != null && Number(a.market_value) > 0 ? String(Number(a.market_value)) : "",
  }));
}

interface WealthOpeningBalanceDrawerProps {
  open: boolean;
  onClose: () => void;
  accounts: WealthAccount[];
  currency: string;
  isPending: boolean;
  /** When set, only show this account (single-account edit). */
  focusAccountId?: string | null;
  onSubmit: (inputs: OpeningBalanceInput[]) => Promise<void>;
}

export function WealthOpeningBalanceDrawer(props: WealthOpeningBalanceDrawerProps) {
  const visibleAccounts = useMemo(
    () =>
      props.focusAccountId
        ? props.accounts.filter((a) => a.id === props.focusAccountId)
        : props.accounts,
    [props.accounts, props.focusAccountId]
  );

  return (
    <AnimatePresence>
      {props.open && (
        <WealthOpeningBalanceDrawerContent
          key={props.focusAccountId ?? "all"}
          {...props}
          visibleAccounts={visibleAccounts}
        />
      )}
    </AnimatePresence>
  );
}

function WealthOpeningBalanceDrawerContent({
  onClose,
  visibleAccounts,
  currency,
  isPending,
  focusAccountId,
  onSubmit,
}: WealthOpeningBalanceDrawerProps & { visibleAccounts: WealthAccount[] }) {
  const [rows, setRows] = useState(() => buildBalanceRows(visibleAccounts));

  const isOnboarding = !focusAccountId;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="bg-background border-border/60 fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col rounded-t-2xl border shadow-2xl md:inset-x-auto md:top-0 md:right-0 md:bottom-0 md:max-h-none md:w-full md:max-w-lg md:rounded-none md:rounded-l-2xl md:border-l"
      >
        <div className="border-border/60 flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4">
          <div>
            <h2 className="text-foreground font-heading text-base font-semibold">
              {isOnboarding ? "Set starting balances" : "Update balance"}
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {isOnboarding
                ? `One-time snapshot for ${currency} — not counted as monthly income.`
                : `Adjust ${currency} account balance`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground shrink-0 rounded-lg p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const inputs: OpeningBalanceInput[] = rows
              .map((row) => ({
                accountId: row.accountId,
                cashBalance: Number(row.cashBalance) || 0,
                marketValue: row.marketValue.trim() === "" ? null : Number(row.marketValue) || 0,
                notes: isOnboarding ? "Opening balance" : "Balance adjustment",
              }))
              .filter((i) => i.cashBalance > 0 || (i.marketValue ?? 0) > 0);

            void onSubmit(inputs).then(() => onClose());
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {isOnboarding && (
              <div className="border-primary/20 bg-primary/5 flex gap-3 rounded-lg border p-3">
                <Sparkles className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Enter what you have <strong className="text-foreground">today</strong> in each
                  account. Skip any you don&apos;t use — you can update later. This is separate from
                  logging salary or monthly spending.
                </p>
              </div>
            )}

            {visibleAccounts.map((account) => {
              const row = rows.find((r) => r.accountId === account.id);
              if (!row) return null;
              const showMarket = isInvestmentKind(account.account_kind);

              return (
                <div key={account.id} className="border-border/60 space-y-3 rounded-xl border p-3">
                  <div>
                    <p className="text-foreground text-sm font-medium">{account.name}</p>
                    <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                      {WEALTH_ACCOUNT_KIND_LABELS[account.account_kind]}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-foreground text-xs font-medium">
                      {showMarket ? "Cash / contributions" : "Current balance"} ({currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.cashBalance}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((r) =>
                            r.accountId === account.id ? { ...r, cashBalance: e.target.value } : r
                          )
                        )
                      }
                      className={inputClass}
                      placeholder="0"
                    />
                  </div>

                  {showMarket && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-foreground text-xs font-medium">
                        Market value ({currency}) — optional
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.marketValue}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) =>
                              r.accountId === account.id ? { ...r, marketValue: e.target.value } : r
                            )
                          )
                        }
                        className={inputClass}
                        placeholder="From your broker app"
                      />
                    </div>
                  )}

                  {Number(account.cash_balance) > 0 && isOnboarding && (
                    <p className="text-muted-foreground text-[10px]">
                      Current: {formatCurrency(Number(account.cash_balance), currency)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-border/60 flex shrink-0 gap-3 border-t px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="border-border/60 text-muted-foreground hover:text-foreground flex-1 rounded-lg border py-2 text-sm"
            >
              {isOnboarding ? "Skip for now" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={cn(
                "bg-primary text-primary-foreground flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium disabled:opacity-50"
              )}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save balances
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}

interface WealthOnboardingBannerProps {
  currency: string;
  accountCount: number;
  onSetBalances: () => void;
  onDismiss: () => void;
}

export function WealthOnboardingBanner({
  currency,
  accountCount,
  onSetBalances,
  onDismiss,
}: WealthOnboardingBannerProps) {
  return (
    <div className="border-primary/25 from-primary/10 to-primary/5 relative overflow-hidden rounded-xl border bg-gradient-to-br p-4">
      <button
        type="button"
        onClick={onDismiss}
        className="text-muted-foreground hover:text-foreground absolute top-3 right-3 rounded p-1"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex gap-3 pr-8">
        <Sparkles className="text-primary mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-foreground text-sm font-semibold">Set your starting balances</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            You have {accountCount} {currency} account{accountCount === 1 ? "" : "s"} at{" "}
            {formatCurrency(0, currency)}. Add what you already have in savings and investments —
            this won&apos;t count as income this month.
          </p>
          <button
            type="button"
            onClick={onSetBalances}
            className="bg-primary text-primary-foreground mt-3 rounded-lg px-4 py-2 text-xs font-medium"
          >
            Set balances now
          </button>
        </div>
      </div>
    </div>
  );
}
