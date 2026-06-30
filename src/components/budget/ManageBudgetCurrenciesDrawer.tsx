import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterCurrencyOptions, getCurrencyOptions, isValidCurrencyCode } from "@/lib/currencies";
import type { BudgetCurrencyRow } from "@/hooks/useBudgetCurrencies";

const inputClass =
  "border-border/60 bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30";

interface ManageBudgetCurrenciesDrawerProps {
  open: boolean;
  onClose: () => void;
  currencies: BudgetCurrencyRow[];
  activeCurrency: string;
  isAdding: boolean;
  isRemoving: boolean;
  onAdd: (code: string) => Promise<void>;
  onRemove: (currency: string) => Promise<void>;
}

export function ManageBudgetCurrenciesDrawer(props: ManageBudgetCurrenciesDrawerProps) {
  return (
    <AnimatePresence>
      {props.open && <ManageBudgetCurrenciesDrawerContent {...props} />}
    </AnimatePresence>
  );
}

function ManageBudgetCurrenciesDrawerContent({
  onClose,
  currencies,
  activeCurrency,
  isAdding,
  isRemoving,
  onAdd,
  onRemove,
}: ManageBudgetCurrenciesDrawerProps) {
  const [query, setQuery] = useState("");
  const [newCode, setNewCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const suggestions = useMemo(() => {
    const used = new Set(currencies.map((c) => c.currency));
    return filterCurrencyOptions(getCurrencyOptions(), query)
      .filter((o) => !used.has(o.code))
      .slice(0, 8);
  }, [currencies, query]);

  async function handleAdd(code: string) {
    setError(null);
    const normalized = code.trim().toUpperCase();
    if (!isValidCurrencyCode(normalized)) {
      setError("Enter a valid 3-letter currency code (e.g. PHP, AED, USD).");
      return;
    }
    try {
      await onAdd(normalized);
      setNewCode("");
      setQuery("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add currency.");
    }
  }

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
        className="bg-background border-border/60 fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col rounded-t-2xl border shadow-2xl md:inset-x-auto md:right-6 md:bottom-6 md:w-[28rem] md:rounded-2xl"
      >
        <div className="border-border/60 flex shrink-0 items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-foreground font-heading text-base font-semibold">
              Budget currencies
            </h2>
            <p className="text-muted-foreground text-xs">
              Add or remove currencies for your personal budget tabs
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-2">
            {currencies.map((row) => (
              <div
                key={row.id}
                className="border-border/60 bg-muted/20 flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
              >
                <div>
                  <p className="text-foreground text-sm font-medium">{row.currency}</p>
                  {row.currency === activeCurrency && (
                    <p className="text-primary text-[10px]">Currently viewing</p>
                  )}
                </div>
                {confirmRemove === row.currency ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isRemoving}
                      onClick={() =>
                        void onRemove(row.currency)
                          .then(() => setConfirmRemove(null))
                          .catch((e: unknown) =>
                            setError(e instanceof Error ? e.message : "Could not remove currency.")
                          )
                      }
                      className="rounded bg-rose-500/15 px-2 py-1 text-[10px] font-medium text-rose-400"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRemove(null)}
                      className="text-muted-foreground px-1 text-[10px]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={currencies.length <= 1 || isRemoving}
                    onClick={() => {
                      setError(null);
                      setConfirmRemove(row.currency);
                    }}
                    className="text-muted-foreground rounded p-1 hover:text-rose-400 disabled:opacity-40"
                    aria-label={`Remove ${row.currency}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="border-border/60 space-y-2 border-t pt-4">
            <label className="text-foreground text-xs font-medium">Add currency</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCode}
                onChange={(e) => {
                  setNewCode(e.target.value.toUpperCase());
                  setQuery(e.target.value);
                  setError(null);
                }}
                className={inputClass}
                placeholder="USD, SGD, EUR…"
                maxLength={3}
              />
              <button
                type="button"
                disabled={isAdding || !newCode.trim()}
                onClick={() => void handleAdd(newCode)}
                className={cn(
                  "bg-primary text-primary-foreground flex shrink-0 items-center gap-1 rounded-lg px-3 text-sm font-medium disabled:opacity-50"
                )}
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add
              </button>
            </div>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s.code}
                    type="button"
                    onClick={() => void handleAdd(s.code)}
                    className="border-border/60 text-muted-foreground hover:text-foreground rounded-full border px-2 py-0.5 text-[10px]"
                  >
                    {s.code}
                  </button>
                ))}
              </div>
            )}
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <p className="text-muted-foreground text-[10px] leading-relaxed">
              Removing a currency is only allowed when it has no categories, wealth accounts, or
              budget periods. PHP and AED are seeded by default; customize as needed.
            </p>
          </div>
        </div>

        <div className="border-border/60 shrink-0 border-t px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="border-border/60 text-muted-foreground w-full rounded-lg border py-2 text-sm"
          >
            Done
          </button>
        </div>
      </motion.div>
    </>
  );
}
