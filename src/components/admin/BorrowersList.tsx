import { useNavigate } from "react-router";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BorrowerSummary } from "@/hooks/useAdminBorrowers";

interface BorrowersListProps {
  borrowers: BorrowerSummary[];
  loading?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function RegionBadge({ region }: { region: string }) {
  const styles =
    region === "UAE"
      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
      : "bg-blue-500/15 text-blue-400 border-blue-500/30";

  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-medium", styles)}>{region}</span>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="bg-muted h-3.5 w-32 animate-pulse rounded" />
        <div className="bg-muted h-3 w-20 animate-pulse rounded" />
      </div>
      <div className="bg-muted h-3.5 w-12 animate-pulse rounded" />
    </div>
  );
}

export function BorrowersList({ borrowers, loading }: BorrowersListProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-card border-border/60 overflow-hidden rounded-xl border">
      {/* Header */}
      <div className="border-border/60 flex items-center gap-2.5 border-b px-4 py-3.5">
        <Users className="text-muted-foreground h-4 w-4" />
        <h2 className="text-foreground text-sm font-semibold">Borrowers</h2>
        {!loading && (
          <span className="bg-primary/10 text-primary ml-auto rounded-full px-2 py-0.5 text-xs font-medium">
            {borrowers.length}
          </span>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="divide-border/40 divide-y">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : borrowers.length === 0 ? (
        <div className="text-muted-foreground px-4 py-10 text-center text-sm">
          No borrowers yet.
        </div>
      ) : (
        <div className="divide-border/40 divide-y">
          {borrowers.map((b) => (
            <button
              key={b.id}
              onClick={() => void navigate(`/loans?borrower=${b.id}`)}
              className="hover:bg-muted/40 flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors"
            >
              {/* Avatar */}
              <div className="bg-primary/15 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                {getInitials(b.full_name)}
              </div>

              {/* Name + region */}
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate text-sm font-medium">{b.full_name}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <RegionBadge region={b.region} />
                  <span className="text-muted-foreground text-xs">
                    {new Date(b.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Loan badges */}
              <div className="flex shrink-0 flex-col items-end gap-1">
                {b.activeLoans > 0 && (
                  <span className="bg-emerald-500/15 text-emerald-400 rounded-full px-2 py-0.5 text-xs font-medium">
                    {b.activeLoans} active
                  </span>
                )}
                <span className="text-muted-foreground text-xs">
                  {b.totalLoans} loan{b.totalLoans !== 1 ? "s" : ""}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
