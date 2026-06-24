import { cn } from "@/lib/utils";
import { getDueDateUrgency, parseDueDate } from "@/lib/dueDateUtils";
import type { PaymentStatus } from "@/types/enums";

const urgencyStyles = {
  pending: {
    shell: "border-amber-500/30 bg-amber-500/10",
    header: "bg-amber-500/25 text-amber-300",
    day: "text-amber-100",
  },
  overdue: {
    shell: "border-rose-500/35 bg-rose-500/10",
    header: "bg-rose-500/30 text-rose-200",
    day: "text-rose-100",
  },
  urgent: {
    shell: "border-orange-500/30 bg-orange-500/10",
    header: "bg-orange-500/25 text-orange-200",
    day: "text-orange-100",
  },
  normal: {
    shell: "border-border/60 bg-muted/40",
    header: "bg-primary/15 text-primary",
    day: "text-foreground",
  },
} as const;

interface DueDateBadgeProps {
  dueDate: string;
  status?: PaymentStatus;
  className?: string;
}

/** Mini calendar tile — month header + day number, tinted by urgency. */
export function DueDateBadge({ dueDate, status, className }: DueDateBadgeProps) {
  const date = parseDueDate(dueDate);
  const { urgency } = getDueDateUrgency(dueDate, status);
  const styles = urgencyStyles[urgency];

  const monthLabel = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const dayLabel = date.getDate();

  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 flex-col overflow-hidden rounded-lg border text-center",
        styles.shell,
        className
      )}
      aria-label={`Due ${monthLabel} ${dayLabel}`}
    >
      <div
        className={cn(
          "flex h-3.5 items-center justify-center text-[8px] leading-none font-bold tracking-wide",
          styles.header
        )}
      >
        {monthLabel}
      </div>
      <div
        className={cn(
          "flex flex-1 items-center justify-center text-sm leading-none font-semibold tabular-nums",
          styles.day
        )}
      >
        {dayLabel}
      </div>
    </div>
  );
}
