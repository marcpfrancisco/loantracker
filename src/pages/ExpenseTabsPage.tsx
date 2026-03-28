import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Receipt, AlertCircle, Lock, Unlock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { cardVariants } from "@/lib/animations";
import { useAuth } from "@/hooks/useAuth";
import { useExpenseTabsAdmin, useMyExpenseTab } from "@/hooks/useExpenseTabs";
import type { ExpenseTabSummary } from "@/hooks/useExpenseTabs";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatPeriod(period: string) {
  return new Date(period + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

// ── Month pill ────────────────────────────────────────────────────────────────

function PeriodPill({
  period,
  is_locked,
  paid_status,
}: {
  period: string;
  is_locked: boolean;
  paid_status: "unpaid" | "partial" | "paid";
}) {
  const styles = {
    paid:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    partial: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    unpaid:  "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  };

  const Icon = paid_status === "paid"
    ? CheckCircle2
    : is_locked
    ? Lock
    : Unlock;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        styles[paid_status]
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {formatPeriod(period)}
    </span>
  );
}

// ── Tab card ──────────────────────────────────────────────────────────────────

function TabCard({ tab }: { tab: ExpenseTabSummary }) {
  const navigate = useNavigate();
  const recentPeriods = tab.periodSummaries.slice(-3);

  return (
    <motion.button
      variants={cardVariants}
      type="button"
      onClick={() => void navigate(`/tabs/${tab.id}`)}
      className="bg-card border-border/60 hover:bg-muted/20 w-full rounded-2xl border p-4 text-left transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-foreground text-sm font-semibold">{tab.borrower.full_name}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">{tab.title}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-foreground text-sm font-bold tabular-nums">
            {fmt(tab.outstanding, tab.currency)}
          </p>
          <p className="text-muted-foreground text-[10px]">outstanding</p>
        </div>
      </div>

      {recentPeriods.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tab.periodSummaries.map((p) => (
            <PeriodPill
              key={p.period}
              period={p.period}
              is_locked={p.is_locked}
              paid_status={p.paid_status}
            />
          ))}
        </div>
      )}

      {tab.outstanding <= 0 && tab.totalOwed > 0 && (
        <div className="mt-3 flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs text-emerald-400">All settled</span>
        </div>
      )}
    </motion.button>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TabCardSkeleton() {
  return (
    <div className="bg-card border-border/60 rounded-2xl border p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <div className="bg-muted h-4 w-32 animate-pulse rounded" />
          <div className="bg-muted h-3 w-24 animate-pulse rounded" />
        </div>
        <div className="space-y-1">
          <div className="bg-muted h-4 w-20 animate-pulse rounded" />
          <div className="bg-muted h-2.5 w-14 animate-pulse rounded" />
        </div>
      </div>
      <div className="mt-3 flex gap-1.5">
        <div className="bg-muted h-4 w-14 animate-pulse rounded-full" />
        <div className="bg-muted h-4 w-14 animate-pulse rounded-full" />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ExpenseTabsPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const adminQuery = useExpenseTabsAdmin();
  const borrowerQuery = useMyExpenseTab();
  const { data, isLoading, error } = isAdmin ? adminQuery : borrowerQuery;
  const navigate = useNavigate();

  // For borrower: data is a single tab or null
  const tabs: ExpenseTabSummary[] = isAdmin
    ? (data as ExpenseTabSummary[] | undefined) ?? []
    : data
    ? [data as ExpenseTabSummary]
    : [];

  // Borrower with a tab → redirect straight to their tab
  if (!isAdmin && !isLoading && tabs.length > 0) {
    void navigate(`/tabs/${tabs[0].id}`, { replace: true });
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      {/* Header */}
      <div>
        <h1 className="text-foreground text-xl font-semibold tracking-tight">Expense Tabs</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {isAdmin ? "Shared expense ledgers with borrowers." : "Your shared expense tab."}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Failed to load tabs.
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          <TabCardSkeleton />
          <TabCardSkeleton />
        </div>
      )}

      {/* Empty */}
      {!isLoading && tabs.length === 0 && (
        <div className="border-border/60 bg-card rounded-2xl border px-4 py-16 text-center">
          <Receipt className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
          <p className="text-foreground text-sm font-medium">No expense tabs yet</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {isAdmin
              ? "Create a tab from a borrower's profile page."
              : "Your lender hasn't set up a shared expense tab yet."}
          </p>
        </div>
      )}

      {/* Tab list */}
      {!isLoading && tabs.length > 0 && (
        <motion.div
          className="space-y-3"
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          initial="hidden"
          animate="visible"
        >
          {tabs.map((tab) => (
            <TabCard key={tab.id} tab={tab} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
