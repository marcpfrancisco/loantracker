import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  FileText,
  Download,
  TableProperties,
  CheckCircle2,
  Clock,
  Ban,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBorrowerStatement } from "@/hooks/useBorrowerStatement";
import type { StatementLoan } from "@/hooks/useBorrowerStatement";
import { exportStatementCSV, printStatementPDF } from "@/lib/statementExport";
import { RegionBadge } from "@/components/ui/region-badge";
import type { PaymentStatus, LoanStatus } from "@/types/database";

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Status badges ─────────────────────────────────────────────────────────────

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  unpaid: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

const PAYMENT_STATUS_ICON: Record<PaymentStatus, React.ReactNode> = {
  paid: <CheckCircle2 className="h-3 w-3" />,
  pending: <Clock className="h-3 w-3" />,
  unpaid: <Ban className="h-3 w-3" />,
};

const LOAN_STATUS_STYLES: Record<LoanStatus, string> = {
  active: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  defaulted: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

const LOAN_TYPE_LABEL: Record<string, string> = {
  maribank_credit: "Maribank Credit",
  sloan: "S-Loan",
  gloan: "G-Loan",
  spaylater: "SPayLater",
  tabby: "Tabby",
  credit_card: "Credit Card",
  lazcredit: "LazCredit",
  custom: "Custom",
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

function StatementSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="bg-muted h-24 w-full animate-pulse rounded-xl" />
      <div className="bg-muted h-48 w-full animate-pulse rounded-xl" />
      <div className="bg-muted h-48 w-full animate-pulse rounded-xl" />
    </div>
  );
}

// ── Loan section ──────────────────────────────────────────────────────────────

function LoanSection({ loan, index }: { loan: StatementLoan; index: number }) {
  return (
    <div className="bg-card border-border/60 overflow-hidden rounded-xl border">
      {/* Loan header */}
      <div className="border-border/60 flex flex-wrap items-center gap-2.5 border-b px-4 py-3">
        <span className="text-foreground text-sm font-semibold">
          Loan {index + 1} — {loan.credit_source.name}
        </span>
        <span className="text-muted-foreground text-xs">
          {LOAN_TYPE_LABEL[loan.loan_type] ?? loan.loan_type}
        </span>
        <span
          className={cn(
            "ml-auto rounded-full border px-2 py-0.5 text-[10px] font-semibold",
            LOAN_STATUS_STYLES[loan.status]
          )}
        >
          {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
        </span>
      </div>

      {/* Financial summary row */}
      <div className="border-border/30 flex flex-wrap gap-x-5 gap-y-2 border-b px-4 py-3">
        {[
          { label: "Principal", value: fmt(loan.principal, loan.currency), className: "" },
          loan.interest_rate !== null && {
            label: "Rate",
            value: `${loan.interest_rate}%`,
            className: "",
          },
          loan.service_fee > 0 && {
            label: "Fee",
            value: fmt(loan.service_fee, loan.currency),
            className: "",
          },
          {
            label: "Total",
            value: fmt(loan.totalRepayable, loan.currency),
            className: "font-semibold text-foreground",
          },
          {
            label: "Paid",
            value: fmt(loan.totalPaid, loan.currency),
            className: "text-emerald-400",
          },
          {
            label: "Outstanding",
            value: fmt(loan.totalOutstanding, loan.currency),
            className: loan.totalOutstanding > 0 ? "text-amber-400" : "text-emerald-400",
          },
          { label: "Started", value: fmtDate(loan.started_at), className: "" },
          loan.ended_at && { label: "Ended", value: fmtDate(loan.ended_at), className: "" },
        ]
          .filter(Boolean)
          .map((item) => {
            if (!item) return null;
            return (
              <div key={item.label} className="flex items-baseline gap-1.5">
                <span className="text-muted-foreground text-[11px]">{item.label}</span>
                <span className={cn("text-foreground text-xs font-medium", item.className)}>
                  {item.value}
                </span>
              </div>
            );
          })}
      </div>

      {/* Installments table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted/30">
              {["#", "Due Date", "Amount", "Status", "Paid Date"].map((h) => (
                <th
                  key={h}
                  className="text-muted-foreground px-4 py-2 text-[10px] font-semibold tracking-wider uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loan.installments.map((inst) => (
              // Override amount format with correct currency per loan
              <tr
                key={inst.id}
                className={cn(
                  "border-border/30 border-b last:border-0",
                  inst.status === "paid" && "opacity-60"
                )}
              >
                <td className="text-muted-foreground px-4 py-2.5 text-center text-xs">
                  {inst.installment_no}
                </td>
                <td className="text-foreground px-4 py-2.5 text-xs">{fmtDate(inst.due_date)}</td>
                <td className="text-foreground px-4 py-2.5 text-right text-xs font-semibold tabular-nums">
                  {fmt(inst.amount, loan.currency)}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      PAYMENT_STATUS_STYLES[inst.status]
                    )}
                  >
                    {PAYMENT_STATUS_ICON[inst.status]}
                    {inst.status.charAt(0).toUpperCase() + inst.status.slice(1)}
                  </span>
                </td>
                <td className="text-muted-foreground px-4 py-2.5 text-xs">
                  {inst.paid_at ? fmtDate(inst.paid_at) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface LoanStatementDrawerProps {
  borrowerId: string | null;
  borrowerName: string;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LoanStatementDrawer({
  borrowerId,
  borrowerName,
  onClose,
}: LoanStatementDrawerProps) {
  const isOpen = !!borrowerId;
  const { data: statement, isLoading, error } = useBorrowerStatement(borrowerId);

  const hasPHP = (statement?.summary.PHP.principal ?? 0) > 0;
  const hasAED = (statement?.summary.AED.principal ?? 0) > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel — slides from right on desktop, bottom on mobile */}
          <motion.div
            key="panel"
            className="bg-background fixed inset-y-0 right-0 z-50 flex w-full flex-col shadow-2xl md:w-[680px]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
          >
            {/* ── Sticky header ───────────────────────────────────────── */}
            <div className="border-border/60 bg-background/95 flex shrink-0 items-center gap-3 border-b px-5 py-4 backdrop-blur-sm">
              <div className="bg-primary/10 border-border flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border">
                <FileText className="text-primary h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate text-sm font-semibold">Loan Statement</p>
                <p className="text-muted-foreground truncate text-xs">{borrowerName}</p>
              </div>

              {/* Action buttons */}
              <div className="flex shrink-0 items-center gap-2">
                {statement && (
                  <>
                    <button
                      type="button"
                      onClick={() => exportStatementCSV(statement)}
                      className="text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-border flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-xs font-medium transition-colors"
                    >
                      <TableProperties className="h-3.5 w-3.5" />
                      CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => printStatementPDF(statement)}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/50 ml-1 flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ── Scrollable content ───────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
              {isLoading && <StatementSkeleton />}

              {error && (
                <div className="m-6 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Failed to load statement.
                </div>
              )}

              {statement && (
                <div className="space-y-6 p-6">
                  {/* Borrower info strip */}
                  <div className="border-border/60 bg-muted/30 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border px-5 py-4">
                    <div>
                      <p className="text-muted-foreground text-[10px] tracking-widest uppercase">
                        Borrower
                      </p>
                      <p className="text-foreground mt-0.5 text-sm font-semibold">
                        {statement.borrower.full_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[10px] tracking-widest uppercase">
                        Region
                      </p>
                      <div className="mt-1">
                        <RegionBadge region={statement.borrower.region} />
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[10px] tracking-widest uppercase">
                        Total Loans
                      </p>
                      <p className="text-foreground mt-0.5 text-sm font-medium">
                        {statement.loans.length}
                      </p>
                    </div>
                    <div className="ml-auto">
                      <p className="text-muted-foreground text-[10px] tracking-widest uppercase">
                        Generated
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {statement.generatedAt}
                      </p>
                    </div>
                  </div>

                  {/* Loan sections */}
                  {statement.loans.length === 0 ? (
                    <div className="border-border/60 bg-card rounded-xl border px-4 py-12 text-center">
                      <p className="text-muted-foreground text-sm">
                        No loans found for this borrower.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                        Loans
                      </p>
                      {statement.loans.map((loan, i) => (
                        <LoanSection key={loan.id} loan={loan} index={i} />
                      ))}
                    </div>
                  )}

                  {/* Summary totals */}
                  {statement.loans.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                        Summary
                      </p>
                      <div className="bg-card border-border/60 overflow-hidden rounded-xl border">
                        {(
                          [
                            hasPHP && {
                              label: "Total Principal (PHP)",
                              value: fmt(statement.summary.PHP.principal, "PHP"),
                              bold: false,
                            },
                            hasPHP && {
                              label: "Total Paid (PHP)",
                              value: fmt(statement.summary.PHP.paid, "PHP"),
                              color: "text-emerald-400",
                              bold: false,
                            },
                            hasPHP && {
                              label: "Outstanding (PHP)",
                              value: fmt(statement.summary.PHP.outstanding, "PHP"),
                              color:
                                statement.summary.PHP.outstanding > 0
                                  ? "text-amber-400"
                                  : "text-emerald-400",
                              bold: true,
                            },
                            hasAED && {
                              label: "Total Principal (AED)",
                              value: fmt(statement.summary.AED.principal, "AED"),
                              bold: false,
                            },
                            hasAED && {
                              label: "Total Paid (AED)",
                              value: fmt(statement.summary.AED.paid, "AED"),
                              color: "text-emerald-400",
                              bold: false,
                            },
                            hasAED && {
                              label: "Outstanding (AED)",
                              value: fmt(statement.summary.AED.outstanding, "AED"),
                              color:
                                statement.summary.AED.outstanding > 0
                                  ? "text-amber-400"
                                  : "text-emerald-400",
                              bold: true,
                            },
                          ] as Array<
                            { label: string; value: string; color?: string; bold: boolean } | false
                          >
                        )
                          .filter(Boolean)
                          .map((row) => {
                            if (!row) return null;
                            return (
                              <div
                                key={row.label}
                                className="border-border/40 flex items-center justify-between border-b px-5 py-3 last:border-0"
                              >
                                <span className="text-muted-foreground text-sm">{row.label}</span>
                                <span
                                  className={cn(
                                    "text-sm tabular-nums",
                                    row.bold ? "font-bold" : "font-medium",
                                    row.color ?? "text-foreground"
                                  )}
                                >
                                  {row.value}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Bottom padding */}
                  <div className="h-4" />
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
