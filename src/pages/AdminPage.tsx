import { useState } from "react";
import { Link } from "react-router";
import { Users, CreditCard, FileCheck, AlertCircle, UserPlus, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useAdminStats } from "@/hooks/useAdminStats";
import { useAdminBorrowers } from "@/hooks/useAdminBorrowers";
import { useLoans } from "@/hooks/useLoans";
import { useUpcomingInstallments } from "@/hooks/useUpcomingInstallments";
import { StatCard } from "@/components/admin/StatCard";
import { BorrowersList } from "@/components/admin/BorrowersList";
import { InviteBorrowerDrawer } from "@/components/admin/InviteBorrowerDrawer";
import { LoanCard } from "@/components/dashboard/LoanCard";
import { UpcomingPayments } from "@/components/dashboard/UpcomingPayments";
import { cardVariants } from "@/lib/animations";

function formatCurrency(amount: number, currency: "PHP" | "AED"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
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

export default function AdminPage() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useAdminStats();
  const { data: borrowers = [], isLoading: borrowersLoading } = useAdminBorrowers();
  const { data: allLoans = [], isLoading: loansLoading } = useLoans();
  const { data: upcoming = [], isLoading: upcomingLoading } = useUpcomingInstallments();
  const [inviteOpen, setInviteOpen] = useState(false);

  const activeLoans = allLoans.filter((l) => l.status === "active").slice(0, 6);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">Overview of all loans and borrowers.</p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium shadow-sm transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Invite Borrower</span>
        </button>
      </div>

      {/* Error state */}
      {statsError && (
        <div className="border-rose-500/30 bg-rose-500/10 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Failed to load stats. Please refresh.
        </div>
      )}

      {/* Stats grid */}
      <motion.div
        variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <motion.div variants={cardVariants}>
          <StatCard
            icon={Users}
            label="Total Borrowers"
            value={stats?.borrowerCount ?? 0}
            loading={statsLoading}
            accent="default"
          />
        </motion.div>

        <motion.div variants={cardVariants}>
          <StatCard
            icon={CreditCard}
            label="Active Loans · PH"
            value={stats?.activeLoans.PH.count ?? 0}
            sub={
              stats?.activeLoans.PH.totalPrincipal
                ? formatCurrency(stats.activeLoans.PH.totalPrincipal, "PHP")
                : undefined
            }
            loading={statsLoading}
            accent="blue"
          />
        </motion.div>

        <motion.div variants={cardVariants}>
          <StatCard
            icon={CreditCard}
            label="Active Loans · UAE"
            value={stats?.activeLoans.UAE.count ?? 0}
            sub={
              stats?.activeLoans.UAE.totalPrincipal
                ? formatCurrency(stats.activeLoans.UAE.totalPrincipal, "AED")
                : undefined
            }
            loading={statsLoading}
            accent="amber"
          />
        </motion.div>

        <motion.div variants={cardVariants}>
          <StatCard
            icon={FileCheck}
            label="Pending Proofs"
            value={stats?.pendingProofsCount ?? 0}
            loading={statsLoading}
            accent={stats?.pendingProofsCount ? "rose" : "default"}
          />
        </motion.div>
      </motion.div>

      {/* Active loans */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground text-sm font-semibold">
            Active Loans
            {!loansLoading && activeLoans.length > 0 && (
              <span className="text-muted-foreground ml-2 font-normal">({activeLoans.length})</span>
            )}
          </h2>
          <Link
            to="/loans"
            className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 text-xs transition-colors"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {loansLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <LoanCardSkeleton />
            <LoanCardSkeleton />
          </div>
        ) : activeLoans.length === 0 ? (
          <div className="border-border/60 bg-card rounded-xl border px-4 py-8 text-center">
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
              <LoanCard
                key={loan.id}
                loan={loan}
                borrowerName={loan.borrower?.full_name}
              />
            ))}
          </motion.div>
        )}
      </section>

      {/* Upcoming payments */}
      <section>
        <UpcomingPayments
          installments={upcoming}
          loading={upcomingLoading}
          showBorrower
        />
      </section>

      {/* Borrowers list */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible">
        <BorrowersList borrowers={borrowers} loading={borrowersLoading} />
      </motion.div>

      <InviteBorrowerDrawer open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
