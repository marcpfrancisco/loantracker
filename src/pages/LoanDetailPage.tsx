import { useParams, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft, AlertCircle, User, MapPin, Calendar, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { cardVariants } from "@/lib/animations";
import { useAuth } from "@/hooks/useAuth";
import { useLoanDetail } from "@/hooks/useLoanDetail";
import { useUpdateInstallment } from "@/hooks/useUpdateInstallment";
import { useUpdateLoanStatus } from "@/hooks/useUpdateLoanStatus";
import { InstallmentRow } from "@/components/loans/InstallmentRow";
import type { LoanStatus, LoanType, CreditSourceType, PaymentStatus } from "@/types/database";

// ── Lookup maps ───────────────────────────────────────────────────────────────

const loanTypeLabels: Record<LoanType, string> = {
  tabby:       "Tabby",
  sloan:       "SLoan",
  gloan:       "GLoan",
  spaylater:   "SPayLater",
  credit_card: "Credit Card",
  custom:      "Custom",
};

const sourceTypeLabels: Record<CreditSourceType, string> = {
  e_wallet:      "E-Wallet",
  credit_card:   "Credit Card",
  bnpl:          "BNPL",
  bank_transfer: "Bank Transfer",
};

const loanStatusStyles: Record<LoanStatus, string> = {
  active:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  completed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  defaulted: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <div className="bg-muted h-5 w-16 animate-pulse rounded" />
      <div className="bg-card border-border/60 space-y-4 rounded-xl border p-5">
        <div className="bg-muted h-5 w-40 animate-pulse rounded" />
        <div className="bg-muted h-8 w-48 animate-pulse rounded" />
        <div className="bg-muted h-1.5 w-full animate-pulse rounded-full" />
      </div>
      <div className="bg-card border-border/60 rounded-xl border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-border/40 flex items-center gap-3 border-b px-4 py-3">
            <div className="bg-muted h-7 w-7 animate-pulse rounded-full" />
            <div className="flex-1 space-y-1.5">
              <div className="bg-muted h-4 w-28 animate-pulse rounded" />
            </div>
            <div className="bg-muted h-4 w-16 animate-pulse rounded" />
            <div className="bg-muted h-7 w-20 animate-pulse rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const { data: loan, isLoading, error } = useLoanDetail(id);
  const { mutate: updateInstallment, isPending: updatingInstallment, variables: updatingVars } =
    useUpdateInstallment(id ?? "");
  const { mutate: updateLoanStatus, isPending: updatingStatus } = useUpdateLoanStatus(id ?? "");

  if (isLoading) return <PageSkeleton />;

  if (error || !loan) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="border-rose-500/30 bg-rose-500/10 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error ? "Failed to load loan. Please try again." : "Loan not found."}
        </div>
      </div>
    );
  }

  // Derived stats
  const interest = loan.interest_rate !== null ? loan.principal * (loan.interest_rate / 100) : 0;
  const totalPayable = loan.principal + interest + loan.service_fee;
  const paidInstallments = loan.installments.filter((i) => i.status === "paid");
  const paidAmount = paidInstallments.reduce((sum, i) => sum + i.amount, 0);
  const progress = loan.installments_total > 0 ? paidInstallments.length / loan.installments_total : 0;

  const allPaid = paidInstallments.length === loan.installments_total;

  function handleInstallmentUpdate(installmentId: string, status: PaymentStatus) {
    updateInstallment({ id: installmentId, status, loanId: id ?? "" });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      {/* Back button */}
      <button
        onClick={() => void navigate("/loans")}
        className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Loans
      </button>

      {/* ── Loan summary card ─────────────────────────────────── */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="bg-card border-border/60 space-y-4 rounded-xl border p-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-foreground font-semibold">{loan.credit_source.name}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {sourceTypeLabels[loan.credit_source.type]} · {loanTypeLabels[loan.loan_type]}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium capitalize",
              loanStatusStyles[loan.status]
            )}
          >
            {loan.status}
          </span>
        </div>

        {/* Principal */}
        <div>
          <p className="text-foreground text-3xl font-semibold tracking-tight">
            {formatCurrency(loan.principal, loan.currency)}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">{loan.currency} · principal</p>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {paidInstallments.length} / {loan.installments_total} installments paid
            </span>
            <span className="text-muted-foreground">{Math.round(progress * 100)}%</span>
          </div>
          <div className="bg-muted h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {/* Metadata grid */}
        <div className="border-border/40 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4">
          {isAdmin && loan.borrower && (
            <div className="flex items-center gap-2">
              <User className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
              <div>
                <p className="text-muted-foreground text-[10px]">Borrower</p>
                <p className="text-foreground text-xs font-medium">{loan.borrower.full_name}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <MapPin className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            <div>
              <p className="text-muted-foreground text-[10px]">Region</p>
              <p className="text-foreground text-xs font-medium">
                {loan.region === "PH" ? "🇵🇭 Philippines" : "🇦🇪 UAE"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            <div>
              <p className="text-muted-foreground text-[10px]">Started</p>
              <p className="text-foreground text-xs font-medium">{formatDate(loan.started_at)}</p>
            </div>
          </div>
          {loan.interest_rate !== null && (
            <div>
              <p className="text-muted-foreground text-[10px]">Interest</p>
              <p className="text-foreground text-xs font-medium">{loan.interest_rate}%</p>
            </div>
          )}
          {loan.service_fee > 0 && (
            <div>
              <p className="text-muted-foreground text-[10px]">Service Fee</p>
              <p className="text-foreground text-xs font-medium">
                {formatCurrency(loan.service_fee, loan.currency)}
              </p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground text-[10px]">Total Payable</p>
            <p className="text-foreground text-xs font-medium">
              {formatCurrency(totalPayable, loan.currency)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-[10px]">Paid So Far</p>
            <p className="text-xs font-medium text-emerald-400">
              {formatCurrency(paidAmount, loan.currency)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-[10px]">Remaining</p>
            <p className="text-foreground text-xs font-medium">
              {formatCurrency(totalPayable - paidAmount, loan.currency)}
            </p>
          </div>
        </div>

        {/* Notes */}
        {loan.notes && (
          <div className="border-border/40 flex items-start gap-2 border-t pt-3">
            <FileText className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p className="text-muted-foreground text-xs">{loan.notes}</p>
          </div>
        )}
      </motion.div>

      {/* ── Admin: loan status actions ────────────────────────── */}
      {isAdmin && loan.status === "active" && (
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="bg-card border-border/60 rounded-xl border p-4"
        >
          <p className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">
            Loan Actions
          </p>
          <div className="flex flex-wrap gap-2">
            {allPaid && (
              <button
                onClick={() => updateLoanStatus({ id: loan.id, status: "completed" })}
                disabled={updatingStatus}
                className="cursor-pointer rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/20 disabled:opacity-50"
              >
                Mark Completed
              </button>
            )}
            <button
              onClick={() => updateLoanStatus({ id: loan.id, status: "defaulted" })}
              disabled={updatingStatus}
              className="cursor-pointer rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
            >
              Mark Defaulted
            </button>
            <button
              onClick={() => updateLoanStatus({ id: loan.id, status: "cancelled" })}
              disabled={updatingStatus}
              className="border-border/60 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
            >
              Cancel Loan
            </button>
          </div>
        </motion.div>
      )}

      {/* Reopen for non-active admin */}
      {isAdmin && loan.status !== "active" && loan.status !== "cancelled" && (
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="bg-card border-border/60 rounded-xl border p-4"
        >
          <p className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">
            Loan Actions
          </p>
          <button
            onClick={() => updateLoanStatus({ id: loan.id, status: "active" })}
            disabled={updatingStatus}
            className="cursor-pointer rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
          >
            Reopen Loan
          </button>
        </motion.div>
      )}

      {/* ── Installments list ─────────────────────────────────── */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="bg-card border-border/60 overflow-hidden rounded-xl border"
      >
        <div className="border-border/60 flex items-center justify-between border-b px-4 py-3.5">
          <h2 className="text-foreground text-sm font-semibold">Installments</h2>
          <span className="text-muted-foreground text-xs">
            {paidInstallments.length} of {loan.installments_total} paid
          </span>
        </div>

        {loan.installments.length === 0 ? (
          <div className="text-muted-foreground px-4 py-10 text-center text-sm">
            No installments found.
          </div>
        ) : (
          loan.installments.map((inst) => (
            <InstallmentRow
              key={inst.id}
              installment={inst}
              currency={loan.currency}
              loanId={loan.id}
              isAdmin={isAdmin}
              onUpdate={handleInstallmentUpdate}
              isUpdating={updatingInstallment && updatingVars?.id === inst.id}
            />
          ))
        )}
      </motion.div>
    </div>
  );
}
