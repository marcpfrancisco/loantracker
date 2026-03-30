import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { AlertCircle, AlertTriangle, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMyLoans } from "@/hooks/useMyLoans";
import { useUpcomingInstallments } from "@/hooks/useUpcomingInstallments";
import { useMyOverdueInstallments } from "@/hooks/useMyOverdueInstallments";
import { LoanCard } from "@/components/dashboard/LoanCard";
import { UpcomingPayments } from "@/components/dashboard/UpcomingPayments";
import { RefreshButton } from "@/components/ui/refresh-button";

function getFirstName(fullName: string): string {
  return fullName.split(" ")[0];
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

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const {
    data: loans = [],
    isLoading: loansLoading,
    isFetching: loansFetching,
    error: loansError,
    refetch: refetchLoans,
  } = useMyLoans();
  const {
    data: upcoming = [],
    isLoading: upcomingLoading,
    isFetching: upcomingFetching,
    refetch: refetchUpcoming,
  } = useUpcomingInstallments();
  const {
    data: overdue = [],
    isLoading: overdueLoading,
    isFetching: overdueFetching,
    refetch: refetchOverdue,
  } = useMyOverdueInstallments();

  const isRefetching = loansFetching || upcomingFetching || overdueFetching;

  const activeLoans = loans.filter((l) => l.status === "active");
  const pastLoans = loans.filter((l) => l.status !== "active");

  function handleRefresh() {
    void refetchLoans();
    void refetchUpcoming();
    void refetchOverdue();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* Greeting */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight">
            {profile ? `Hi, ${getFirstName(profile.full_name)} 👋` : "Dashboard"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Here's an overview of your loans.</p>
        </div>
        <RefreshButton onRefresh={handleRefresh} isRefetching={isRefetching} />
      </div>

      {/* Error */}
      {loansError && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Failed to load loans. Please refresh.
        </div>
      )}

      {/* Overdue installments alert — borrower only */}
      {(overdueLoading || overdue.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-xl border border-rose-500/30 bg-rose-500/5"
        >
          <div className="flex items-center gap-2.5 border-b border-rose-500/20 px-4 py-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <h2 className="flex-1 text-sm font-semibold text-rose-400">Overdue Payments</h2>
            {!overdueLoading && (
              <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-medium text-rose-400">
                {overdue.length}
              </span>
            )}
          </div>

          {overdueLoading ? (
            <div className="divide-y divide-rose-500/10">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <div className="bg-muted h-3.5 w-32 animate-pulse rounded" />
                    <div className="bg-muted h-3 w-20 animate-pulse rounded" />
                  </div>
                  <div className="bg-muted h-4 w-16 animate-pulse rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-rose-500/10">
              {overdue.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void navigate(`/loans/${item.loan_id}`)}
                  className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-rose-500/5"
                >
                  {/* Days overdue badge */}
                  <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-full bg-rose-500/15">
                    <span className="text-[10px] leading-none font-bold text-rose-400">
                      {item.days_overdue}d
                    </span>
                    <span className="text-[9px] leading-none text-rose-400/70">late</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-sm font-medium">
                      {item.source_name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Installment #{item.installment_no}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="text-foreground text-sm font-semibold">
                      {formatCurrency(item.amount, item.currency)}
                    </span>
                    <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Active loans */}
      <section className="space-y-3">
        <h2 className="text-foreground text-sm font-semibold">
          Active Loans
          {!loansLoading && activeLoans.length > 0 && (
            <span className="text-muted-foreground ml-2 font-normal">({activeLoans.length})</span>
          )}
        </h2>

        {loansLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <LoanCardSkeleton />
            <LoanCardSkeleton />
          </div>
        ) : activeLoans.length === 0 ? (
          <div className="border-border/60 bg-card rounded-xl border px-4 py-10 text-center">
            <p className="text-muted-foreground text-sm">No active loans.</p>
          </div>
        ) : (
          <motion.div
            className="grid gap-3 sm:grid-cols-2"
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
            initial="hidden"
            animate="visible"
          >
            {activeLoans.map((loan) => (
              <LoanCard key={loan.id} loan={loan} />
            ))}
          </motion.div>
        )}
      </section>

      {/* Upcoming payments */}
      <section>
        <UpcomingPayments installments={upcoming} loading={upcomingLoading} />
      </section>

      {/* Past loans */}
      {!loansLoading && pastLoans.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-muted-foreground text-sm font-semibold">Past Loans</h2>
          <motion.div
            className="grid gap-3 sm:grid-cols-2"
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
            initial="hidden"
            animate="visible"
          >
            {pastLoans.map((loan) => (
              <LoanCard key={loan.id} loan={loan} />
            ))}
          </motion.div>
        </section>
      )}
    </div>
  );
}
