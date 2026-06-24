import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatCurrency";
import { getLoanDisplayLabel } from "@/lib/loanLabels";
import { formatDueRelativeLabel, getDueDateUrgency } from "@/lib/dueDateUtils";
import { DueDateBadge } from "@/components/ui/due-date-badge";
import type { UpcomingInstallment } from "@/hooks/useUpcomingInstallments";

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="bg-muted h-10 w-10 animate-pulse rounded-lg" />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="bg-muted h-3.5 w-36 animate-pulse rounded" />
        <div className="bg-muted h-3 w-24 animate-pulse rounded" />
      </div>
      <div className="space-y-1.5 text-right">
        <div className="bg-muted ml-auto h-3.5 w-16 animate-pulse rounded" />
        <div className="bg-muted ml-auto h-3 w-12 animate-pulse rounded" />
      </div>
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
                  const { urgency } = getDueDateUrgency(inst.due_date, inst.status);
                  const relativeLabel = formatDueRelativeLabel(inst.due_date);
                  const loanLabel = getLoanDisplayLabel(inst.source_name, inst.loan_type);
                  const isUrgent = urgency === "overdue" || urgency === "urgent";

                  return (
                    <div key={inst.id} className="flex items-center gap-3 px-4 py-3">
                      <DueDateBadge dueDate={inst.due_date} status={inst.status} />

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate text-sm font-medium">{loanLabel}</p>
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
                        <p className="text-foreground text-sm font-semibold tabular-nums">
                          {formatCurrency(inst.amount, inst.currency)}
                        </p>
                        <p
                          className={cn(
                            "text-xs tabular-nums",
                            inst.status === "pending"
                              ? "font-medium text-amber-400"
                              : isUrgent
                                ? "font-medium text-rose-400"
                                : "text-muted-foreground"
                          )}
                        >
                          {relativeLabel}
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
