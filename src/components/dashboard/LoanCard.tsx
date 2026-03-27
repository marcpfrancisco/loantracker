import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { CalendarClock, ChevronRight, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { cardVariants } from "@/lib/animations";
import type { LoanStatus, CreditSourceType } from "@/types/database";

export interface LoanCardData {
  id: string;
  currency: string;
  principal: number;
  installments_total: number;
  status: LoanStatus;
  credit_source: { name: string; type: CreditSourceType };
  paidCount: number;
  pendingCount: number;
  nextDueDate: string | null;
}

const statusStyles: Record<LoanStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  completed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  defaulted: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

const sourceTypeLabels: Record<CreditSourceType, string> = {
  e_wallet: "E-Wallet",
  credit_card: "Credit Card",
  bnpl: "BNPL",
  bank_transfer: "Bank Transfer",
};

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays <= 7) return `Due in ${diffDays}d`;
  return `Due ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

interface LoanCardProps {
  loan: LoanCardData;
  borrowerName?: string;
}

export function LoanCard({ loan, borrowerName }: LoanCardProps) {
  const navigate = useNavigate();
  const progress = loan.installments_total > 0 ? loan.paidCount / loan.installments_total : 0;
  const isOverdue =
    loan.nextDueDate !== null &&
    new Date(loan.nextDueDate + "T00:00:00") < new Date(new Date().toDateString());

  return (
    <motion.button
      variants={cardVariants}
      onClick={() => void navigate(`/loans/${loan.id}`)}
      className="bg-card border-border/60 hover:border-border group flex w-full cursor-pointer flex-col gap-4 rounded-xl border p-4 text-left transition-colors"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-foreground truncate font-semibold">{loan.credit_source.name}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {sourceTypeLabels[loan.credit_source.type]}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              "rounded border px-1.5 py-0.5 text-[10px] font-medium capitalize",
              statusStyles[loan.status]
            )}
          >
            {loan.status}
          </span>
          <ChevronRight className="text-muted-foreground/50 group-hover:text-muted-foreground h-4 w-4 transition-colors" />
        </div>
      </div>

      {/* Borrower name — admin view only */}
      {borrowerName && (
        <div className="flex items-center gap-1.5">
          <User className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          <span className="text-muted-foreground truncate text-xs">{borrowerName}</span>
        </div>
      )}

      {/* Principal */}
      <div>
        <p className="text-foreground text-xl font-semibold tracking-tight">
          {formatCurrency(loan.principal, loan.currency)}
        </p>
        <p className="text-muted-foreground text-xs">{loan.currency} · principal</p>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {loan.paidCount} / {loan.installments_total} paid
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

      {/* Footer — next due / pending */}
      {loan.status === "active" && (
        <div className="flex items-center gap-1.5">
          <CalendarClock
            className={cn("h-3.5 w-3.5", isOverdue ? "text-rose-400" : "text-muted-foreground")}
          />
          <span
            className={cn(
              "text-xs",
              isOverdue ? "font-medium text-rose-400" : "text-muted-foreground"
            )}
          >
            {loan.nextDueDate ? formatDueDate(loan.nextDueDate) : "All installments submitted"}
          </span>
          {loan.pendingCount > 0 && (
            <span className="bg-amber-500/15 text-amber-400 ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium">
              {loan.pendingCount} pending review
            </span>
          )}
        </div>
      )}
    </motion.button>
  );
}
