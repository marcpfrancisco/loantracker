import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  accent?: "default" | "amber" | "blue" | "rose";
  loading?: boolean;
}

const accentStyles = {
  default: "bg-primary/10 text-primary border-primary/20",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export function StatCard({ icon: Icon, label, value, sub, accent = "default", loading }: StatCardProps) {
  return (
    <div className="bg-card border-border/60 flex flex-col gap-4 rounded-xl border p-5">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg border", accentStyles[accent])}>
        <Icon className="h-5 w-5" />
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          <div className="bg-muted h-7 w-24 animate-pulse rounded-md" />
          <div className="bg-muted h-4 w-32 animate-pulse rounded-md" />
        </div>
      ) : (
        <div>
          <p className="text-foreground text-2xl font-semibold tracking-tight">{value}</p>
          <p className="text-muted-foreground mt-0.5 text-sm">{label}</p>
          {/* Always render sub row to keep all cards the same height */}
          <p className="text-muted-foreground/70 mt-1 text-xs">{sub ?? "\u00A0"}</p>
        </div>
      )}
    </div>
  );
}
