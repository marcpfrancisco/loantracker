import { Crown } from "lucide-react";

interface PlanBadgeProps {
  plan: string;
  className?: string;
}

const PLAN_STYLES: Record<string, string> = {
  owner: "bg-amber-500/20 text-amber-300 border border-amber-400/40",
  pro:   "bg-violet-500/15 text-violet-400 border border-violet-500/25",
  free:  "bg-zinc-500/15 text-zinc-400 border border-zinc-500/25",
};

const PLAN_LABELS: Record<string, string> = {
  owner: "Unlimited",
  pro:   "Pro",
  free:  "Free",
};

export function PlanBadge({ plan, className = "" }: PlanBadgeProps) {
  const style = PLAN_STYLES[plan] ?? PLAN_STYLES.free;
  const label = PLAN_LABELS[plan] ?? plan;

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        style,
        className,
      ].join(" ")}
    >
      {plan === "owner" && <Crown className="h-3 w-3" />}
      {label}
    </span>
  );
}
