import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  useUpdateExpenseItem,
  useArchivePeriod,
  useArchiveYear,
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

function currentMonthStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

const PAID_STATUS_STYLES = {
  paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  partial: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  unpaid: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

// ── Month pills ───────────────────────────────────────────────────────────────

function MonthPill({
  period,
  is_locked,
  is_archived,
  paid_status,
  isSelected,
  onClick,
}: {
  period: string;
  is_locked: boolean;
  is_archived: boolean;
  paid_status: "unpaid" | "partial" | "paid";
  isSelected: boolean;
  onClick: () => void;
}) {
  const Icon = is_archived ? Archive : paid_status === "paid" ? CheckCircle2 : is_locked ? Lock : Unlock;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
        isSelected
          ? "bg-primary/15 border-primary/40 text-primary shadow-sm"
          : cn(PAID_STATUS_STYLES[paid_status], "hover:opacity-80")
      )}
    >
      <Icon className="h-3 w-3" />
      {formatPeriodShort(period)}
    </button>
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

  // If period becomes locked while in edit mode, exit gracefully
  useEffect(() => {
    if (isLocked) { setMode("view"); setShowDeleteDialog(false); }
  }, [isLocked]);

  function handleSave() {
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

  if (mode === "edit") {
    return (
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancelEdit(); }}
            className="border-border/60 bg-muted/50 focus:border-primary/60 min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-sm outline-none"
          />
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancelEdit(); }}
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
            className="text-emerald-400 hover:text-emerald-300 shrink-0 transition-colors"
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
            onClick={() => setMode("edit")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteDialog(true)}
            className="text-muted-foreground hover:text-rose-400 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete this item?"
        description={`"${item.description}" (${fmt(item.borrower_owes, currency)}) will be permanently removed.`}
        confirmLabel="Delete item"
        onConfirm={() => { onDelete(item.id); setShowDeleteDialog(false); }}
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
          className="text-muted-foreground shrink-0 hover:text-rose-400 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete this payment?"
        description={`${fmt(payment.amount, currency)} recorded on ${fmtDate(payment.payment_date)} will be permanently removed.`}
        confirmLabel="Delete payment"
        onConfirm={() => { onDelete(payment.id); setShowDeleteDialog(false); }}
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

  return (
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
              disabled={isPending || !amount || Number(amount) <= 0}
              onClick={() => onSubmit(Number(amount), notes, date)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirm
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Month picker popover ──────────────────────────────────────────────────────

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

function MonthPickerPopover({
  existingPeriods,
  onSelect,
}: {
  existingPeriods: string[]; // "YYYY-MM-DD"
  onSelect: (period: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth(); // 0-indexed

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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs transition-colors"
        aria-label="Open a past month"
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
  isLocked,
}: {
  onAdd: (desc: string, amount: number, isSplit: boolean) => Promise<void>;
  isPending: boolean;
  isLocked: boolean;
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

  if (isLocked) {
    return (
      <div className="border-border/60 bg-background/95 border-t px-4 py-3">
        <p className="text-muted-foreground text-center text-xs">
          Month is locked — unlock to add items
        </p>
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
  const archivePeriod = useArchivePeriod(id!);
  const archiveYear = useArchiveYear(id!);

  const [showDeletePeriod, setShowDeletePeriod] = useState(false);
  const [showArchivePeriod, setShowArchivePeriod] = useState(false);
  const [showArchiveYear, setShowArchiveYear] = useState<string | null>(null);

  const currentYear = String(new Date().getFullYear());
  const [expandedYears, setExpandedYears] = useState<Set<string>>(() => new Set([currentYear]));

  function toggleYear(year: string) {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });
  }

  const thisMonth = currentMonthStr();

  // Default selected period: current month if it exists, else latest period
  const [selectedPeriod, setSelectedPeriod] = useState<string>(thisMonth);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  // Admin-added virtual months for past periods not yet in DB
  const [extraVirtualMonths, setExtraVirtualMonths] = useState<string[]>([]);

  // Once data loads, ensure selectedPeriod is valid.
  // Must also allow extraVirtualMonths and the current-month virtual period.
  useEffect(() => {
    if (!tab) return;
    const inDb = tab.periods.some((p) => p.period === selectedPeriod);
    const isVirtualAllowed =
      selectedPeriod === thisMonth || extraVirtualMonths.includes(selectedPeriod);
    if (!inDb && !isVirtualAllowed && tab.periods.length > 0) {
      const hasCurrent = tab.periods.some((p) => p.period === thisMonth);
      setSelectedPeriod(hasCurrent ? thisMonth : tab.periods[tab.periods.length - 1].period);
    }
  }, [tab, selectedPeriod, thisMonth, extraVirtualMonths]);

  function handleAddPastMonth(period: string) {
    // period is already "YYYY-MM-DD" from MonthPickerPopover
    if (!extraVirtualMonths.includes(period)) {
      setExtraVirtualMonths((prev) => [...prev, period]);
    }
    setSelectedPeriod(period);
    setShowDeletePeriod(false);
  }

  function handlePeriodSelect(period: string) {
    setSelectedPeriod(period);
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

  // Build period list: existing periods + current month + any admin-added past months
  const allPeriods = [...tab.periods];
  const existingPeriodStrs = new Set(allPeriods.map((p) => p.period));

  const virtualMonths = new Set([...extraVirtualMonths, thisMonth]);

  const virtualPeriods: ExpensePeriod[] = [
    ...allPeriods,
    ...[...virtualMonths]
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

  // Sorted newest-first for pills display
  const sortedPeriods = [...virtualPeriods].sort((a, b) => b.period.localeCompare(a.period));

  // Group by year (newest year first)
  const periodsByYear = sortedPeriods.reduce<Record<string, typeof sortedPeriods>>((acc, p) => {
    const year = p.period.slice(0, 4);
    (acc[year] ??= []).push(p);
    return acc;
  }, {});
  const years = Object.keys(periodsByYear).sort((a, b) => b.localeCompare(a));

  const activePeriod = virtualPeriods.find((p) => p.period === selectedPeriod) ?? null;
  const isVirtual = activePeriod?.id === "__virtual__";

  async function handleAddItem(desc: string, amount: number, isSplit: boolean) {
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
        <div className="space-y-2">
          {years.map((year) => {
            const yearPeriods = periodsByYear[year];
            const isCurrentYear = year === currentYear;
            const isExpanded = isCurrentYear || expandedYears.has(year);

            // Real (non-virtual) periods only for archive logic
            const realPeriods = yearPeriods.filter((p) => p.id !== "__virtual__");
            const allPaid = realPeriods.length > 0 && realPeriods.every((p) => p.paid_status === "paid");
            const allArchived = realPeriods.length > 0 && realPeriods.every((p) => p.is_archived);
            const canArchiveYear = isAdmin && !isCurrentYear && allPaid && !allArchived && realPeriods.length > 0;

            const yearTotalOwed = realPeriods.reduce((s, p) => s + p.total_owed, 0);

            return (
              <div key={year}>
                {/* Year header row */}
                <div className="flex items-center justify-between gap-2 pb-1.5">
                  <div className="flex items-center gap-2">
                    {!isCurrentYear && (
                      <button
                        type="button"
                        onClick={() => toggleYear(year)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ChevronRight
                          className={cn(
                            "h-3.5 w-3.5 transition-transform duration-200",
                            isExpanded && "rotate-90"
                          )}
                        />
                      </button>
                    )}
                    <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                      {year}
                    </span>
                    {allArchived && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                        <Archive className="h-2.5 w-2.5" />
                        Archived
                      </span>
                    )}
                  </div>

                  {/* Archive Year button */}
                  {canArchiveYear && (
                    <button
                      type="button"
                      onClick={() => setShowArchiveYear(year)}
                      className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-violet-400 transition-colors"
                    >
                      <Archive className="h-3 w-3" />
                      Archive {year}
                    </button>
                  )}

                  {/* Collapsed summary for non-current past years */}
                  {!isCurrentYear && !isExpanded && realPeriods.length > 0 && (
                    <span className="text-muted-foreground text-[10px]">
                      {realPeriods.length} month{realPeriods.length !== 1 ? "s" : ""}
                      {yearTotalOwed > 0 ? ` · ${fmt(yearTotalOwed, tab.currency)}` : ""}
                    </span>
                  )}
                </div>

                {/* Month pills row (shown when expanded) */}
                {isExpanded && (
                  <div className="scrollbar-none -mx-6 flex items-center gap-2 overflow-x-auto px-6 pb-2">
                    {yearPeriods.map((p) => (
                      <MonthPill
                        key={p.period}
                        period={p.period}
                        is_locked={p.is_locked}
                        is_archived={p.is_archived}
                        paid_status={p.paid_status}
                        isSelected={p.period === selectedPeriod}
                        onClick={() => handlePeriodSelect(p.period)}
                      />
                    ))}

                    {/* Add past month — only in the current year section */}
                    {isCurrentYear && isAdmin && (
                      <MonthPickerPopover
                        existingPeriods={sortedPeriods.map((p) => p.period)}
                        onSelect={handleAddPastMonth}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* If no periods exist yet, show add past month button standalone */}
          {years.length === 0 && isAdmin && (
            <div className="flex items-center gap-2 pb-2">
              <MonthPickerPopover
                existingPeriods={[]}
                onSelect={handleAddPastMonth}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Month content — scrollable ───────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
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
                {!isVirtual && activePeriod && (
                  <p className="text-muted-foreground text-xs">
                    {activePeriod.paid_status === "paid"
                      ? "Fully paid"
                      : activePeriod.paid_status === "partial"
                        ? `${fmt(activePeriod.outstanding, tab.currency)} remaining`
                        : activePeriod.total_owed > 0
                          ? "Unpaid"
                          : "No items yet"}
                  </p>
                )}
              </div>

              {isAdmin && !isVirtual && activePeriod && (
                <div className="flex shrink-0 items-center gap-1.5">
                  {/* Delete month — only enabled when empty */}
                  {!activePeriod.is_archived && (
                    <button
                      type="button"
                      disabled={activePeriod.items.length > 0 || activePeriod.payments.length > 0}
                      onClick={() => setShowDeletePeriod(true)}
                      className="border-border/60 text-muted-foreground hover:border-rose-500/30 hover:text-rose-400 flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:px-3"
                      title={
                        activePeriod.items.length > 0 || activePeriod.payments.length > 0
                          ? "Remove all items and payments before deleting this month"
                          : "Delete this month"
                      }
                    >
                      <Trash2 className="h-3 w-3 shrink-0" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  )}

                  {/* Archive month — fully-paid, non-archived, has content */}
                  {!activePeriod.is_archived && activePeriod.paid_status === "paid" && activePeriod.items.length > 0 && (
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
                        toggleLock.mutate({
                          periodId: activePeriod.id,
                          is_locked: !activePeriod.is_locked,
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
                </div>
              )}
            </div>

            {/* Items + payments list */}
            <div className="bg-card border-border/60 overflow-hidden rounded-xl border">
              {isVirtual ||
              (activePeriod?.items.length === 0 && activePeriod?.payments.length === 0) ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-muted-foreground text-sm">
                    {isAdmin ? "Add the first item below." : "No items this month yet."}
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
                      isLocked={activePeriod.is_locked}
                      onDelete={(iid) => deleteItem.mutate(iid)}
                      onEdit={(iid, desc, amt, split) =>
                        updateItem.mutate({ id: iid, description: desc, amount: amt, is_already_split: split })
                      }
                    />
                  ))}
                  {activePeriod?.payments.map((payment) => (
                    <PaymentRow
                      key={payment.id}
                      payment={payment}
                      currency={tab.currency}
                      isAdmin={isAdmin}
                      isLocked={activePeriod.is_locked}
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
      </div>

      {/* ── Quick-add bar — sticky bottom (admin only) ─────────── */}
      {isAdmin && (
        <div className="shrink-0">
          <QuickAddBar
            onAdd={handleAddItem}
            isPending={addItem.isPending}
            isLocked={activePeriod?.is_locked ?? false}
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
        description="This month has no items or payments and will be permanently removed."
        confirmLabel="Delete month"
        isPending={deletePeriod.isPending}
        onConfirm={() =>
          activePeriod &&
          deletePeriod.mutate(activePeriod.id, { onSuccess: () => setShowDeletePeriod(false) })
        }
        onCancel={() => setShowDeletePeriod(false)}
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
          const ids = (periodsByYear[showArchiveYear] ?? [])
            .filter((p) => p.id !== "__virtual__")
            .map((p) => p.id);
          archiveYear.mutate(ids, { onSuccess: () => setShowArchiveYear(null) });
        }}
        onCancel={() => setShowArchiveYear(null)}
      />
    </div>
  );
}
