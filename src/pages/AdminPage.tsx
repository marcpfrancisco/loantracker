import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Users,
  CreditCard,
  FileCheck,
  AlertCircle,
  UserPlus,
  ArrowRight,
  AlertTriangle,
  Clock,
  TrendingDown,
  Wallet,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAdminStats } from "@/hooks/useAdminStats";
import { useAdminBorrowers } from "@/hooks/useAdminBorrowers";
import { useLoans } from "@/hooks/useLoans";
import { useUpcomingInstallments } from "@/hooks/useUpcomingInstallments";
import { useOverdueInstallments } from "@/hooks/useOverdueInstallments";
import { useAdminPendingProofs } from "@/hooks/useAdminPendingProofs";
import { StatCard } from "@/components/admin/StatCard";
import { BorrowersList } from "@/components/admin/BorrowersList";
import { InviteBorrowerDrawer } from "@/components/admin/InviteBorrowerDrawer";
import { LoanCard } from "@/components/dashboard/LoanCard";
import { UpcomingPayments } from "@/components/dashboard/UpcomingPayments";
import { RefreshButton } from "@/components/ui/refresh-button";
import { cardVariants } from "@/lib/animations";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: "PHP" | "AED"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffD = Math.floor(diffH / 24);
  if (diffH < 1) return "just now";
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD === 1) return "yesterday";
  return `${diffD}d ago`;
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

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

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
      <div className="flex-1 space-y-1.5">
        <div className="bg-muted h-3.5 w-40 animate-pulse rounded" />
        <div className="bg-muted h-3 w-24 animate-pulse rounded" />
      </div>
      <div className="bg-muted h-4 w-16 animate-pulse rounded" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading, isFetching: statsFetching, error: statsError, refetch: refetchStats } = useAdminStats();
  const { data: borrowers = [], isLoading: borrowersLoading, isFetching: borrowersFetching, refetch: refetchBorrowers } = useAdminBorrowers();
  const { data: allLoans = [], isLoading: loansLoading, isFetching: loansFetching, refetch: refetchLoans } = useLoans();
  const { data: upcoming = [], isLoading: upcomingLoading, isFetching: upcomingFetching, refetch: refetchUpcoming } = useUpcomingInstallments();
  const { data: overdue = [], isLoading: overdueLoading, isFetching: overdueFetching, refetch: refetchOverdue } = useOverdueInstallments();
  const { data: pendingProofs = [], isLoading: proofsLoading, isFetching: proofsFetching, refetch: refetchProofs } = useAdminPendingProofs();
  const [inviteOpen, setInviteOpen] = useState(false);

  const isRefetching =
    statsFetching || borrowersFetching || loansFetching ||
    upcomingFetching || overdueFetching || proofsFetching;

  function handleRefresh() {
    void refetchStats();
    void refetchBorrowers();
    void refetchLoans();
    void refetchUpcoming();
    void refetchOverdue();
    void refetchProofs();
  }

  const activeLoans = allLoans.filter((l) => l.status === "active").slice(0, 6);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">

      {/* ── Page header ──────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">Overview of all loans and borrowers.</p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton onRefresh={handleRefresh} isRefetching={isRefetching} />
          <button
            onClick={() => setInviteOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium shadow-sm transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Invite Borrower</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {statsError && (
        <div className="border-rose-500/30 bg-rose-500/10 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Failed to load stats. Please refresh.
        </div>
      )}

      {/* ── Stats row 1: Counts ───────────────────────────────── */}
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
            label="Active · PH"
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
            label="Active · UAE"
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

      {/* ── Stats row 2: Portfolio ────────────────────────────── */}
      <motion.div
        variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-3 lg:grid-cols-3"
      >
        <motion.div variants={cardVariants}>
          <StatCard
            icon={Wallet}
            label="Outstanding · PHP"
            value={
              statsLoading
                ? "—"
                : formatCurrency(stats?.portfolioOutstanding?.PHP ?? 0, "PHP")
            }
            loading={statsLoading}
            accent="blue"
          />
        </motion.div>
        <motion.div variants={cardVariants}>
          <StatCard
            icon={Wallet}
            label="Outstanding · AED"
            value={
              statsLoading
                ? "—"
                : formatCurrency(stats?.portfolioOutstanding?.AED ?? 0, "AED")
            }
            loading={statsLoading}
            accent="amber"
          />
        </motion.div>
        <motion.div variants={cardVariants} className="col-span-2 lg:col-span-1">
          <StatCard
            icon={TrendingDown}
            label="Defaulted Loans"
            value={stats?.defaultedCount ?? 0}
            loading={statsLoading}
            accent={stats?.defaultedCount ? "rose" : "default"}
          />
        </motion.div>
      </motion.div>

      {/* ── Overdue installments alert ────────────────────────── */}
      {(overdueLoading || overdue.length > 0) && (
        <motion.div variants={cardVariants} initial="hidden" animate="visible">
          <div className="border-amber-500/30 bg-amber-500/5 overflow-hidden rounded-xl border">
            <div className="border-amber-500/20 flex items-center gap-2.5 border-b px-4 py-3.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
              <h2 className="text-amber-400 text-sm font-semibold">
                Overdue Installments
              </h2>
              {!overdueLoading && (
                <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                  {overdue.length}
                </span>
              )}
            </div>

            {overdueLoading ? (
              <div className="divide-border/30 divide-y">
                <RowSkeleton />
                <RowSkeleton />
              </div>
            ) : (
              <div className="divide-amber-500/10 divide-y">
                {overdue.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void navigate(`/loans/${item.loan_id}`)}
                    className="hover:bg-amber-500/5 flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors"
                  >
                    {/* Days overdue badge */}
                    <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-full bg-amber-500/15">
                      <span className="text-[10px] font-bold leading-none text-amber-400">
                        {item.days_overdue}d
                      </span>
                      <span className="text-[9px] leading-none text-amber-400/70">late</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-sm font-medium">
                        {item.borrower_name}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {item.source_name} · Installment #{item.installment_no} · due{" "}
                        {formatDate(item.due_date)}
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
          </div>
        </motion.div>
      )}

      {/* ── Pending proof reviews ─────────────────────────────── */}
      {(proofsLoading || pendingProofs.length > 0) && (
        <motion.div variants={cardVariants} initial="hidden" animate="visible">
          <div className="bg-card border-border/60 overflow-hidden rounded-xl border">
            <div className="border-border/60 flex items-center justify-between gap-2 border-b px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <Clock className="text-primary h-4 w-4 shrink-0" />
                <h2 className="text-foreground text-sm font-semibold">Pending Proof Reviews</h2>
                {!proofsLoading && (
                  <span className="bg-primary/15 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                    {pendingProofs.length}
                  </span>
                )}
              </div>
              <Link
                to="/loans"
                className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 text-xs transition-colors"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {proofsLoading ? (
              <div className="divide-border/40 divide-y">
                <RowSkeleton />
                <RowSkeleton />
                <RowSkeleton />
              </div>
            ) : (
              <div className="divide-border/40 divide-y">
                {pendingProofs.map((proof) => (
                  <button
                    key={proof.id}
                    type="button"
                    onClick={() => void navigate(`/loans/${proof.loan_id}`)}
                    className="hover:bg-muted/30 flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors"
                  >
                    <div className="bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                      <FileCheck className="text-primary h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-sm font-medium">
                        {proof.borrower_name}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {proof.source_name} · Installment #{proof.installment_no} ·{" "}
                        {formatCurrency(proof.amount, proof.currency)}
                      </p>
                      {proof.note && (
                        <p className="text-muted-foreground mt-0.5 flex items-center gap-1 truncate text-xs italic">
                          <MessageSquare className="h-3 w-3 shrink-0" />
                          {proof.note}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="text-muted-foreground text-xs">
                        {formatRelative(proof.submitted_at)}
                      </span>
                      <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        Review
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Active loans grid ─────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground text-sm font-semibold">
            Active Loans
            {!loansLoading && activeLoans.length > 0 && (
              <span className="text-muted-foreground ml-2 font-normal">
                ({activeLoans.length})
              </span>
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
              <LoanCard key={loan.id} loan={loan} borrowerName={loan.borrower?.full_name} />
            ))}
          </motion.div>
        )}
      </section>

      {/* ── Upcoming payments ─────────────────────────────────── */}
      <section>
        <UpcomingPayments installments={upcoming} loading={upcomingLoading} showBorrower />
      </section>

      {/* ── Borrowers list ────────────────────────────────────── */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible">
        <BorrowersList borrowers={borrowers} loading={borrowersLoading} />
      </motion.div>

      <InviteBorrowerDrawer open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
