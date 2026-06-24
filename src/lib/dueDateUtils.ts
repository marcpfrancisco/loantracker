import type { PaymentStatus } from "@/types/enums";

export type DueDateUrgency = "pending" | "overdue" | "urgent" | "normal";

export function parseDueDate(dateStr: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(y, mo - 1, d);
}

export function getDueDateUrgency(
  dateStr: string,
  status?: PaymentStatus
): { urgency: DueDateUrgency; diffDays: number } {
  const date = parseDueDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (status === "pending") {
    return { urgency: "pending", diffDays };
  }

  if (diffDays < 0) return { urgency: "overdue", diffDays };
  if (diffDays <= 3) return { urgency: "urgent", diffDays };
  return { urgency: "normal", diffDays };
}

export function formatDueRelativeLabel(dateStr: string): string {
  const { diffDays } = getDueDateUrgency(dateStr);

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 3) return `In ${diffDays} days`;

  return parseDueDate(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
