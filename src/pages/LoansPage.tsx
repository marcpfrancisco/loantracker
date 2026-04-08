import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, AlertCircle, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useLoansInfinite, LOANS_PAGE_SIZE } from "@/hooks/useLoansInfinite";
import type { StatusFilter, RegionFilter } from "@/hooks/useLoansInfinite";
import { LoanCard } from "@/components/dashboard/LoanCard";
import { AddLoanDrawer } from "@/components/loans/AddLoanDrawer";
import { RefreshButton } from "@/components/ui/refresh-button";
import {
  BorrowerLoanGroup,
  BorrowerLoanGroupSkeleton,
  groupLoansByBorrower,
} from "@/components/loans/BorrowerLoanGroup";
import type { LoanListItem } from "@/hooks/useLoans";

// ── Filter options ─────────────────────────────────────────────────────────────

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
  { value: "AE", label: "🇦🇪 AE" },
];

// ── FilterPill ─────────────────────────────────────────────────────────────────

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

// ── Skeleton (flat view for borrowers) ────────────────────────────────────────

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

// ── Page ───────────────────────────────────────────────────────────────────────

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

  const loans = (data?.pages.flat() ?? []) as LoanListItem[];
  const totalLoaded = loans.length;
  const hasFilters = statusFilter !== "all" || regionFilter !== "all";
  const grouped = isAdmin ? groupLoansByBorrower(loans) : [];

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight">Loans</h1>
          {!isLoading && (
            <p className="text-muted-foreground mt-1 text-sm">
              {totalLoaded > 0
                ? isAdmin
                  ? `${grouped.length} borrower${grouped.length !== 1 ? "s" : ""} · ${totalLoaded}${hasNextPage ? "+" : ""} loan${totalLoaded !== 1 ? "s" : ""}${hasFilters ? " matching filters" : ""}`
                  : `${totalLoaded}${hasNextPage ? "+" : ""} loan${totalLoaded !== 1 ? "s" : ""}${hasFilters ? " matching filters" : ""}`
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
              onClick={setStatusFilter}
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
              onClick={setRegionFilter}
            />
          ))}
        </div>
      </div>

      {/* Loan list */}
      {isLoading ? (
        isAdmin ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <BorrowerLoanGroupSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: Math.min(LOANS_PAGE_SIZE, 4) }).map((_, i) => (
              <LoanCardSkeleton key={i} />
            ))}
          </div>
        )
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
      ) : isAdmin ? (
        // ── Grouped view (admin) ───────────────────────────────────────────────
        <>
          <motion.div
            className="space-y-3"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
            initial="hidden"
            animate="visible"
          >
            {grouped.map((group) => (
              <motion.div key={group.id} variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}>
                <BorrowerLoanGroup
                  borrowerName={group.name}
                  loans={group.loans}
                  defaultOpen={
                    group.loans.some(
                      (l) =>
                        l.status === "active" &&
                        l.nextDueDate !== null &&
                        new Date(l.nextDueDate + "T00:00:00") < new Date(new Date().toDateString())
                    ) || grouped.length <= 3
                  }
                />
              </motion.div>
            ))}
          </motion.div>

          {grouped.length > 1 && (
            <div className="flex items-center justify-end gap-1.5">
              <User className="text-muted-foreground h-3.5 w-3.5" />
              <span className="text-muted-foreground text-xs">
                {grouped.length} borrowers · click headers to collapse
              </span>
            </div>
          )}

          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
                className="border-border/60 text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-2 rounded-lg border px-5 py-2.5 text-sm transition-colors disabled:opacity-60"
              >
                {isFetchingNextPage ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Loading…</>
                ) : (
                  "Load more"
                )}
              </button>
            </div>
          )}
        </>
      ) : (
        // ── Flat card view (borrower) ──────────────────────────────────────────
        <>
          <motion.div
            className="grid gap-3 sm:grid-cols-2"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
            initial="hidden"
            animate="visible"
          >
            {loans.map((loan) => (
              <LoanCard key={loan.id} loan={loan} />
            ))}
          </motion.div>

          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
                className="border-border/60 text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-2 rounded-lg border px-5 py-2.5 text-sm transition-colors disabled:opacity-60"
              >
                {isFetchingNextPage ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Loading…</>
                ) : (
                  "Load more"
                )}
              </button>
            </div>
          )}
        </>
      )}

      {isAdmin && <AddLoanDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />}
    </div>
  );
}
