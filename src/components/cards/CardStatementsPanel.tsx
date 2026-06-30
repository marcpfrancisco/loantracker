import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Plus, X } from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";
import { formatStatementPeriod, cardStatementStatusLabel } from "@/lib/cardRules";
import type { CardStatement, CardStatementFormInput } from "@/types/cards";

const inputClass =
  "border-border/60 bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30";

interface CardStatementsPanelProps {
  statements: CardStatement[];
  currency: string;
  isPending: boolean;
  isPaying: boolean;
  onCreate: (input: CardStatementFormInput) => Promise<void>;
  onMarkPaid: (statementId: string, amount: number) => Promise<void>;
  onDelete: (statementId: string) => Promise<void>;
}

export function CardStatementsPanel({
  statements,
  currency,
  isPending,
  isPaying,
  onCreate,
  onMarkPaid,
  onDelete,
}: CardStatementsPanelProps) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="border-border/60 bg-card rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-foreground text-sm font-semibold">Statements</p>
          <p className="text-muted-foreground text-xs">Billing cycles and payment due dates</p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {statements.length === 0 ? (
        <p className="text-muted-foreground text-sm">No statements recorded yet.</p>
      ) : (
        <ul className="space-y-2">
          {statements.map((stmt) => (
            <li
              key={stmt.id}
              className="border-border/50 bg-muted/30 flex flex-col gap-2 rounded-lg border px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-foreground text-sm font-medium">
                    {formatStatementPeriod(stmt.period_start, stmt.period_end)}
                  </p>
                  <p className="text-muted-foreground text-[10px]">
                    {cardStatementStatusLabel(stmt.status)}
                    {stmt.payment_due_date
                      ? ` · due ${new Date(stmt.payment_due_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                      : ""}
                  </p>
                </div>
                <p className="text-foreground shrink-0 text-sm tabular-nums">
                  {formatCurrency(Number(stmt.statement_balance), currency)}
                </p>
              </div>
              {stmt.min_payment != null && stmt.min_payment > 0 && (
                <p className="text-muted-foreground text-[10px]">
                  Min payment {formatCurrency(Number(stmt.min_payment), currency)}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {stmt.status !== "paid" && (
                  <button
                    type="button"
                    disabled={isPaying}
                    onClick={() =>
                      void onMarkPaid(stmt.id, Number(stmt.statement_balance)).catch(() => {})
                    }
                    className="bg-primary/10 text-primary rounded-md px-2 py-1 text-[10px] font-medium disabled:opacity-50"
                  >
                    Mark paid
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void onDelete(stmt.id).catch(() => {})}
                  className="text-muted-foreground text-[10px] hover:text-rose-400 hover:underline"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddStatementDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        currency={currency}
        isPending={isPending}
        onSubmit={onCreate}
      />
    </div>
  );
}

interface AddStatementDrawerProps {
  open: boolean;
  onClose: () => void;
  currency: string;
  isPending: boolean;
  onSubmit: (input: CardStatementFormInput) => Promise<void>;
}

function AddStatementDrawer({
  open,
  onClose,
  currency,
  isPending,
  onSubmit,
}: AddStatementDrawerProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [periodStart, setPeriodStart] = useState(today);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [balance, setBalance] = useState("");
  const [minPayment, setMinPayment] = useState("");
  const [dueDate, setDueDate] = useState("");

  return (
    <AnimatePresence>
      {open && (
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
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-foreground font-heading text-base font-semibold">
                Add statement
              </h2>
              <button type="button" onClick={onClose} className="text-muted-foreground p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void onSubmit({
                  period_start: periodStart,
                  period_end: periodEnd,
                  statement_balance: Number(balance) || 0,
                  min_payment: minPayment.trim() ? Number(minPayment) || 0 : null,
                  payment_due_date: dueDate.trim() || null,
                }).then(() => onClose());
              }}
              className="space-y-3"
            >
              <Field
                label="Period start"
                type="date"
                value={periodStart}
                onChange={setPeriodStart}
              />
              <Field label="Period end" type="date" value={periodEnd} onChange={setPeriodEnd} />
              <Field
                label={`Statement balance (${currency})`}
                type="number"
                value={balance}
                onChange={setBalance}
              />
              <Field
                label={`Min payment (${currency}) — optional`}
                type="number"
                value={minPayment}
                onChange={setMinPayment}
              />
              <Field
                label="Payment due date — optional"
                type="date"
                value={dueDate}
                onChange={setDueDate}
              />
              <button
                type="submit"
                disabled={isPending || !balance}
                className="bg-primary text-primary-foreground flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium disabled:opacity-50"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save statement
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
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
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
      />
    </div>
  );
}
