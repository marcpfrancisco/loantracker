import { Users, CreditCard, FileCheck, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useAdminStats } from "@/hooks/useAdminStats";
import { useAdminBorrowers } from "@/hooks/useAdminBorrowers";
import { StatCard } from "@/components/admin/StatCard";
import { BorrowersList } from "@/components/admin/BorrowersList";
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

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Page header */}
      <div>
        <h1 className="text-foreground text-xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">Overview of all loans and borrowers.</p>
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
    </div>
  );
}
