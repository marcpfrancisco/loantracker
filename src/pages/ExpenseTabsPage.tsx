import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Receipt, AlertCircle, Lock, Unlock, CheckCircle2, Archive, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getPeriodVisualStatus,
  groupPeriodsByYear,
  PERIOD_STATUS_STYLES,
} from "@/lib/expensePeriodStyles";
import {
  hasOutstandingBalance,
  isPeriodSettled,
  normalizePeriodKey,
} from "@/lib/expensePeriodRules";
import { cardVariants } from "@/lib/animations";
import { useAuth } from "@/hooks/useAuth";
import { useExpenseTabsAdmin, useMyExpenseTab } from "@/hooks/useExpenseTabs";
import type { ExpenseTabSummary } from "@/hooks/useExpenseTabs";
import { useDeleteExpenseTab } from "@/hooks/useExpenseTabMutations";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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

function fmtCompact(amount: number, currency: string) {
  if (amount >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  }
  return fmt(amount, currency);
}

function PeriodPill({
  period,
  is_locked,
  is_archived,
  paid_status,
  outstanding = 0,
  total_owed = 0,
  currency,
}: {
  period: string;
  is_locked: boolean;
  is_archived: boolean;
  paid_status: "unpaid" | "partial" | "paid";
  outstanding?: number;
  total_owed?: number;
  currency?: string;
}) {
  const status = getPeriodVisualStatus({
    period: normalizePeriodKey(period),
    is_locked,
    is_archived,
    paid_status,
    outstanding,
    total_owed,
  });
  const hasBalance = hasOutstandingBalance(outstanding) && currency;
  const settled = isPeriodSettled({ outstanding, total_owed });

  const Icon =
    status === "archived"
      ? Archive
      : status === "paid"
        ? CheckCircle2
        : status === "locked" || status === "closed"
          ? Lock
          : Unlock;

  return (
    <span
      title={hasBalance ? `${fmt(outstanding, currency)} outstanding` : undefined}
      className={cn(
        "inline-flex min-h-8 touch-manipulation flex-col items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
        PERIOD_STATUS_STYLES[status]
      )}
    >
      <span className="inline-flex items-center gap-1">
        <Icon className="h-2.5 w-2.5" />
        {formatPeriod(period)}
      </span>
      {hasBalance && (
        <span className="mt-0.5 text-[8px] font-semibold tabular-nums opacity-90">
          {fmtCompact(outstanding, currency)}
        </span>
      )}
      {settled && <span className="mt-0.5 text-[8px] font-semibold text-emerald-400/90">Paid</span>}
    </span>
  );
}

// ── Tab card ──────────────────────────────────────────────────────────────────

function TabCard({ tab, isAdmin }: { tab: ExpenseTabSummary; isAdmin: boolean }) {
  const navigate = useNavigate();
  const deleteTab = useDeleteExpenseTab();
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <motion.div
      variants={cardVariants}
      className="bg-card border-border/60 group relative rounded-2xl border transition-colors"
    >
      {/* Clickable card body — pr-10 leaves room for the trash icon */}
      <button
        type="button"
        onClick={() => void navigate(`/tabs/${tab.id}`)}
        className="hover:bg-muted/20 active:bg-muted/30 w-full touch-manipulation rounded-2xl p-4 pr-12 text-left transition-colors sm:pr-10"
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

        {tab.periodSummaries.length > 0 && (
          <div className="mt-3 space-y-2">
            {groupPeriodsByYear(tab.periodSummaries).map(({ year, periods }) => (
              <div key={year}>
                <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wide">
                  {year}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {periods.map((p) => (
                    <PeriodPill
                      key={p.period}
                      period={p.period}
                      is_locked={p.is_locked}
                      is_archived={p.is_archived}
                      paid_status={p.paid_status}
                      outstanding={p.outstanding}
                      total_owed={p.total_owed}
                      currency={tab.currency}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab.outstanding <= 0 && tab.totalOwed > 0 && (
          <div className="mt-3 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs text-emerald-400">All settled</span>
          </div>
        )}
      </button>

      {/* Trash icon — positioned in the top-right corner, outside card button */}
      {isAdmin && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowConfirm(true);
          }}
          className="text-muted-foreground active:bg-muted/40 absolute top-3 right-3 flex h-10 w-10 touch-manipulation items-center justify-center rounded-lg transition-colors hover:text-rose-400"
          aria-label="Delete this expense tab"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}

      <ConfirmDialog
        open={showConfirm}
        title="Delete expense tab?"
        description={`This will permanently delete "${tab.title}" for ${tab.borrower.full_name}, including all months, items, and payments. This cannot be undone.`}
        confirmLabel="Delete tab"
        isPending={deleteTab.isPending}
        onConfirm={() => deleteTab.mutate(tab.id, { onSuccess: () => setShowConfirm(false) })}
        onCancel={() => setShowConfirm(false)}
      />
    </motion.div>
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
    ? ((data as ExpenseTabSummary[] | undefined) ?? [])
    : data
      ? [data as ExpenseTabSummary]
      : [];

  // Borrower with a tab → redirect straight to their tab
  if (!isAdmin && !isLoading && tabs.length > 0) {
    void navigate(`/tabs/${tabs[0].id}`, { replace: true });
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-6">
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
            <TabCard key={tab.id} tab={tab} isAdmin={isAdmin} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
