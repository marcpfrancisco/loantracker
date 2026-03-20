import { LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function TopBar() {
  const { profile } = useAuth();

  return (
    <header className="border-border/60 bg-background/80 flex h-14 shrink-0 items-center justify-between border-b px-4 backdrop-blur-sm md:hidden">
      {/* App logo + name */}
      <div className="flex items-center gap-2.5">
        <div className="bg-primary/10 border-border flex h-7 w-7 items-center justify-center rounded-lg border">
          <LockKeyhole className="text-primary h-3.5 w-3.5" />
        </div>
        <span className="text-foreground text-sm font-semibold tracking-tight">
          Loan Tracker
        </span>
      </div>

      {/* Right: region badge + avatar */}
      {profile && (
        <div className="flex items-center gap-2">
          <RegionBadge region={profile.region} />
          <div
            className="bg-primary/15 text-primary flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
            title={profile.full_name}
          >
            {getInitials(profile.full_name)}
          </div>
        </div>
      )}
    </header>
  );
}

function RegionBadge({ region }: { region: string }) {
  const styles =
    region === "UAE"
      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
      : "bg-blue-500/15 text-blue-400 border-blue-500/30";

  return (
    <span
      className={cn(
        "rounded border px-1.5 py-0.5 text-[10px] font-medium",
        styles
      )}
    >
      {region}
    </span>
  );
}
