import { CalendarClock, Clock } from "lucide-react";
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
}

export function UpcomingPayments({ installments, loading }: UpcomingPaymentsProps) {
  return (
    <div className="bg-card border-border/60 overflow-hidden rounded-xl border">
      {/* Header */}
      <div className="border-border/60 flex items-center gap-2.5 border-b px-4 py-3.5">
        <CalendarClock className="text-muted-foreground h-4 w-4" />
        <h2 className="text-foreground text-sm font-semibold">Upcoming Payments</h2>
      </div>

      {/* Body */}
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
                    Installment #{inst.installment_no}
                    {inst.status === "pending" && (
                      <span className="text-amber-400 ml-1">· pending review</span>
                    )}
                  </p>
                </div>

                {/* Amount + due */}
                <div className="shrink-0 text-right">
                  <p className="text-foreground text-sm font-semibold">
                    {formatCurrency(inst.amount, inst.currency)}
                  </p>
                  <p className={cn("text-xs", urgent ? "font-medium text-rose-400" : "text-muted-foreground")}>
                    {label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
