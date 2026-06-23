import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  Unlock,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  X,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Download,
  TableProperties,
  Pencil,
  Check,
  Archive,
  CheckSquare,
  SkipForward,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getPeriodVisualStatus,
  groupPeriodsByYear,
  MONTH_INITIALS,
  PERIOD_STATUS_EMPTY_SEGMENT,
  PERIOD_STATUS_LEGEND,
  PERIOD_STATUS_SEGMENT,
  PERIOD_STATUS_STYLES,
} from "@/lib/expensePeriodStyles";
import { getPeriodClosedMessage } from "@/lib/expensePeriodRules";
import { useAuth } from "@/hooks/useAuth";
import { useExpenseTab } from "@/hooks/useExpenseTab";
import type { ExpensePeriod, ExpenseItem, ExpensePayment } from "@/hooks/useExpenseTab";
import {
  useAddExpenseItem,
  useDeleteExpenseItem,
  useTogglePeriodLock,
  useRecordPayment,
  useDeletePayment,
  useDeleteExpensePeriod,
  useDeleteExpenseYear,
  useUpdateExpenseItem,
  useArchivePeriod,
  useArchiveYear,
  useBulkTogglePeriodLock,
  type BulkLockTarget,
} from "@/hooks/useExpenseTabMutations";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { exportExpenseTabCSV, printExpenseTabPDF } from "@/lib/statementExport";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function fmtCompact(amount: number, currency: string) {
  if (amount >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  }
  return fmt(amount, currency);
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPeriodLabel(period: string) {
  return new Date(period + "T12:00:00").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatPeriodShort(period: string) {
  return new Date(period + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

function formatMonthOnly(period: string) {
  return new Date(period + "T12:00:00").toLocaleDateString("en-US", { month: "short" });
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const PAID_STATUS_STYLES = PERIOD_STATUS_STYLES;

function PeriodStatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      {PERIOD_STATUS_LEGEND.map(({ status, label }) => (
        <span
          key={status}
          className={cn(
            "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
            PERIOD_STATUS_STYLES[status]
          )}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

// ── Month pills ───────────────────────────────────────────────────────────────

function MonthPill({
  period,
  is_locked,
  is_archived,
  paid_status,
  isVirtual,
  isSelected,
  onClick,
  bulkMode,
  isChecked,
  onBulkToggle,
  monthLabelOnly = false,
  outstanding = 0,
  currency,
}: {
  period: string;
  is_locked: boolean;
  is_archived: boolean;
  paid_status: "unpaid" | "partial" | "paid";
  isVirtual?: boolean;
  isSelected: boolean;
  onClick: () => void;
  bulkMode?: boolean;
  isChecked?: boolean;
  onBulkToggle?: () => void;
  monthLabelOnly?: boolean;
  outstanding?: number;
  currency?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const status = getPeriodVisualStatus({ is_locked, is_archived, paid_status, isVirtual });
  const label = monthLabelOnly ? formatMonthOnly(period) : formatPeriodShort(period);
  const hasBalance = outstanding > 0 && currency;
  const tooltip = [
    monthLabelOnly ? formatPeriodLabel(period) : undefined,
    hasBalance ? `${fmt(outstanding, currency)} outstanding` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  useEffect(() => {
    if (isSelected && !bulkMode) {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isSelected, bulkMode]);

  const Icon =
    status === "archived"
      ? Archive
      : status === "paid"
        ? CheckCircle2
        : status === "locked"
          ? Lock
          : status === "draft"
            ? CalendarPlus
            : Unlock;

  const statusStyle = PAID_STATUS_STYLES[status];

  if (bulkMode) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onBulkToggle}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-all",
          isChecked
            ? cn(statusStyle, "ring-primary/50 shadow-sm ring-2")
            : cn(statusStyle, "hover:opacity-80")
        )}
      >
        {/* Checkbox */}
        <div
          className={cn(
            "flex h-3 w-3 shrink-0 items-center justify-center rounded border transition-colors",
            isChecked ? "bg-primary border-primary" : "border-current opacity-60"
          )}
        >
          {isChecked && (
            <svg viewBox="0 0 10 8" className="h-2 w-2 text-white" fill="currentColor">
              <path
                d="M1 4l2.5 2.5L9 1"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
        {label}
      </button>
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      title={tooltip || undefined}
      className={cn(
        "inline-flex flex-col items-center rounded-full border px-2.5 py-1.5 text-xs font-medium transition-all",
        statusStyle,
        isSelected ? "ring-primary/50 shadow-sm ring-2" : "hover:opacity-80"
      )}
    >
      <span className="inline-flex items-center gap-1">
        <Icon className="h-3 w-3 shrink-0" />
        {label}
        {hasBalance && !monthLabelOnly && (
          <span className="bg-foreground/10 h-1.5 w-1.5 shrink-0 rounded-full" />
        )}
      </span>
      {hasBalance && monthLabelOnly && (
        <span className="mt-0.5 text-[9px] font-semibold tabular-nums opacity-90">
          {fmtCompact(outstanding, currency)}
        </span>
      )}
    </button>
  );
}

// ── Year progress bar ─────────────────────────────────────────────────────────

function YearProgressBar({
  year,
  periods,
  selectedPeriod,
  currency,
  onSelect,
}: {
  year: string;
  periods: ExpensePeriod[];
  selectedPeriod: string | null;
  currency: string;
  onSelect: (period: string) => void;
}) {
  const periodByMonth = new Map<number, ExpensePeriod>();
  for (const p of periods) {
    const monthIdx = Number.parseInt(p.period.slice(5, 7), 10) - 1;
    periodByMonth.set(monthIdx, p);
  }

  return (
    <div className="grid grid-cols-12 gap-0.5">
      {MONTH_INITIALS.map((initial, idx) => {
        const period = periodByMonth.get(idx);
        if (!period) {
          return (
            <div key={initial + idx} className="flex flex-col items-center gap-0.5">
              <div
                className={cn("h-2 w-full rounded-sm", PERIOD_STATUS_EMPTY_SEGMENT)}
                title={`No data for ${MONTH_LABELS[idx]} ${year}`}
              />
              <span className="text-muted-foreground/35 text-[8px] leading-none">{initial}</span>
            </div>
          );
        }

        const status = getPeriodVisualStatus({
          is_locked: period.is_locked,
          is_archived: period.is_archived,
          paid_status: period.paid_status,
          isVirtual: period.id === "__virtual__",
        });
        const isSelected = period.period === selectedPeriod;
        const balanceNote =
          period.outstanding > 0 ? ` · ${fmt(period.outstanding, currency)} outstanding` : "";

        return (
          <button
            key={period.period}
            type="button"
            onClick={() => onSelect(period.period)}
            title={`${formatPeriodLabel(period.period)}${balanceNote}`}
            className="flex flex-col items-center gap-0.5"
          >
            <div
              className={cn(
                "h-2 w-full rounded-sm transition-all",
                PERIOD_STATUS_SEGMENT[status],
                isSelected && "ring-primary/70 ring-offset-background ring-1 ring-offset-1"
              )}
            />
            <span
              className={cn(
                "text-[8px] leading-none",
                isSelected ? "text-foreground font-bold" : "text-muted-foreground/60"
              )}
            >
              {initial}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Item row ──────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  currency,
  isAdmin,
  isLocked,
  onDelete,
  onEdit,
}: {
  item: ExpenseItem;
  currency: string;
  isAdmin: boolean;
  isLocked: boolean;
  onDelete: (id: string) => void;
  onEdit: (id: string, description: string, amount: number, is_already_split: boolean) => void;
}) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editDesc, setEditDesc] = useState(item.description);
  const [editAmount, setEditAmount] = useState(String(item.amount));
  const [editSplit, setEditSplit] = useState(item.is_already_split);

  const effectiveMode = isLocked ? "view" : mode;
  const effectiveShowDeleteDialog = isLocked ? false : showDeleteDialog;

  function handleSave() {
    if (isLocked) return;

    const amt = Number(editAmount);
    if (!editDesc.trim() || !amt || amt <= 0) return;

    onEdit(item.id, editDesc, amt, editSplit);
    setMode("view");
  }

  function handleCancelEdit() {
    setEditDesc(item.description);
    setEditAmount(String(item.amount));
    setEditSplit(item.is_already_split);
    setMode("view");
  }

  function handleStartEdit() {
    if (isLocked) return;

    setEditDesc(item.description);
    setEditAmount(String(item.amount));
    setEditSplit(item.is_already_split);

    setMode("edit");
  }

  function handleOpenDelete() {
    if (isLocked) return;
    setShowDeleteDialog(true);
  }

  if (effectiveMode === "edit") {
    return (
      <div className="space-y-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancelEdit();
            }}
            className="border-border/60 bg-muted/50 focus:border-primary/60 min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-sm outline-none"
          />

          <input
            type="number"
            step="0.01"
            min="0.01"
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancelEdit();
            }}
            className="border-border/60 bg-muted/50 focus:border-primary/60 w-24 shrink-0 rounded-lg border px-3 py-1.5 text-sm outline-none"
          />

          <button
            type="button"
            onClick={() => setEditSplit((v) => !v)}
            className={cn(
              "shrink-0 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors",
              editSplit
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:text-foreground"
            )}
          >
            {editSplit ? "his" : "÷2"}
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="shrink-0 text-emerald-400 transition-colors hover:text-emerald-300"
          >
            <Check className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleCancelEdit}
            className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm">{item.description}</p>
        <p className="text-muted-foreground text-[10px]">
          {item.is_already_split ? "his share" : `${fmt(item.amount, currency)} ÷ 2`}
        </p>
      </div>

      <span className="text-foreground shrink-0 text-sm font-semibold tabular-nums">
        {fmt(item.borrower_owes, currency)}
      </span>

      {isAdmin && !isLocked && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleStartEdit}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={handleOpenDelete}
            className="text-muted-foreground transition-colors hover:text-rose-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <ConfirmDialog
        open={effectiveShowDeleteDialog}
        title="Delete this item?"
        description={`"${item.description}" (${fmt(
          item.borrower_owes,
          currency
        )}) will be permanently removed.`}
        confirmLabel="Delete item"
        onConfirm={() => {
          onDelete(item.id);
          setShowDeleteDialog(false);
        }}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}

// ── Payment row ───────────────────────────────────────────────────────────────

function PaymentRow({
  payment,
  currency,
  isAdmin,
  isLocked,
  onDelete,
}: {
  payment: ExpensePayment;
  currency: string;
  isAdmin: boolean;
  isLocked: boolean;
  onDelete: (id: string) => void;
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-emerald-400">Payment received</p>
        <p className="text-muted-foreground text-[10px]">
          {fmtDate(payment.payment_date)}
          {payment.notes ? ` · ${payment.notes}` : ""}
        </p>
      </div>
      <span className="shrink-0 text-sm font-semibold text-emerald-400 tabular-nums">
        -{fmt(payment.amount, currency)}
      </span>
      {isAdmin && !isLocked && (
        <button
          type="button"
          onClick={() => setShowDeleteDialog(true)}
          className="text-muted-foreground shrink-0 transition-colors hover:text-rose-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete this payment?"
        description={`${fmt(payment.amount, currency)} recorded on ${fmtDate(payment.payment_date)} will be permanently removed.`}
        confirmLabel="Delete payment"
        onConfirm={() => {
          onDelete(payment.id);
          setShowDeleteDialog(false);
        }}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}

// ── Record Payment Modal ──────────────────────────────────────────────────────

function RecordPaymentModal({
  period,
  currency,
  outstanding,
  onClose,
  onSubmit,
  isPending,
}: {
  period: ExpensePeriod;
  currency: string;
  outstanding: number;
  onClose: () => void;
  onSubmit: (amount: number, notes: string, date: string) => void;
  isPending: boolean;
}) {
  const [amount, setAmount] = useState(outstanding.toFixed(2));
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [showConfirm, setShowConfirm] = useState(false);

  const parsedAmount = Number(amount);
  const canSubmit = parsedAmount > 0 && parsedAmount <= outstanding;

  function handleReview() {
    if (!canSubmit) return;
    setShowConfirm(true);
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="bg-card border-border/60 relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border shadow-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          <div className="border-border/60 border-b px-5 py-4">
            <p className="text-foreground text-sm font-semibold">Record Payment</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {formatPeriodLabel(period.period)} · Outstanding {fmt(outstanding, currency)}
            </p>
          </div>
          <div className="space-y-4 p-5">
            {/* Pay in full shortcut */}
            <button
              type="button"
              onClick={() => setAmount(outstanding.toFixed(2))}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition-colors",
                amount === outstanding.toFixed(2)
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="font-medium">Pay in full</span>
              <span className="font-bold tabular-nums">{fmt(outstanding, currency)}</span>
            </button>

            <div className="space-y-1.5">
              <label className="text-foreground text-xs font-medium">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={outstanding}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="border-border/60 bg-background focus:border-primary/60 w-full rounded-lg border px-3 py-2 text-sm outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-foreground text-xs font-medium">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border-border/60 bg-background focus:border-primary/60 w-full rounded-lg border px-3 py-2 text-sm outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-foreground text-xs font-medium">Notes (optional)</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Cash, bank transfer…"
                className="border-border/60 bg-background focus:border-primary/60 w-full rounded-lg border px-3 py-2 text-sm outline-none"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="border-border/60 text-muted-foreground flex-1 rounded-lg border py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || !canSubmit}
                onClick={handleReview}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
              >
                Review payment
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="Record this payment?"
        description={`${fmt(parsedAmount, currency)} for ${formatPeriodLabel(period.period)}${
          notes.trim() ? ` · ${notes.trim()}` : ""
        }`}
        confirmLabel="Record payment"
        variant="warning"
        isPending={isPending}
        onConfirm={() => {
          onSubmit(parsedAmount, notes, date);
          setShowConfirm(false);
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}

// ── Month picker popover ──────────────────────────────────────────────────────

function MonthPickerPopover({
  existingPeriods,
  onSelect,
  defaultYear,
}: {
  existingPeriods: string[]; // "YYYY-MM-DD"
  onSelect: (period: string) => void;
  defaultYear?: number;
}) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [viewYear, setViewYear] = useState(defaultYear ?? now.getFullYear());
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth(); // 0-indexed

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && defaultYear !== undefined) {
      setViewYear(defaultYear);
    }
  }

  function isFuture(monthIdx: number) {
    return viewYear > currentYear || (viewYear === currentYear && monthIdx > currentMonthIdx);
  }

  function isExisting(monthIdx: number) {
    const period = `${viewYear}-${String(monthIdx + 1).padStart(2, "0")}-01`;
    return existingPeriods.includes(period);
  }

  function handleSelect(monthIdx: number) {
    const period = `${viewYear}-${String(monthIdx + 1).padStart(2, "0")}-01`;
    onSelect(period);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className="border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs transition-colors"
        aria-label="Add a month"
      >
        <CalendarPlus className="h-3 w-3" />
      </PopoverTrigger>

      <PopoverContent side="bottom" align="end" className="w-64 p-3">
        {/* Year navigation */}
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setViewYear((y) => y - 1)}
            className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-foreground text-sm font-semibold">{viewYear}</span>
          <button
            type="button"
            onClick={() => setViewYear((y) => y + 1)}
            disabled={viewYear >= currentYear}
            className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-3 gap-1.5">
          {MONTH_LABELS.map((label, idx) => {
            const future = isFuture(idx);
            const exists = isExisting(idx);
            return (
              <button
                key={label}
                type="button"
                disabled={future || exists}
                onClick={() => handleSelect(idx)}
                className={cn(
                  "rounded-lg py-2 text-xs font-medium transition-colors",
                  future || exists
                    ? "text-muted-foreground/40 cursor-not-allowed"
                    : "text-foreground hover:bg-primary/10 hover:text-primary"
                )}
              >
                {label}
                {exists && <span className="text-primary ml-0.5 text-[8px]">•</span>}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Quick-add bar ─────────────────────────────────────────────────────────────

function QuickAddBar({
  onAdd,
  isPending,
  closedMessage,
}: {
  onAdd: (desc: string, amount: number, isSplit: boolean) => Promise<void>;
  isPending: boolean;
  closedMessage: string | null;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [isAlreadySplit, setIsAlreadySplit] = useState(false);
  const descRef = useRef<HTMLInputElement>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || !amount || Number(amount) <= 0) return;
    await onAdd(description, Number(amount), isAlreadySplit);
    setDescription("");
    setAmount("");
    descRef.current?.focus();
  }

  if (closedMessage) {
    return (
      <div className="border-border/60 bg-background/95 border-t px-4 py-3">
        <p className="text-muted-foreground text-center text-xs">{closedMessage}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleAdd(e)}
      className="border-border/60 bg-background/95 flex items-center gap-2 border-t px-4 py-3 backdrop-blur-sm"
    >
      <input
        ref={descRef}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Item name…"
        className="border-border/60 bg-muted/50 focus:border-primary/60 min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm transition-colors outline-none"
        disabled={isPending}
      />
      <input
        type="number"
        step="0.01"
        min="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.00"
        className="border-border/60 bg-muted/50 focus:border-primary/60 w-24 shrink-0 rounded-lg border px-3 py-2 text-sm transition-colors outline-none"
        disabled={isPending}
      />
      {/* Split toggle */}
      <button
        type="button"
        onClick={() => setIsAlreadySplit((v) => !v)}
        className={cn(
          "shrink-0 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors",
          isAlreadySplit
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border/60 text-muted-foreground hover:text-foreground"
        )}
        title={isAlreadySplit ? "Already his share" : "Split 50/50"}
      >
        {isAlreadySplit ? "his" : "÷2"}
      </button>
      <button
        type="submit"
        disabled={isPending || !description.trim() || !amount}
        className="bg-primary text-primary-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      </button>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ExpenseTabDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const { data: tab, isLoading, error } = useExpenseTab(id);

  const addItem = useAddExpenseItem(id!);
  const deleteItem = useDeleteExpenseItem(id!);
  const updateItem = useUpdateExpenseItem(id!);
  const toggleLock = useTogglePeriodLock(id!);
  const recordPayment = useRecordPayment(id!);
  const deletePayment = useDeletePayment(id!);
  const deletePeriod = useDeleteExpensePeriod(id!);
  const deleteYear = useDeleteExpenseYear(id!);
  const archivePeriod = useArchivePeriod(id!);
  const archiveYear = useArchiveYear(id!);
  const bulkToggleLock = useBulkTogglePeriodLock(id!);

  const [showDeletePeriod, setShowDeletePeriod] = useState(false);
  const [showArchivePeriod, setShowArchivePeriod] = useState(false);
  const [showArchiveYear, setShowArchiveYear] = useState<string | null>(null);
  const [showDeleteYear, setShowDeleteYear] = useState<string | null>(null);
  const [showLockConfirm, setShowLockConfirm] = useState<{
    periodId: string;
    lockTo: boolean;
    label: string;
  } | null>(null);
  const [showBulkLockConfirm, setShowBulkLockConfirm] = useState<{
    year: string;
    lockTo: boolean;
    count: number;
  } | null>(null);
  const [bulkLockYear, setBulkLockYear] = useState<string | null>(null);
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<Set<string>>(new Set());

  const currentYear = String(new Date().getFullYear());
  const [expandedYears, setExpandedYears] = useState<Set<string>>(() => new Set([currentYear]));

  function toggleYear(year: string) {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  }

  // null = auto-select latest month once tab data is available
  const [userSelectedPeriod, setUserSelectedPeriod] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  // Admin-added months not yet persisted (no items added)
  const [pendingMonths, setPendingMonths] = useState<string[]>([]);

  const selectedPeriod = useMemo(() => {
    if (!tab) return null;

    const fallback =
      tab.periods.length > 0
        ? tab.periods[tab.periods.length - 1].period
        : pendingMonths.length > 0
          ? pendingMonths[pendingMonths.length - 1]
          : null;

    if (userSelectedPeriod === null) return fallback;

    const inDb = tab.periods.some((p) => p.period === userSelectedPeriod);
    const isPending = pendingMonths.includes(userSelectedPeriod);
    if (!inDb && !isPending) return fallback;

    return userSelectedPeriod;
  }, [tab, userSelectedPeriod, pendingMonths]);

  function handleAddMonth(period: string) {
    if (!pendingMonths.includes(period)) {
      setPendingMonths((prev) => [...prev, period]);
    }
    setUserSelectedPeriod(period);
    setShowDeletePeriod(false);
    const year = period.slice(0, 4);
    setExpandedYears((prev) => (prev.has(year) ? prev : new Set([...prev, year])));
  }

  function handlePeriodSelect(period: string) {
    setUserSelectedPeriod(period);
    setShowDeletePeriod(false);
    setShowArchivePeriod(false);
    // Ensure the year of the selected period is expanded
    const year = period.slice(0, 4);
    setExpandedYears((prev) => (prev.has(year) ? prev : new Set([...prev, year])));
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <div className="bg-muted h-8 w-32 animate-pulse rounded" />
        <div className="bg-muted h-20 w-full animate-pulse rounded-xl" />
        <div className="bg-muted h-64 w-full animate-pulse rounded-xl" />
      </div>
    );
  }

  if (error || !tab) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Failed to load expense tab.
        </div>
      </div>
    );
  }

  // Build period list: existing periods + admin-added pending months only
  const allPeriods = [...tab.periods];
  const existingPeriodStrs = new Set(allPeriods.map((p) => p.period));

  const pendingPeriodStrs = new Set(pendingMonths);

  const virtualPeriods: ExpensePeriod[] = [
    ...allPeriods,
    ...[...pendingPeriodStrs]
      .filter((m) => !existingPeriodStrs.has(m))
      .map((m) => ({
        id: "__virtual__",
        period: m,
        is_locked: false,
        is_archived: false,
        items: [],
        payments: [],
        total_owed: 0,
        total_paid: 0,
        outstanding: 0,
        paid_status: "unpaid" as const,
      })),
  ];

  // Group by year (newest year first), months Jan → Dec within each year
  const yearGroups = groupPeriodsByYear(virtualPeriods);
  const allPeriodStrs = virtualPeriods.map((p) => p.period);
  const tabCurrency = tab.currency;

  function getYearSummary(periods: ExpensePeriod[]) {
    const real = periods.filter((p) => p.id !== "__virtual__");
    const monthCount = periods.length;
    const outstanding = real.reduce((s, p) => s + p.outstanding, 0);
    const ongoingCount = periods.filter(
      (p) => p.id === "__virtual__" || (!p.is_archived && p.paid_status !== "paid" && !p.is_locked)
    ).length;

    const parts: string[] = [`${monthCount} month${monthCount !== 1 ? "s" : ""}`];
    if (outstanding > 0) {
      parts.push(`${fmt(outstanding, tabCurrency)} outstanding`);
    } else if (real.length > 0 && real.every((p) => p.paid_status === "paid")) {
      parts.push("all paid");
    }
    if (ongoingCount > 0) {
      parts.push(`${ongoingCount} ongoing`);
    }
    return parts.join(" · ");
  }

  function exitBulkLockMode() {
    setBulkLockYear(null);
    setSelectedPeriodIds(new Set());
  }

  function enterBulkLockMode(year: string) {
    setBulkLockYear(year);
    setSelectedPeriodIds(new Set());
  }

  function togglePeriodSelection(periodId: string) {
    setSelectedPeriodIds((prev) => {
      const next = new Set(prev);
      if (next.has(periodId)) next.delete(periodId);
      else next.add(periodId);
      return next;
    });
  }

  function handleBulkAction(lockTo: boolean, yearPeriods: ExpensePeriod[]) {
    const yearReal = yearPeriods.filter((p) => p.id !== "__virtual__");
    const targets: BulkLockTarget[] = yearReal
      .filter((p) => selectedPeriodIds.has(p.id) && p.is_locked !== lockTo)
      .map((p) => ({ id: p.id, lockTo }));
    if (targets.length === 0) return;
    bulkToggleLock.mutate(targets, {
      onSuccess: () => {
        exitBulkLockMode();
        setShowBulkLockConfirm(null);
      },
    });
  }

  function requestBulkLock(year: string, lockTo: boolean, yearPeriods: ExpensePeriod[]) {
    const count = yearPeriods.filter(
      (p) => p.id !== "__virtual__" && selectedPeriodIds.has(p.id) && p.is_locked !== lockTo
    ).length;
    if (count === 0) return;
    setShowBulkLockConfirm({ year, lockTo, count });
  }

  function confirmBulkLock() {
    if (!showBulkLockConfirm) return;
    const group = yearGroups.find((g) => g.year === showBulkLockConfirm.year);
    if (!group) return;
    handleBulkAction(showBulkLockConfirm.lockTo, group.periods);
  }

  function handleConfirmDeletePeriod() {
    if (!activePeriod) return;
    if (isVirtual) {
      setPendingMonths((prev) => prev.filter((p) => p !== activePeriod.period));
      if (userSelectedPeriod === activePeriod.period) setUserSelectedPeriod(null);
      setShowDeletePeriod(false);
      return;
    }
    deletePeriod.mutate(activePeriod.id, {
      onSuccess: () => {
        setShowDeletePeriod(false);
        setUserSelectedPeriod(null);
      },
    });
  }

  function handleConfirmDeleteYear() {
    if (!showDeleteYear) return;
    const group = yearGroups.find((g) => g.year === showDeleteYear);
    if (!group) return;

    const realIds = group.periods.filter((p) => p.id !== "__virtual__").map((p) => p.id);
    const pendingInYear = group.periods.filter((p) => p.id === "__virtual__").map((p) => p.period);

    const finish = () => {
      if (pendingInYear.length > 0) {
        setPendingMonths((prev) => prev.filter((p) => !pendingInYear.includes(p)));
      }
      if (selectedPeriod?.startsWith(showDeleteYear)) {
        setUserSelectedPeriod(null);
      }
      setShowDeleteYear(null);
    };

    if (realIds.length === 0) {
      finish();
      return;
    }

    deleteYear.mutate(realIds, { onSuccess: finish });
  }

  const deleteYearGroup = showDeleteYear ? yearGroups.find((g) => g.year === showDeleteYear) : null;
  const deleteYearRealCount =
    deleteYearGroup?.periods.filter((p) => p.id !== "__virtual__").length ?? 0;
  const deleteYearPendingCount =
    deleteYearGroup?.periods.filter((p) => p.id === "__virtual__").length ?? 0;
  const deleteYearItemCount = deleteYearGroup?.periods.reduce((s, p) => s + p.items.length, 0) ?? 0;
  const deleteYearPaymentCount =
    deleteYearGroup?.periods.reduce((s, p) => s + p.payments.length, 0) ?? 0;

  function toggleAllInYear(yearPeriods: ExpensePeriod[]) {
    const yearReal = yearPeriods.filter((p) => p.id !== "__virtual__");
    const allSelected = yearReal.length > 0 && yearReal.every((p) => selectedPeriodIds.has(p.id));
    setSelectedPeriodIds(allSelected ? new Set() : new Set(yearReal.map((p) => p.id)));
  }

  const activePeriod =
    selectedPeriod !== null
      ? (virtualPeriods.find((p) => p.period === selectedPeriod) ?? null)
      : null;
  const isVirtual = activePeriod?.id === "__virtual__";

  const activePeriodClosure =
    activePeriod && !isVirtual
      ? {
          period: activePeriod.period,
          is_locked: activePeriod.is_locked,
          is_archived: activePeriod.is_archived,
          paid_status: activePeriod.paid_status,
        }
      : null;
  const activePeriodClosedMessage = activePeriodClosure
    ? getPeriodClosedMessage(activePeriodClosure) || null
    : null;
  const activePeriodClosed = activePeriodClosedMessage !== null;

  const activePeriodEmpty =
    activePeriod &&
    !isVirtual &&
    activePeriod.items.length === 0 &&
    activePeriod.payments.length === 0;

  const unpaidPeriods = virtualPeriods
    .filter((p) => p.id !== "__virtual__" && p.outstanding > 0)
    .sort((a, b) => a.period.localeCompare(b.period));
  const firstUnpaidPeriod = unpaidPeriods[0] ?? null;

  function handleJumpToUnpaid() {
    if (!firstUnpaidPeriod) return;
    handlePeriodSelect(firstUnpaidPeriod.period);
  }

  async function handleAddItem(desc: string, amount: number, isSplit: boolean) {
    if (!selectedPeriod || activePeriodClosed) return;
    const [year, month] = selectedPeriod.split("-").map(Number);
    await addItem.mutateAsync({
      period: new Date(year, month - 1, 1),
      description: desc,
      amount,
      is_already_split: isSplit,
    });
  }

  async function handleRecordPayment(amount: number, notes: string, date: string) {
    if (!activePeriod || isVirtual) return;
    await recordPayment.mutateAsync({
      period_id: activePeriod.id,
      amount,
      notes,
      payment_date: date,
    });
    setShowPaymentModal(false);
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="shrink-0 space-y-4 p-6 pb-0">
        {/* Back + export actions */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void navigate("/tabs")}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Tabs
          </button>

          {tab.periods.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => exportExpenseTabCSV(tab)}
                className="border-border/60 text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors"
              >
                <TableProperties className="h-3.5 w-3.5" />
                CSV
              </button>
              <button
                type="button"
                onClick={() => printExpenseTabPDF(tab)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                PDF
              </button>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="bg-card border-border/60 rounded-2xl border p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-muted-foreground text-xs tracking-widest uppercase">
                {tab.borrower.full_name}
              </p>
              <p className="text-foreground mt-1 text-2xl font-bold tabular-nums">
                {fmt(tab.outstanding, tab.currency)}
              </p>
              <p className="text-muted-foreground text-xs">outstanding</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-emerald-400 tabular-nums">
                {fmt(tab.total_paid, tab.currency)}
              </p>
              <p className="text-muted-foreground text-[10px]">paid</p>
              <p className="text-muted-foreground mt-1.5 text-sm tabular-nums">
                {fmt(tab.total_owed, tab.currency)}
              </p>
              <p className="text-muted-foreground text-[10px]">total charged</p>
            </div>
          </div>
        </div>

        {/* Month navigation — grouped by year */}
        <div className="space-y-3">
          {/* Add month — only when no years exist yet */}
          {isAdmin && yearGroups.length === 0 && (
            <div className="flex items-center gap-2 pb-1">
              <span className="text-muted-foreground text-xs">Add month</span>
              <MonthPickerPopover existingPeriods={[]} onSelect={handleAddMonth} />
            </div>
          )}

          {/* Status legend + jump to unpaid */}
          {yearGroups.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <PeriodStatusLegend />
              {firstUnpaidPeriod && (
                <button
                  type="button"
                  onClick={handleJumpToUnpaid}
                  className="border-border/60 text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors"
                >
                  <SkipForward className="h-3 w-3" />
                  Jump to unpaid
                  <span className="text-muted-foreground/70">
                    ({formatPeriodShort(firstUnpaidPeriod.period)})
                  </span>
                </button>
              )}
            </div>
          )}

          {yearGroups.map(({ year, periods: yearPeriods }) => {
            const isCurrentYear = year === currentYear;
            const isExpanded = expandedYears.has(year);
            const isBulkActive = bulkLockYear === year;

            const realPeriods = yearPeriods.filter((p) => p.id !== "__virtual__");
            const allPaid =
              realPeriods.length > 0 && realPeriods.every((p) => p.paid_status === "paid");
            const allArchived = realPeriods.length > 0 && realPeriods.every((p) => p.is_archived);
            const canArchiveYear =
              isAdmin && !isCurrentYear && allPaid && !allArchived && realPeriods.length > 0;
            const yearSummary = getYearSummary(yearPeriods);
            const yearAllSelected =
              realPeriods.length > 0 && realPeriods.every((p) => selectedPeriodIds.has(p.id));

            return (
              <div key={year} className="bg-muted/20 border-border/40 rounded-xl border p-3">
                {/* Year header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleYear(year)}
                        className="text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-1.5 transition-colors"
                        aria-expanded={isExpanded}
                      >
                        <ChevronRight
                          className={cn(
                            "h-3.5 w-3.5 transition-transform duration-200",
                            isExpanded && "rotate-90"
                          )}
                        />
                        <span className="text-foreground text-xs font-semibold tracking-wide">
                          {year}
                        </span>
                      </button>
                      {allArchived && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                          <Archive className="h-2.5 w-2.5" />
                          Archived
                        </span>
                      )}
                      {isAdmin && isExpanded && !isBulkActive && (
                        <MonthPickerPopover
                          existingPeriods={allPeriodStrs}
                          onSelect={handleAddMonth}
                          defaultYear={Number(year)}
                        />
                      )}
                    </div>
                    <p className="text-muted-foreground mt-1 pl-5 text-[10px]">{yearSummary}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {isAdmin && realPeriods.length >= 2 && !isBulkActive && (
                      <button
                        type="button"
                        onClick={() => enterBulkLockMode(year)}
                        className="border-border/60 text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium transition-colors"
                      >
                        <CheckSquare className="h-3 w-3" />
                        Bulk
                      </button>
                    )}
                    {canArchiveYear && !isBulkActive && (
                      <button
                        type="button"
                        onClick={() => setShowArchiveYear(year)}
                        className="text-muted-foreground flex items-center gap-1 text-[10px] font-medium transition-colors hover:text-violet-400"
                      >
                        <Archive className="h-3 w-3" />
                        Archive
                      </button>
                    )}
                    {isAdmin && yearPeriods.length > 0 && !isBulkActive && (
                      <button
                        type="button"
                        onClick={() => setShowDeleteYear(year)}
                        className="text-muted-foreground flex items-center gap-1 text-[10px] font-medium transition-colors hover:text-rose-400"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Per-year bulk controls */}
                {isAdmin && isBulkActive && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 pl-5">
                    <button
                      type="button"
                      onClick={() => toggleAllInYear(yearPeriods)}
                      className="flex cursor-pointer items-center gap-1.5"
                    >
                      <div
                        className={cn(
                          "flex h-3.5 w-3.5 items-center justify-center rounded border transition-colors",
                          yearAllSelected ? "bg-primary border-primary" : "border-border/60"
                        )}
                      >
                        {yearAllSelected && (
                          <svg
                            viewBox="0 0 10 8"
                            className="h-2 w-2 text-white"
                            fill="currentColor"
                          >
                            <path
                              d="M1 4l2.5 2.5L9 1"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="text-foreground text-[10px] font-semibold">
                        {selectedPeriodIds.size > 0
                          ? `${selectedPeriodIds.size} selected`
                          : "Select all"}
                      </span>
                    </button>
                    {selectedPeriodIds.size > 0 &&
                      realPeriods.some((p) => selectedPeriodIds.has(p.id) && !p.is_locked) && (
                        <button
                          type="button"
                          disabled={bulkToggleLock.isPending}
                          onClick={() => requestBulkLock(year, true, yearPeriods)}
                          className="flex items-center gap-1 rounded-lg border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-400"
                        >
                          <Lock className="h-2.5 w-2.5" />
                          Lock
                        </button>
                      )}
                    {selectedPeriodIds.size > 0 &&
                      realPeriods.some((p) => selectedPeriodIds.has(p.id) && p.is_locked) && (
                        <button
                          type="button"
                          disabled={bulkToggleLock.isPending}
                          onClick={() => requestBulkLock(year, false, yearPeriods)}
                          className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400"
                        >
                          <Unlock className="h-2.5 w-2.5" />
                          Unlock
                        </button>
                      )}
                    <button
                      type="button"
                      onClick={exitBulkLockMode}
                      className="text-muted-foreground text-[10px] font-medium hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Year progress bar — always visible */}
                <div className="mt-2 pl-5">
                  <YearProgressBar
                    year={year}
                    periods={yearPeriods}
                    selectedPeriod={selectedPeriod}
                    currency={tab.currency}
                    onSelect={handlePeriodSelect}
                  />
                </div>

                {/* Month pills — wrap grid, Jan → Dec */}
                {isExpanded && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 pl-5">
                    {yearPeriods.map((p) => (
                      <MonthPill
                        key={p.period}
                        period={p.period}
                        is_locked={p.is_locked}
                        is_archived={p.is_archived}
                        paid_status={p.paid_status}
                        isVirtual={p.id === "__virtual__"}
                        isSelected={p.period === selectedPeriod}
                        onClick={() => handlePeriodSelect(p.period)}
                        bulkMode={isBulkActive && p.id !== "__virtual__"}
                        isChecked={selectedPeriodIds.has(p.id)}
                        onBulkToggle={
                          p.id !== "__virtual__" ? () => togglePeriodSelection(p.id) : undefined
                        }
                        monthLabelOnly
                        outstanding={p.outstanding}
                        currency={tab.currency}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Month content — scrollable ───────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {selectedPeriod === null ? (
          <div className="p-6 pt-4">
            <div className="bg-card border-border/60 rounded-xl border px-4 py-16 text-center">
              <CalendarPlus className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
              <p className="text-foreground text-sm font-medium">No months yet</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {isAdmin
                  ? "Use Add month above to open a new expense period."
                  : "Your lender hasn't opened any months yet."}
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedPeriod}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="p-6 pt-4"
            >
              {/* Month header */}
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-foreground truncate text-base font-semibold">
                    {formatPeriodLabel(selectedPeriod)}
                  </h2>
                  {isVirtual ? (
                    <p className="text-muted-foreground text-xs">New month — add items to open</p>
                  ) : (
                    activePeriod && (
                      <p className="text-muted-foreground text-xs">
                        {activePeriod.paid_status === "paid"
                          ? "Fully paid"
                          : activePeriod.paid_status === "partial"
                            ? `${fmt(activePeriod.outstanding, tab.currency)} remaining`
                            : activePeriod.total_owed > 0
                              ? "Unpaid"
                              : "No items yet"}
                      </p>
                    )
                  )}
                </div>

                {isAdmin && activePeriod && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    {/* Delete month — empty real months or unsaved draft months */}
                    {!activePeriod.is_archived && (isVirtual || activePeriodEmpty) && (
                      <button
                        type="button"
                        onClick={() => setShowDeletePeriod(true)}
                        className="border-border/60 text-muted-foreground flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors hover:border-rose-500/30 hover:text-rose-400 sm:px-3"
                        title={isVirtual ? "Remove this draft month" : "Delete this month"}
                      >
                        <Trash2 className="h-3 w-3 shrink-0" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    )}

                    {!isVirtual && (
                      <>
                        {/* Delete month hint when not empty */}
                        {!activePeriod.is_archived &&
                          !activePeriodEmpty &&
                          activePeriod.items.length + activePeriod.payments.length > 0 && (
                            <button
                              type="button"
                              disabled
                              className="border-border/60 text-muted-foreground flex cursor-not-allowed items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium opacity-40 sm:px-3"
                              title="Remove all items and payments before deleting this month"
                            >
                              <Trash2 className="h-3 w-3 shrink-0" />
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          )}

                        {/* Archive month — fully-paid, non-archived, has content */}
                        {!activePeriod.is_archived &&
                          activePeriod.paid_status === "paid" &&
                          activePeriod.items.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setShowArchivePeriod(true)}
                              className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2 py-1.5 text-xs font-medium text-violet-400 transition-colors hover:bg-violet-500/20 sm:px-3"
                            >
                              <Archive className="h-3 w-3 shrink-0" />
                              <span className="hidden sm:inline">Archive</span>
                            </button>
                          )}

                        {/* Archived badge — static, no button */}
                        {activePeriod.is_archived && (
                          <div className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2 py-1.5 text-xs font-medium text-violet-400 sm:px-3">
                            <Archive className="h-3 w-3 shrink-0" />
                            <span className="hidden sm:inline">Archived</span>
                          </div>
                        )}

                        {/* Lock/Unlock */}
                        {!activePeriod.is_archived && (
                          <button
                            type="button"
                            disabled={toggleLock.isPending}
                            onClick={() =>
                              setShowLockConfirm({
                                periodId: activePeriod.id,
                                lockTo: !activePeriod.is_locked,
                                label: formatPeriodLabel(activePeriod.period),
                              })
                            }
                            className={cn(
                              "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors sm:px-3",
                              activePeriod.is_locked
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                                : "border-border/60 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {activePeriod.is_locked ? (
                              <>
                                <Unlock className="h-3 w-3 shrink-0" />
                                <span className="hidden sm:inline">Unlock</span>
                              </>
                            ) : (
                              <>
                                <Lock className="h-3 w-3 shrink-0" />
                                <span className="hidden sm:inline">Lock</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* Record Payment */}
                        {activePeriod.outstanding > 0 && !activePeriod.is_archived && (
                          <button
                            type="button"
                            onClick={() => setShowPaymentModal(true)}
                            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 sm:px-3"
                          >
                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                            <span className="hidden sm:inline">Payment</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Items + payments list */}
              <div className="bg-card border-border/60 overflow-hidden rounded-xl border">
                {isVirtual ||
                (activePeriod?.items.length === 0 && activePeriod?.payments.length === 0) ? (
                  <div className="px-4 py-10 text-center">
                    <p className="text-muted-foreground text-sm">
                      {isAdmin
                        ? isVirtual
                          ? "Add the first item to create this month."
                          : "Add the first item below."
                        : "No items this month yet."}
                    </p>
                  </div>
                ) : (
                  <div className="divide-border/30 divide-y">
                    {activePeriod?.items.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        currency={tab.currency}
                        isAdmin={isAdmin}
                        isLocked={activePeriodClosed}
                        onDelete={(iid) => deleteItem.mutate(iid)}
                        onEdit={(iid, desc, amt, split) =>
                          updateItem.mutate({
                            id: iid,
                            description: desc,
                            amount: amt,
                            is_already_split: split,
                          })
                        }
                      />
                    ))}
                    {activePeriod?.payments.map((payment) => (
                      <PaymentRow
                        key={payment.id}
                        payment={payment}
                        currency={tab.currency}
                        isAdmin={isAdmin}
                        isLocked={activePeriodClosed}
                        onDelete={(pid) => deletePayment.mutate(pid)}
                      />
                    ))}
                  </div>
                )}

                {/* Month totals footer */}
                {!isVirtual && activePeriod && activePeriod.total_owed > 0 && (
                  <div className="border-border/60 bg-muted/20 space-y-1 border-t px-4 py-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Charged</span>
                      <span className="text-foreground font-medium tabular-nums">
                        {fmt(activePeriod.total_owed, tab.currency)}
                      </span>
                    </div>
                    {activePeriod.total_paid > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Paid</span>
                        <span className="font-medium text-emerald-400 tabular-nums">
                          -{fmt(activePeriod.total_paid, tab.currency)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground font-semibold">Outstanding</span>
                      <span
                        className={cn(
                          "font-bold tabular-nums",
                          activePeriod.outstanding <= 0 ? "text-emerald-400" : "text-foreground"
                        )}
                      >
                        {fmt(activePeriod.outstanding, tab.currency)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* ── Quick-add bar — sticky bottom (admin only) ─────────── */}
      {isAdmin && selectedPeriod !== null && (
        <div className="shrink-0">
          <QuickAddBar
            onAdd={handleAddItem}
            isPending={addItem.isPending}
            closedMessage={activePeriodClosedMessage}
          />
        </div>
      )}

      {/* ── Payment modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {showPaymentModal && activePeriod && !isVirtual && (
          <RecordPaymentModal
            period={activePeriod}
            currency={tab.currency}
            outstanding={activePeriod.outstanding}
            onClose={() => setShowPaymentModal(false)}
            onSubmit={(amount, notes, date) => void handleRecordPayment(amount, notes, date)}
            isPending={recordPayment.isPending}
          />
        )}
      </AnimatePresence>

      {/* ── Confirm dialogs ──────────────────────────────────────── */}
      <ConfirmDialog
        open={showDeletePeriod}
        title={`Delete ${activePeriod ? formatPeriodLabel(activePeriod.period) : "this month"}?`}
        description={
          isVirtual
            ? "This draft month hasn't been saved yet and will be removed."
            : "This month has no items or payments and will be permanently removed."
        }
        confirmLabel="Delete month"
        isPending={deletePeriod.isPending}
        onConfirm={handleConfirmDeletePeriod}
        onCancel={() => setShowDeletePeriod(false)}
      />

      <ConfirmDialog
        open={showLockConfirm !== null}
        title={
          showLockConfirm?.lockTo
            ? `Lock ${showLockConfirm.label}?`
            : `Unlock ${showLockConfirm?.label ?? "this month"}?`
        }
        description={
          showLockConfirm?.lockTo
            ? "Items and payments cannot be added or edited while this month is locked."
            : "This month will be open for adding and editing items again."
        }
        confirmLabel={showLockConfirm?.lockTo ? "Lock month" : "Unlock month"}
        variant="warning"
        isPending={toggleLock.isPending}
        onConfirm={() => {
          if (!showLockConfirm) return;
          toggleLock.mutate(
            { periodId: showLockConfirm.periodId, is_locked: showLockConfirm.lockTo },
            { onSuccess: () => setShowLockConfirm(null) }
          );
        }}
        onCancel={() => setShowLockConfirm(null)}
      />

      <ConfirmDialog
        open={showBulkLockConfirm !== null}
        title={
          showBulkLockConfirm?.lockTo
            ? `Lock ${showBulkLockConfirm.count} month${showBulkLockConfirm.count !== 1 ? "s" : ""}?`
            : `Unlock ${showBulkLockConfirm?.count ?? 0} month${showBulkLockConfirm?.count !== 1 ? "s" : ""}?`
        }
        description={
          showBulkLockConfirm?.lockTo
            ? "Selected months will be locked. Items and payments cannot be changed until unlocked."
            : "Selected months will be unlocked for editing again."
        }
        confirmLabel={showBulkLockConfirm?.lockTo ? "Lock selected" : "Unlock selected"}
        variant="warning"
        isPending={bulkToggleLock.isPending}
        onConfirm={confirmBulkLock}
        onCancel={() => setShowBulkLockConfirm(null)}
      />

      <ConfirmDialog
        open={showDeleteYear !== null}
        title={`Delete all of ${showDeleteYear}?`}
        description={[
          deleteYearRealCount > 0
            ? `${deleteYearRealCount} month${deleteYearRealCount !== 1 ? "s" : ""}`
            : null,
          deleteYearPendingCount > 0
            ? `${deleteYearPendingCount} draft month${deleteYearPendingCount !== 1 ? "s" : ""}`
            : null,
          deleteYearItemCount > 0 || deleteYearPaymentCount > 0
            ? `${deleteYearItemCount} item${deleteYearItemCount !== 1 ? "s" : ""} and ${deleteYearPaymentCount} payment${deleteYearPaymentCount !== 1 ? "s" : ""} will be permanently deleted`
            : null,
          "This cannot be undone.",
        ]
          .filter(Boolean)
          .join(" · ")}
        confirmLabel={`Delete ${showDeleteYear}`}
        isPending={deleteYear.isPending}
        onConfirm={handleConfirmDeleteYear}
        onCancel={() => setShowDeleteYear(null)}
      />

      <ConfirmDialog
        open={showArchivePeriod}
        title={`Archive ${activePeriod ? formatPeriodLabel(activePeriod.period) : "this month"}?`}
        description="This month is fully paid and will be archived and locked. You can still view it but no further changes will be allowed."
        confirmLabel="Archive month"
        variant="warning"
        isPending={archivePeriod.isPending}
        onConfirm={() =>
          activePeriod &&
          archivePeriod.mutate(activePeriod.id, { onSuccess: () => setShowArchivePeriod(false) })
        }
        onCancel={() => setShowArchivePeriod(false)}
      />

      <ConfirmDialog
        open={showArchiveYear !== null}
        title={`Archive all of ${showArchiveYear}?`}
        description={`Every month in ${showArchiveYear} is fully paid. They will all be archived and locked together.`}
        confirmLabel={`Archive ${showArchiveYear}`}
        variant="warning"
        isPending={archiveYear.isPending}
        onConfirm={() => {
          if (!showArchiveYear) return;
          const group = yearGroups.find((g) => g.year === showArchiveYear);
          const ids = (group?.periods ?? []).filter((p) => p.id !== "__virtual__").map((p) => p.id);
          archiveYear.mutate(ids, { onSuccess: () => setShowArchiveYear(null) });
        }}
        onCancel={() => setShowArchiveYear(null)}
      />
    </div>
  );
}
