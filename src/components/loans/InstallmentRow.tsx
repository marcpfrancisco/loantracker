import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SubmitPaymentModal } from "@/components/loans/SubmitPaymentModal";
import { ReviewProofModal } from "@/components/loans/ReviewProofModal";
import type { InstallmentDetail } from "@/hooks/useLoanDetail";
import type { PaymentStatus, CurrencyType } from "@/types/enums";

interface InstallmentRowProps {
  installment: InstallmentDetail;
  currency: CurrencyType;
  loanId: string;
  isAdmin: boolean;
  onUpdate: (id: string, status: PaymentStatus) => void;
  isUpdating: boolean;
  // Bulk selection
  bulkMode?: boolean;
  isSelected?: boolean;
  isEligible?: boolean;
  onToggle?: () => void;
}

const statusStyles: Record<PaymentStatus, string> = {
  unpaid: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  pending: "bg-primary/15 text-primary border-primary/30",
  paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

const statusLabels: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  pending: "Pending",
  paid: "Paid",
};

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isOverdue(dueDate: string, status: PaymentStatus): boolean {
  if (status !== "unpaid") return false;
  return new Date(dueDate + "T00:00:00") < new Date(new Date().toDateString());
}

type ActionVariant = "primary" | "success" | "ghost";

interface RowAction {
  label: string;
  nextStatus: PaymentStatus | null;
  variant: ActionVariant;
  opensModal?: "submit" | "review";
}

function resolveAction(status: PaymentStatus, isAdmin: boolean): RowAction | null {
  if (isAdmin) {
    if (status === "pending")
      return { label: "Review", nextStatus: null, variant: "primary", opensModal: "review" };
    if (status === "paid") return { label: "Revert", nextStatus: "unpaid", variant: "ghost" };
    if (status === "unpaid") return { label: "Mark Paid", nextStatus: "paid", variant: "success" };
  } else {
    if (status === "unpaid")
      return {
        label: "Submit Payment",
        nextStatus: null,
        variant: "primary",
        opensModal: "submit",
      };
  }
  return null;
}

const actionStyles: Record<ActionVariant, string> = {
  primary: "bg-primary/15 text-primary hover:bg-primary/25",
  success: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm",
  ghost: "border border-border/60 text-muted-foreground hover:text-foreground hover:border-border",
};

export function InstallmentRow({
  installment,
  currency,
  loanId,
  isAdmin,
  onUpdate,
  isUpdating,
  bulkMode = false,
  isSelected = false,
  isEligible = false,
  onToggle,
}: InstallmentRowProps) {
  const [submitOpen, setSubmitOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const overdue = isOverdue(installment.due_date, installment.status);
  const action = resolveAction(installment.status, isAdmin);

  return (
    <>
      <div
        onClick={bulkMode && isEligible ? onToggle : undefined}
        className={cn(
          "border-border/40 flex items-center gap-3 border-b px-4 py-3 last:border-0",
          overdue && !bulkMode && "bg-rose-500/5",
          bulkMode && isEligible && "cursor-pointer",
          bulkMode && isSelected && "bg-primary/5",
          bulkMode && !isEligible && "opacity-40"
        )}
      >
        {/* Number circle OR checkbox in bulk mode */}
        {bulkMode ? (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center">
            <div
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                isEligible
                  ? isSelected
                    ? "bg-primary border-primary"
                    : "border-border/60 bg-transparent"
                  : "border-border/40 bg-transparent"
              )}
            >
              {isSelected && (
                <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 text-white" fill="currentColor">
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
          </div>
        ) : (
          <div className="bg-muted text-muted-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {installment.installment_no}
          </div>
        )}

        {/* Date + overdue / paid date */}
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-medium", overdue ? "text-rose-400" : "text-foreground")}>
            {formatDate(installment.due_date)}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5">
            {overdue && <span className="text-xs font-medium text-rose-400">Overdue</span>}
            {installment.paid_at && (
              <span className="text-muted-foreground text-xs">
                Paid {formatDate(installment.paid_at.split("T")[0])}
              </span>
            )}
          </div>
        </div>

        {/* Amount */}
        <p className="text-foreground shrink-0 text-sm font-semibold">
          {formatCurrency(installment.amount, currency)}
        </p>

        {/* Status badge — hidden on mobile when action is present */}
        <span
          className={cn(
            "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium",
            action ? "hidden sm:inline-block" : "inline-block",
            statusStyles[installment.status]
          )}
        >
          {statusLabels[installment.status]}
        </span>

        {/* Action button — hidden in bulk mode */}
        {!bulkMode &&
          (action ? (
            <button
              onClick={() => {
                if (action.opensModal === "submit") setSubmitOpen(true);
                else if (action.opensModal === "review") setReviewOpen(true);
                else if (action.nextStatus) onUpdate(installment.id, action.nextStatus);
              }}
              disabled={isUpdating}
              className={cn(
                "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                actionStyles[action.variant]
              )}
            >
              {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : action.label}
            </button>
          ) : (
            /* Status dot for mobile — paid/pending rows with no action */
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full sm:hidden",
                installment.status === "paid"
                  ? "bg-emerald-400"
                  : installment.status === "pending"
                    ? "bg-primary"
                    : "bg-zinc-500"
              )}
            />
          ))}
      </div>

      {/* Borrower: upload proof */}
      <SubmitPaymentModal
        installmentId={installment.id}
        installmentNo={installment.installment_no}
        loanId={loanId}
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
      />

      {/* Admin: review proof */}
      <ReviewProofModal
        installmentId={installment.id}
        installmentNo={installment.installment_no}
        loanId={loanId}
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
      />
    </>
  );
}
