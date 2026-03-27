import { useState } from "react";
import { Users, CreditCard, FileCheck, AlertCircle, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { useAdminStats } from "@/hooks/useAdminStats";
import { useAdminBorrowers } from "@/hooks/useAdminBorrowers";
import { StatCard } from "@/components/admin/StatCard";
import { BorrowersList } from "@/components/admin/BorrowersList";
import { InviteBorrowerDrawer } from "@/components/admin/InviteBorrowerDrawer";
import { cardVariants } from "@/lib/animations";

function formatCurrency(amount: number, currency: "PHP" | "AED"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function AdminPage() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useAdminStats();
  const { data: borrowers = [], isLoading: borrowersLoading } = useAdminBorrowers();
  const [inviteOpen, setInviteOpen] = useState(false);

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

      {/* Borrowers list */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible">
        <BorrowersList borrowers={borrowers} loading={borrowersLoading} />
      </motion.div>

      <InviteBorrowerDrawer open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
