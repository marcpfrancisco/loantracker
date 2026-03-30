import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  Plus,
  Receipt,
  AlertCircle,
  Loader2,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { cardVariants } from "@/lib/animations";
import { useBorrowerDetail } from "@/hooks/useBorrowerDetail";
import { useCreateExpenseTab } from "@/hooks/useExpenseTabMutations";
import { LoanStatementDrawer } from "@/components/admin/LoanStatementDrawer";
import { RegionBadge } from "@/components/ui/region-badge";
import type { CurrencyType } from "@/types/enums";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const STATUS_STYLES = {
  active: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  defaulted: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
} as const;

const LOAN_TYPE_LABEL: Record<string, string> = {
  maribank_credit: "Maribank",
  sloan: "S-Loan",
  gloan: "G-Loan",
  spaylater: "SPayLater",
  tabby: "Tabby",
  credit_card: "CC",
  lazcredit: "LazCredit",
  custom: "Custom",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── Create Tab Modal ──────────────────────────────────────────────────────────

interface CreateTabModalProps {
  borrowerId: string;
  defaultCurrency: CurrencyType;
  borrowerName: string;
  onClose: () => void;
  onCreated: (tabId: string) => void;
}

function CreateTabModal({
  borrowerId,
  defaultCurrency,
  borrowerName,
  onClose,
  onCreated,
}: CreateTabModalProps) {
  const [title, setTitle] = useState("Shared Expenses");
  const [currency, setCurrency] = useState<CurrencyType>(defaultCurrency);
  const createTab = useCreateExpenseTab();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { id } = borrowerId
      ? await createTab.mutateAsync({
          borrower_id: borrowerId,
          currency,
          region: currency === "PHP" ? "PH" : "UAE",
          title,
        })
      : { id: "" };
    onCreated(id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="bg-card border-border/60 relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border shadow-2xl"
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="border-border/60 border-b px-5 py-4">
          <p className="text-foreground text-sm font-semibold">Create Expense Tab</p>
          <p className="text-muted-foreground mt-0.5 text-xs">for {borrowerName}</p>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-5">
          <div className="space-y-1.5">
            <label className="text-foreground text-xs font-medium">Tab Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-border/60 bg-background focus:border-primary/60 w-full rounded-lg border px-3 py-2 text-sm transition-colors outline-none"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-foreground text-xs font-medium">Currency</label>
            <div className="grid grid-cols-2 gap-2">
              {(["PHP", "AED"] as CurrencyType[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  className={cn(
                    "rounded-lg border py-2 text-sm font-medium transition-colors",
                    currency === c
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "border-border/60 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          {createTab.error && (
            <p className="text-destructive text-xs">{(createTab.error as Error).message}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="border-border/60 text-muted-foreground hover:text-foreground flex-1 rounded-lg border py-2 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTab.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-60"
            >
              {createTab.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Create
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BorrowerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: borrower, isLoading, error } = useBorrowerDetail(id);
  const [showCreateTab, setShowCreateTab] = useState(false);
  const [showStatement, setShowStatement] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 p-6">
        <div className="bg-muted h-24 w-full animate-pulse rounded-xl" />
        <div className="bg-muted h-32 w-full animate-pulse rounded-xl" />
        <div className="bg-muted h-48 w-full animate-pulse rounded-xl" />
      </div>
    );
  }

  if (error || !borrower) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Failed to load borrower profile.
        </div>
      </div>
    );
  }

  const defaultCurrency: CurrencyType = borrower.region === "UAE" ? "AED" : "PHP";
  const activeLoans = borrower.loans.filter((l) => l.status === "active");

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => void navigate("/admin")}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Admin
      </button>

      {/* ── Profile card ────────────────────────────────────────── */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible">
        <div className="bg-card border-border/60 rounded-2xl border p-5">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="bg-primary/15 text-primary flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold">
              {getInitials(borrower.full_name)}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-foreground text-lg font-semibold">{borrower.full_name}</h1>
                {borrower.loans.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowStatement(true)}
                    className="border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Statement
                  </button>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <RegionBadge region={borrower.region} />
                <span className="text-muted-foreground text-xs capitalize">{borrower.role}</span>
                <span className="text-border text-xs">·</span>
                <span className="text-muted-foreground text-xs">
                  Since {fmtDate(borrower.created_at)}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                {borrower.isConfirmed ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs text-emerald-400">Account active</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs text-amber-400">Invitation pending</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Expense Tab action */}
          <div className="border-border/60 mt-4 border-t pt-4">
            {borrower.expenseTab ? (
              <button
                type="button"
                onClick={() => void navigate(`/tabs/${borrower.expenseTab!.id}`)}
                className="text-primary hover:bg-primary/10 border-primary/20 flex w-full items-center justify-between rounded-xl border px-4 py-3 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Receipt className="h-4 w-4" />
                  <span className="text-sm font-medium">{borrower.expenseTab.title}</span>
                  <span className="text-muted-foreground text-xs">
                    · {borrower.expenseTab.currency}
                  </span>
                </div>
                <span className="text-muted-foreground text-xs">Open tab →</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowCreateTab(true)}
                className="border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 flex w-full items-center gap-2.5 rounded-xl border border-dashed px-4 py-3 text-sm transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add to Expense Tab
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Loans ───────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground text-sm font-semibold">
            Loans
            {borrower.loans.length > 0 && (
              <span className="text-muted-foreground ml-2 font-normal">
                ({borrower.loans.length})
              </span>
            )}
          </h2>
          {borrower.loans.length > 0 && (
            <button
              type="button"
              onClick={() => void navigate("/loans")}
              className="text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              View all →
            </button>
          )}
        </div>

        {borrower.loans.length === 0 ? (
          <div className="border-border/60 bg-card rounded-xl border px-4 py-10 text-center">
            <CreditCard className="text-muted-foreground mx-auto mb-2 h-6 w-6" />
            <p className="text-muted-foreground text-sm">No loans yet.</p>
          </div>
        ) : (
          <motion.div
            className="space-y-2"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
            initial="hidden"
            animate="visible"
          >
            {borrower.loans.slice(0, 6).map((loan) => (
              <motion.button
                key={loan.id}
                variants={cardVariants}
                type="button"
                onClick={() => void navigate(`/loans/${loan.id}`)}
                className="bg-card border-border/60 hover:bg-muted/30 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm font-medium">{loan.source_name}</p>
                  <p className="text-muted-foreground text-xs">
                    {LOAN_TYPE_LABEL[loan.loan_type] ?? loan.loan_type} · {fmtDate(loan.started_at)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-foreground text-sm font-semibold tabular-nums">
                    {fmt(loan.principal, loan.currency)}
                  </span>
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 text-[10px] font-medium",
                      STATUS_STYLES[loan.status]
                    )}
                  >
                    {loan.status}
                  </span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}

        {activeLoans.length > 0 && (
          <div className="text-muted-foreground text-xs">
            {activeLoans.length} active loan{activeLoans.length !== 1 ? "s" : ""}
          </div>
        )}
      </section>

      {/* Create Tab Modal */}
      {showCreateTab && (
        <CreateTabModal
          borrowerId={id!}
          defaultCurrency={defaultCurrency}
          borrowerName={borrower.full_name}
          onClose={() => setShowCreateTab(false)}
          onCreated={(tabId) => void navigate(`/tabs/${tabId}`)}
        />
      )}

      {/* Loan Statement Drawer */}
      <LoanStatementDrawer
        borrowerId={showStatement ? (id ?? null) : null}
        borrowerName={borrower.full_name}
        onClose={() => setShowStatement(false)}
      />
    </div>
  );
}
