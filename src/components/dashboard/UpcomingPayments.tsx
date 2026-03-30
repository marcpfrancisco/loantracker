import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, ChevronDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UpcomingInstallment } from "@/hooks/useUpcomingInstallments";

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDueDate(dateStr: string): { label: string; urgent: boolean } {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, urgent: true };
  if (diffDays === 0) return { label: "Today", urgent: true };
  if (diffDays === 1) return { label: "Tomorrow", urgent: true };
  if (diffDays <= 3) return { label: `In ${diffDays} days`, urgent: true };
  return {
    label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    urgent: false,
  };
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="bg-muted h-8 w-8 animate-pulse rounded-lg" />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="bg-muted h-3.5 w-28 animate-pulse rounded" />
        <div className="bg-muted h-3 w-20 animate-pulse rounded" />
      </div>
      <div className="bg-muted h-3.5 w-16 animate-pulse rounded" />
    </div>
  );
}

interface UpcomingPaymentsProps {
  installments: UpcomingInstallment[];
  loading?: boolean;
  showBorrower?: boolean;
}

export function UpcomingPayments({ installments, loading, showBorrower }: UpcomingPaymentsProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-card border-border/60 overflow-hidden rounded-xl border">
      {/* Header — click to collapse */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="border-border/60 hover:bg-muted/30 flex w-full cursor-pointer items-center gap-2.5 border-b px-4 py-3.5 transition-colors"
      >
        <CalendarClock className="text-muted-foreground h-4 w-4 shrink-0" />
        <h2 className="text-foreground flex-1 text-left text-sm font-semibold">
          Upcoming Payments
        </h2>

        {!loading && installments.length > 0 && (
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
            {installments.length}
          </span>
        )}

        <ChevronDown
          className={cn(
            "text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-200",
            isOpen ? "rotate-0" : "-rotate-90"
          )}
        />
      </button>

      {/* Collapsible body */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            {loading ? (
              <div className="divide-border/40 divide-y">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            ) : installments.length === 0 ? (
              <div className="text-muted-foreground px-4 py-10 text-center text-sm">
                No upcoming payments.
              </div>
            ) : (
              <div className="divide-border/40 divide-y">
                {installments.map((inst) => {
                  const { label, urgent } = formatDueDate(inst.due_date);
                  return (
                    <div key={inst.id} className="flex items-center gap-3 px-4 py-3">
                      {/* Icon */}
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          inst.status === "pending"
                            ? "bg-amber-500/15 text-amber-400"
                            : urgent
                              ? "bg-rose-500/15 text-rose-400"
                              : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Clock className="h-4 w-4" />
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate text-sm font-medium">
                          {inst.source_name}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {showBorrower && inst.borrower_name ? (
                            <span className="text-foreground/70">{inst.borrower_name} · </span>
                          ) : null}
                          Installment #{inst.installment_no}
                          {inst.status === "pending" && (
                            <span className="ml-1 text-amber-400">· pending review</span>
                          )}
                        </p>
                      </div>

                      {/* Amount + due */}
                      <div className="shrink-0 text-right">
                        <p className="text-foreground text-sm font-semibold">
                          {formatCurrency(inst.amount, inst.currency)}
                        </p>
                        <p
                          className={cn(
                            "text-xs",
                            urgent ? "font-medium text-rose-400" : "text-muted-foreground"
                          )}
                        >
                          {label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed summary pill */}
      {!isOpen && !loading && installments.length > 0 && (
        <div className="px-4 py-2.5">
          <p className="text-muted-foreground text-xs">
            {installments.length} payment{installments.length !== 1 ? "s" : ""} upcoming
          </p>
        </div>
      )}
    </div>
  );
}
