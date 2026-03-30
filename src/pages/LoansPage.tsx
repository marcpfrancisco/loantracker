import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useLoansInfinite, LOANS_PAGE_SIZE } from "@/hooks/useLoansInfinite";
import type { StatusFilter, RegionFilter } from "@/hooks/useLoansInfinite";
import { LoanCard } from "@/components/dashboard/LoanCard";
import { AddLoanDrawer } from "@/components/loans/AddLoanDrawer";
import { RefreshButton } from "@/components/ui/refresh-button";

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "defaulted", label: "Defaulted" },
  { value: "cancelled", label: "Cancelled" },
];

const regionOptions: { value: RegionFilter; label: string }[] = [
  { value: "all", label: "All Regions" },
  { value: "PH", label: "🇵🇭 PH" },
  { value: "UAE", label: "🇦🇪 UAE" },
];

function FilterPill<T extends string>({
  value,
  active,
  label,
  onClick,
}: {
  value: T;
  active: boolean;
  label: string;
  onClick: (v: T) => void;
}) {
  return (
    <button
      onClick={() => onClick(value)}
      className={cn(
        "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-primary/15 border-primary/40 text-primary"
          : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

function LoanCardSkeleton() {
  return (
    <div className="bg-card border-border/60 flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="bg-muted h-4 w-28 animate-pulse rounded" />
          <div className="bg-muted h-3 w-20 animate-pulse rounded" />
        </div>
        <div className="bg-muted h-5 w-14 animate-pulse rounded" />
      </div>
      <div className="flex flex-col gap-1">
        <div className="bg-muted h-7 w-32 animate-pulse rounded" />
        <div className="bg-muted h-3 w-16 animate-pulse rounded" />
      </div>
      <div className="bg-muted h-1.5 w-full animate-pulse rounded-full" />
    </div>
  );
}

export default function LoansPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
  } = useLoansInfinite(statusFilter, regionFilter);

  const loans = data?.pages.flat() ?? [];
  const totalLoaded = loans.length;
  const hasFilters = statusFilter !== "all" || regionFilter !== "all";

  function handleFilterChange<T>(setter: (v: T) => void) {
    return (v: T) => setter(v);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight">Loans</h1>
          {!isLoading && (
            <p className="text-muted-foreground mt-1 text-sm">
              {totalLoaded > 0
                ? `${totalLoaded}${hasNextPage ? "+" : ""} loan${totalLoaded !== 1 ? "s" : ""}${hasFilters ? " matching filters" : ""}`
                : hasFilters
                  ? "No loans match the selected filters"
                  : "No loans yet"}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <RefreshButton
            onRefresh={() => void refetch()}
            isRefetching={isFetching && !isFetchingNextPage}
          />
          {isAdmin && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="bg-primary text-primary-foreground flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add Loan
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Failed to load loans. Please refresh.
        </div>
      )}

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((opt) => (
            <FilterPill
              key={opt.value}
              value={opt.value}
              label={opt.label}
              active={statusFilter === opt.value}
              onClick={handleFilterChange(setStatusFilter)}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {regionOptions.map((opt) => (
            <FilterPill
              key={opt.value}
              value={opt.value}
              label={opt.label}
              active={regionFilter === opt.value}
              onClick={handleFilterChange(setRegionFilter)}
            />
          ))}
        </div>
      </div>

      {/* Loan list */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: LOANS_PAGE_SIZE > 4 ? 4 : LOANS_PAGE_SIZE }).map((_, i) => (
            <LoanCardSkeleton key={i} />
          ))}
        </div>
      ) : loans.length === 0 ? (
        <div className="border-border/60 bg-card rounded-xl border px-4 py-16 text-center">
          <p className="text-foreground text-sm font-medium">No loans found</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {hasFilters
              ? "Try adjusting your filters."
              : isAdmin
                ? "Add the first loan using the button above."
                : "No loans have been assigned to you yet."}
          </p>
        </div>
      ) : (
        <>
          <motion.div
            className="grid gap-3 sm:grid-cols-2"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
            initial="hidden"
            animate="visible"
          >
            {loans.map((loan) => (
              <LoanCard
                key={loan.id}
                loan={loan}
                borrowerName={isAdmin ? (loan.borrower?.full_name ?? "Unknown") : undefined}
              />
            ))}
          </motion.div>

          {/* Load more */}
          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
                className="border-border/60 text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-2 rounded-lg border px-5 py-2.5 text-sm transition-colors disabled:opacity-60"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  "Load more"
                )}
              </button>
            </div>
          )}

          {/* Next-page skeleton while fetching */}
          {isFetchingNextPage && (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <LoanCardSkeleton key={i} />
              ))}
            </div>
          )}
        </>
      )}

      {isAdmin && <AddLoanDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />}
    </div>
  );
}
