import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CardTransactionFormInput, CardTxnType } from "@/types/cards";
import { CARD_TXN_TYPE_LABELS, CARD_TXN_TYPE_OPTIONS } from "@/types/cards";

const inputClass =
  "border-border/60 bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30";

interface AddCardTransactionDrawerProps {
  open: boolean;
  onClose: () => void;
  currency: string;
  isPending: boolean;
  onSubmit: (input: CardTransactionFormInput) => Promise<void>;
}

export function AddCardTransactionDrawer({
  open,
  onClose,
  currency,
  isPending,
  onSubmit,
}: AddCardTransactionDrawerProps) {
  return (
    <AnimatePresence>
      {open && <AddCardTransactionDrawerContent {...{ onClose, currency, isPending, onSubmit }} />}
    </AnimatePresence>
  );
}

function AddCardTransactionDrawerContent({
  onClose,
  currency,
  isPending,
  onSubmit,
}: Omit<AddCardTransactionDrawerProps, "open">) {
  const [txnType, setTxnType] = useState<CardTxnType>("charge");
  const [amount, setAmount] = useState("");
  const [txnDate, setTxnDate] = useState(new Date().toISOString().slice(0, 10));
  const [merchant, setMerchant] = useState("");
  const [description, setDescription] = useState("");

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
        className="bg-background border-border/60 fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col rounded-t-2xl border shadow-2xl md:inset-x-auto md:top-0 md:right-0 md:bottom-0 md:max-h-none md:w-full md:max-w-md md:rounded-none md:rounded-l-2xl md:border-l"
      >
        <div className="border-border/60 flex shrink-0 items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-foreground font-heading text-base font-semibold">
              Add transaction
            </h2>
            <p className="text-muted-foreground text-xs">{currency} · updates card balance</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!amount || Number(amount) <= 0) return;
            void onSubmit({
              txn_type: txnType,
              amount: Number(amount),
              txn_date: txnDate,
              merchant: merchant.trim() || undefined,
              description: description.trim() || undefined,
            }).then(() => onClose());
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-xs font-medium">Type</label>
              <select
                value={txnType}
                onChange={(e) => setTxnType(e.target.value as CardTxnType)}
                className={inputClass}
              >
                {CARD_TXN_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {CARD_TXN_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-xs font-medium">Amount ({currency})</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass}
                placeholder="0.00"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-xs font-medium">Date</label>
              <input
                type="date"
                value={txnDate}
                onChange={(e) => setTxnDate(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-xs font-medium">Merchant (optional)</label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className={inputClass}
                placeholder="Netflix, Carrefour…"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-xs font-medium">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
                placeholder="Monthly subscription"
              />
            </div>
          </div>

          <div className="border-border/60 flex shrink-0 gap-3 border-t px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="border-border/60 text-muted-foreground flex-1 rounded-lg border py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !amount}
              className={cn(
                "bg-primary text-primary-foreground flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium disabled:opacity-50"
              )}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}

export { UpdateCardBalanceDrawer } from "@/components/cards/CardDrawers";
