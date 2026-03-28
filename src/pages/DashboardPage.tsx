import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMyLoans } from "@/hooks/useMyLoans";
import { useUpcomingInstallments } from "@/hooks/useUpcomingInstallments";
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

export default function DashboardPage() {
  const { profile } = useAuth();
  const { data: loans = [], isLoading: loansLoading, isFetching: loansFetching, error: loansError, refetch: refetchLoans } = useMyLoans();
  const { data: upcoming = [], isLoading: upcomingLoading, isFetching: upcomingFetching, refetch: refetchUpcoming } = useUpcomingInstallments();

  const isRefetching = loansFetching || upcomingFetching;

  const activeLoans = loans.filter((l) => l.status === "active");
  const pastLoans = loans.filter((l) => l.status !== "active");

  function handleRefresh() {
    void refetchLoans();
    void refetchUpcoming();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* Greeting */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight">
            {profile ? `Hi, ${getFirstName(profile.full_name)} 👋` : "Dashboard"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Here's an overview of your loans.
          </p>
        </div>
        <RefreshButton onRefresh={handleRefresh} isRefetching={isRefetching} />
      </div>

      {/* Error */}
      {loansError && (
        <div className="border-rose-500/30 bg-rose-500/10 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Failed to load loans. Please refresh.
        </div>
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
