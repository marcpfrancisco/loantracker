import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CardAccount, CardKind } from "@/types/cards";
import { CARD_KIND_LABELS } from "@/types/cards";

const inputClass =
  "border-border/60 bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30";

export interface CardFormInput {
  name: string;
  issuer?: string;
  card_kind: CardKind;
  last_four?: string;
  credit_limit?: number | null;
  outstanding_balance?: number;
  statement_day?: number | null;
  notes?: string;
}

interface AddCardDrawerProps {
  open: boolean;
  onClose: () => void;
  currency: string;
  isPending: boolean;
  onSubmit: (input: CardFormInput) => Promise<void>;
}

export function AddCardDrawer(props: AddCardDrawerProps) {
  return <AnimatePresence>{props.open && <AddCardDrawerContent {...props} />}</AnimatePresence>;
}

function AddCardDrawerContent({ onClose, currency, isPending, onSubmit }: AddCardDrawerProps) {
  const [name, setName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [cardKind, setCardKind] = useState<CardKind>("credit");
  const [lastFour, setLastFour] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [outstanding, setOutstanding] = useState("");
  const [statementDay, setStatementDay] = useState("");

  const showCreditFields = cardKind === "credit";

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
            <h2 className="text-foreground font-heading text-base font-semibold">Add card</h2>
            <p className="text-muted-foreground text-xs">
              {currency} · liabilities, not wealth accounts
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            void onSubmit({
              name: name.trim(),
              issuer: issuer.trim() || undefined,
              card_kind: cardKind,
              last_four: lastFour.trim() || undefined,
              credit_limit:
                showCreditFields && creditLimit.trim() !== "" ? Number(creditLimit) || 0 : null,
              outstanding_balance: outstanding.trim() === "" ? 0 : Number(outstanding) || 0,
              statement_day:
                showCreditFields && statementDay.trim() !== ""
                  ? Number(statementDay) || null
                  : null,
            }).then(() => onClose());
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="border-primary/20 bg-primary/5 rounded-lg border px-3 py-2">
              <p className="text-muted-foreground text-[10px] leading-relaxed">
                Credit cards track what you <strong className="text-foreground">owe</strong>,
                separate from savings in Budget → Wealth accounts.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-xs font-medium">Card nickname</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="ENBD Share Visa, Mashreq Debit…"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-xs font-medium">Type</label>
              <select
                value={cardKind}
                onChange={(e) => setCardKind(e.target.value as CardKind)}
                className={inputClass}
              >
                {(Object.keys(CARD_KIND_LABELS) as CardKind[]).map((kind) => (
                  <option key={kind} value={kind}>
                    {CARD_KIND_LABELS[kind]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-xs font-medium">
                Bank / issuer (optional)
              </label>
              <input
                type="text"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                className={inputClass}
                placeholder="Emirates NBD, Mashreq, Tabby…"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-xs font-medium">
                Last 4 digits (optional)
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={lastFour}
                onChange={(e) => setLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className={inputClass}
                placeholder="1234"
              />
            </div>

            {showCreditFields && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-foreground text-xs font-medium">
                    Credit limit ({currency}) — optional
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-foreground text-xs font-medium">
                    Statement day (1–28) — optional
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={statementDay}
                    onChange={(e) => setStatementDay(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. 15"
                  />
                </div>
              </>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-xs font-medium">
                Current balance owed ({currency}) — optional
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={outstanding}
                onChange={(e) => setOutstanding(e.target.value)}
                className={inputClass}
                placeholder="0 if paid off"
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
              disabled={isPending || !name.trim()}
              className={cn(
                "bg-primary text-primary-foreground flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium disabled:opacity-50"
              )}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add card
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}

interface EditCardDrawerProps {
  open: boolean;
  onClose: () => void;
  currency: string;
  card: CardAccount;
  isPending: boolean;
  isDeleting: boolean;
  onSave: (input: CardFormInput) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function EditCardDrawer({
  open,
  onClose,
  currency,
  card,
  isPending,
  isDeleting,
  onSave,
  onDelete,
}: EditCardDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <EditCardDrawerContent
          key={card.id}
          onClose={onClose}
          currency={currency}
          card={card}
          isPending={isPending}
          isDeleting={isDeleting}
          onSave={onSave}
          onDelete={onDelete}
        />
      )}
    </AnimatePresence>
  );
}

function EditCardDrawerContent({
  onClose,
  currency,
  card,
  isPending,
  isDeleting,
  onSave,
  onDelete,
}: Omit<EditCardDrawerProps, "open">) {
  const [name, setName] = useState(card.name);
  const [issuer, setIssuer] = useState(card.issuer ?? "");
  const [cardKind, setCardKind] = useState(card.card_kind);
  const [lastFour, setLastFour] = useState(card.last_four ?? "");
  const [creditLimit, setCreditLimit] = useState(
    card.credit_limit != null ? String(card.credit_limit) : ""
  );
  const [outstanding, setOutstanding] = useState(String(card.outstanding_balance));
  const [statementDay, setStatementDay] = useState(
    card.statement_day != null ? String(card.statement_day) : ""
  );

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
        className="bg-background border-border/60 fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-2xl border p-5 shadow-2xl md:inset-x-auto md:right-6 md:bottom-6 md:w-96 md:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-foreground font-heading text-base font-semibold">Edit card</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onSave({
              name: name.trim(),
              issuer: issuer.trim() || undefined,
              card_kind: cardKind,
              last_four: lastFour.trim() || undefined,
              credit_limit:
                cardKind === "credit" && creditLimit.trim() !== ""
                  ? Number(creditLimit) || 0
                  : null,
              outstanding_balance: Number(outstanding) || 0,
              statement_day:
                cardKind === "credit" && statementDay.trim() !== ""
                  ? Number(statementDay) || null
                  : null,
            }).then(() => onClose());
          }}
          className="space-y-3"
        >
          <Field label="Nickname" value={name} onChange={setName} />
          <div>
            <label className="text-foreground mb-1.5 block text-xs font-medium">Type</label>
            <select
              value={cardKind}
              onChange={(e) => setCardKind(e.target.value as CardKind)}
              className={inputClass}
            >
              {(Object.keys(CARD_KIND_LABELS) as CardKind[]).map((kind) => (
                <option key={kind} value={kind}>
                  {CARD_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
          </div>
          <Field label="Issuer" value={issuer} onChange={setIssuer} />
          <Field
            label="Last 4"
            value={lastFour}
            onChange={(v) => setLastFour(v.replace(/\D/g, "").slice(0, 4))}
          />
          {cardKind === "credit" && (
            <>
              <Field
                label={`Credit limit (${currency})`}
                value={creditLimit}
                onChange={setCreditLimit}
                type="number"
              />
              <Field
                label="Statement day"
                value={statementDay}
                onChange={setStatementDay}
                type="number"
              />
            </>
          )}
          <Field
            label={`Balance owed (${currency})`}
            value={outstanding}
            onChange={setOutstanding}
            type="number"
          />
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="bg-primary text-primary-foreground flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </form>

        <button
          type="button"
          disabled={isDeleting}
          onClick={() => void onDelete().then(() => onClose())}
          className="mt-4 flex w-full items-center justify-center gap-2 py-2 text-sm text-rose-400 hover:text-rose-300 disabled:opacity-50"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Remove card
        </button>
      </motion.div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-foreground mb-1.5 block text-xs font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}

interface UpdateCardBalanceDrawerProps {
  open: boolean;
  onClose: () => void;
  cardName: string;
  currency: string;
  currentBalance: number;
  isPending: boolean;
  onSubmit: (balance: number) => Promise<void>;
}

export function UpdateCardBalanceDrawer(props: UpdateCardBalanceDrawerProps) {
  return (
    <AnimatePresence>{props.open && <UpdateCardBalanceDrawerContent {...props} />}</AnimatePresence>
  );
}

function UpdateCardBalanceDrawerContent({
  onClose,
  cardName,
  currency,
  currentBalance,
  isPending,
  onSubmit,
}: UpdateCardBalanceDrawerProps) {
  const [balance, setBalance] = useState(currentBalance > 0 ? String(currentBalance) : "");

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
        className="bg-background border-border/60 fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border p-5 shadow-2xl md:inset-x-auto md:right-6 md:bottom-6 md:w-96 md:rounded-2xl"
      >
        <h2 className="text-foreground font-heading mb-1 text-base font-semibold">
          Update balance
        </h2>
        <p className="text-muted-foreground mb-4 text-sm">{cardName}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit(Number(balance) || 0).then(() => onClose());
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-foreground mb-1.5 block text-xs font-medium">
              Amount owed ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className={inputClass}
              placeholder="0 if paid off"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="bg-primary text-primary-foreground flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save balance
          </button>
        </form>
      </motion.div>
    </>
  );
}
