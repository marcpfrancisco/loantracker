import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useLoans } from "@/hooks/useLoans";
import { LoanCard } from "@/components/dashboard/LoanCard";
import { AddLoanDrawer } from "@/components/loans/AddLoanDrawer";
import type { LoanStatus, RegionType } from "@/types/database";

type StatusFilter = LoanStatus | "all";
type RegionFilter = RegionType | "all";

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

  const { data: loans = [], isLoading, error } = useLoans();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtered = loans.filter((loan) => {
    if (statusFilter !== "all" && loan.status !== statusFilter) return false;
    if (regionFilter !== "all" && loan.region !== regionFilter) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight">Loans</h1>
          {!isLoading && (
            <p className="text-muted-foreground mt-1 text-sm">
              {filtered.length} loan{filtered.length !== 1 ? "s" : ""}
              {statusFilter !== "all" || regionFilter !== "all" ? " matching filters" : " total"}
            </p>
          )}
        </div>

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

      {/* Error */}
      {error && (
        <div className="border-rose-500/30 bg-rose-500/10 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Failed to load loans. Please refresh.
        </div>
      )}

      {/* Filters */}
      <div className="space-y-2">
        {/* Status pills */}
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

        {/* Region pills */}
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
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoanCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-border/60 bg-card rounded-xl border px-4 py-16 text-center">
          <p className="text-foreground text-sm font-medium">No loans found</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {statusFilter !== "all" || regionFilter !== "all"
              ? "Try adjusting your filters."
              : isAdmin
                ? "Add the first loan using the button above."
                : "No loans have been assigned to you yet."}
          </p>
        </div>
      ) : (
        <motion.div
          className="grid gap-3 sm:grid-cols-2"
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          initial="hidden"
          animate="visible"
        >
          {filtered.map((loan) => (
            <LoanCard
              key={loan.id}
              loan={loan}
              borrowerName={isAdmin ? (loan.borrower?.full_name ?? "Unknown") : undefined}
            />
          ))}
        </motion.div>
      )}

      {isAdmin && (
        <AddLoanDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      )}
    </div>
  );
}
