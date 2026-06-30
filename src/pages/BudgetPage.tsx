import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Settings2, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { cardVariants } from "@/lib/animations";
import {
  computeBudgetSummary,
  currentMonthStr,
  formatMonthLabel,
  formatMonthShort,
  getActiveGroupOrder,
  shiftMonth,
} from "@/lib/budgetRules";
import { formatCurrency } from "@/lib/formatCurrency";
import { getDefaultCurrency } from "@/lib/countries";
import { useAuth } from "@/hooks/useAuth";
import { useBudgetCategories, useBudgetSetup, useWealthAccounts } from "@/hooks/useBudgetSetup";
import { useBudgetEntries, useBudgetTargets } from "@/hooks/useBudgetData";
import { useBudgetMutations } from "@/hooks/useBudgetMutations";
import { useCategoryMutations } from "@/hooks/useCategoryMutations";
import {
  dismissWealthOnboarding,
  useWealthMutations,
  useWealthOnboardingStatus,
} from "@/hooks/useWealthMutations";
import { ManageCategoriesDrawer } from "@/components/budget/ManageCategoriesDrawer";
import { BudgetGroupSection } from "@/components/budget/BudgetGroupSection";
import { WealthAccountsPanel } from "@/components/budget/WealthAccountsPanel";
import {
  WealthOnboardingBanner,
  WealthOpeningBalanceDrawer,
} from "@/components/budget/WealthOpeningBalanceDrawer";
import { BudgetEntryList } from "@/components/budget/BudgetEntryList";
import { AddBudgetEntryDrawer, EditBudgetTargetDrawer } from "@/components/budget/BudgetDrawers";
import { RefreshButton } from "@/components/ui/refresh-button";
import { BUDGET_CURRENCIES, BUDGET_GROUP_LABELS } from "@/types/budget";
import type { CurrencyType } from "@/types/enums";

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "rose" | "neutral";
}) {
  return (
    <div className="border-border/60 bg-card flex flex-col gap-1 rounded-xl border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p
        className={cn(
          "text-lg font-semibold tabular-nums",
          accent === "green" && "text-emerald-500",
          accent === "rose" && "text-rose-400",
          !accent && "text-foreground"
        )}
      >
        {value}
      </p>
      {sub && <p className="text-muted-foreground text-[10px]">{sub}</p>}
    </div>
  );
}

export default function BudgetPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const defaultCurrency = (
    profile?.region ? getDefaultCurrency(profile.region) : "AED"
  ) as CurrencyType;

  const [currency, setCurrency] = useState<CurrencyType>(
    BUDGET_CURRENCIES.includes(defaultCurrency as (typeof BUDGET_CURRENCIES)[number])
      ? defaultCurrency
      : "AED"
  );
  const [monthKey, setMonthKey] = useState(currentMonthStr());
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [wealthBalanceOpen, setWealthBalanceOpen] = useState(false);
  const [wealthFocusAccountId, setWealthFocusAccountId] = useState<string | null>(null);
  const [targetEdit, setTargetEdit] = useState<{ id: string; name: string; target: number } | null>(
    null
  );

  const {
    data: period,
    isLoading: periodLoading,
    isFetching,
    error: periodError,
    refetch,
  } = useBudgetSetup(currency, monthKey, profile?.id);

  const periodId = period?.id;
  const setupReady = Boolean(periodId);

  const { data: categories = [] } = useBudgetCategories(currency, setupReady);
  const { data: wealthAccounts = [] } = useWealthAccounts(currency, setupReady);
  const { data: onboardingStatus } = useWealthOnboardingStatus(profile?.id, currency, setupReady);
  const { data: targets = [] } = useBudgetTargets(periodId);
  const { data: entries = [] } = useBudgetEntries(periodId);

  const { addEntry, deleteEntry, upsertTarget } = useBudgetMutations(currency, periodId);
  const { createCategory, updateCategory, deleteCategory } = useCategoryMutations(
    currency,
    profile?.id
  );
  const { setOpeningBalance, setOpeningBalancesBatch } = useWealthMutations(currency, profile?.id);

  function openWealthBalances(accountId: string | null) {
    setWealthFocusAccountId(accountId);
    setWealthBalanceOpen(true);
  }

  function handleDismissWealthOnboarding() {
    if (profile?.id) {
      dismissWealthOnboarding(profile.id, currency);
      void queryClient.invalidateQueries({
        queryKey: ["budget", "wealth-onboarding", profile.id, currency],
      });
    }
  }

  const activeGroups = useMemo(() => getActiveGroupOrder(categories), [categories]);

  const summary = useMemo(() => {
    if (!categories.length) return null;
    return computeBudgetSummary(categories, targets, entries);
  }, [categories, targets, entries]);

  const targetCategoryName = targetEdit && categories.find((c) => c.id === targetEdit.id)?.name;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Wallet className="text-primary h-5 w-5" />
            <h1 className="text-foreground font-heading text-xl font-semibold">Budget</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Private monthly plan — {formatMonthLabel(monthKey)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            aria-label="Manage categories"
            title="Manage categories"
          >
            <Settings2 className="h-4 w-4" />
          </button>
          <RefreshButton onRefresh={() => void refetch()} isRefetching={isFetching} />
        </div>
      </div>

      {/* Currency tabs */}
      <div className="flex gap-2">
        {BUDGET_CURRENCIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCurrency(c)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              currency === c
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:text-foreground"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setMonthKey((m) => shiftMonth(m, -1))}
          className="border-border/60 hover:bg-muted/50 rounded-lg border p-2"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-foreground text-sm font-medium">{formatMonthShort(monthKey)}</span>
        <button
          type="button"
          onClick={() => setMonthKey((m) => shiftMonth(m, 1))}
          className="border-border/60 hover:bg-muted/50 rounded-lg border p-2"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {periodLoading && (
        <div className="text-muted-foreground py-12 text-center text-sm">Loading budget…</div>
      )}

      {periodError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          <p className="font-medium">Could not load budget</p>
          <p className="mt-1 text-xs opacity-90">
            {(periodError as Error).message.includes("budget_periods")
              ? "Run migration 015_personal_budget.sql in Supabase, then refresh."
              : (periodError as Error).message}
          </p>
        </div>
      )}

      {!periodLoading && period && !periodError && !summary && (
        <div className="border-border/60 rounded-xl border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">No categories for {currency} yet.</p>
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            className="text-primary mt-3 text-sm font-medium hover:underline"
          >
            Set up categories
          </button>
        </div>
      )}

      {summary && !periodLoading && period && (
        <>
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            <SummaryCard
              label="Income"
              value={formatCurrency(summary.period.income_total, currency)}
              accent="green"
            />
            <SummaryCard
              label="Living"
              value={formatCurrency(
                summary.period.essentials_spent + summary.period.lifestyle_spent,
                currency
              )}
            />
            <SummaryCard
              label="Saved & invested"
              value={formatCurrency(
                summary.period.savings_allocated + summary.period.investments_allocated,
                currency
              )}
            />
            <SummaryCard
              label="Net flow"
              value={formatCurrency(summary.period.net_cash_flow, currency)}
              accent={summary.period.net_cash_flow >= 0 ? "green" : "rose"}
              sub={`Unallocated ${formatCurrency(summary.period.unallocated_income, currency)}`}
            />
          </motion.div>

          {onboardingStatus?.needsOnboarding && wealthAccounts.length > 0 && (
            <WealthOnboardingBanner
              currency={currency}
              accountCount={wealthAccounts.length}
              onSetBalances={() => openWealthBalances(null)}
              onDismiss={handleDismissWealthOnboarding}
            />
          )}

          <WealthAccountsPanel
            accounts={wealthAccounts}
            currency={currency}
            onEditBalance={(accountId) => openWealthBalances(accountId)}
          />

          <div className="space-y-3">
            {activeGroups.map((groupKey) => (
              <BudgetGroupSection
                key={groupKey}
                groupKey={groupKey}
                label={BUDGET_GROUP_LABELS[groupKey]}
                categories={summary.categories}
                currency={currency}
                defaultOpen={groupKey !== "transfers" && groupKey !== "debt"}
                onEditTarget={(categoryId, currentTarget) => {
                  const cat = categories.find((c) => c.id === categoryId);
                  setTargetEdit({
                    id: categoryId,
                    name: cat?.name ?? "Category",
                    target: currentTarget,
                  });
                }}
              />
            ))}
          </div>

          <section className="border-border/60 bg-card rounded-xl border p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-foreground text-sm font-semibold">Recent entries</h2>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
            <BudgetEntryList
              entries={entries.slice(0, 20)}
              currency={currency}
              onDelete={(id) => deleteEntry.mutate(id)}
              isDeleting={deleteEntry.isPending}
            />
          </section>
        </>
      )}

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="bg-primary text-primary-foreground fixed right-6 bottom-20 z-30 flex h-14 w-14 items-center justify-center rounded-full shadow-lg md:bottom-8"
        aria-label="Add budget entry"
      >
        <Plus className="h-6 w-6" />
      </button>

      <AddBudgetEntryDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        categories={categories}
        isPending={addEntry.isPending}
        onSubmit={(data) => {
          if (!periodId || !profile?.id) return;
          addEntry.mutate(
            {
              periodId,
              userId: profile.id,
              category: data.category,
              amount: data.amount,
              entryDate: data.entry_date,
              description: data.description,
            },
            { onSuccess: () => setAddOpen(false) }
          );
        }}
      />

      <ManageCategoriesDrawer
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        currency={currency}
        categories={categories}
        wealthAccounts={wealthAccounts}
        isPending={createCategory.isPending || updateCategory.isPending}
        deletingId={deleteCategory.isPending ? deleteCategory.variables : null}
        onCreate={(input) =>
          new Promise<void>((resolve, reject) => {
            createCategory.mutate(input, { onSuccess: () => resolve(), onError: reject });
          })
        }
        onUpdate={(categoryId, input) =>
          new Promise<void>((resolve, reject) => {
            updateCategory.mutate(
              { categoryId, input },
              { onSuccess: () => resolve(), onError: reject }
            );
          })
        }
        onDelete={(categoryId) => deleteCategory.mutate(categoryId)}
      />

      <WealthOpeningBalanceDrawer
        open={wealthBalanceOpen}
        onClose={() => {
          setWealthBalanceOpen(false);
          setWealthFocusAccountId(null);
        }}
        accounts={wealthAccounts}
        currency={currency}
        focusAccountId={wealthFocusAccountId}
        isPending={setOpeningBalance.isPending || setOpeningBalancesBatch.isPending}
        onSubmit={async (inputs) => {
          if (wealthFocusAccountId && inputs.length === 1) {
            await setOpeningBalance.mutateAsync(inputs[0]!);
          } else {
            await setOpeningBalancesBatch.mutateAsync(inputs);
          }
        }}
      />

      <EditBudgetTargetDrawer
        open={Boolean(targetEdit)}
        onClose={() => setTargetEdit(null)}
        categoryName={targetCategoryName ?? ""}
        currency={currency}
        currentTarget={targetEdit?.target ?? 0}
        isPending={upsertTarget.isPending}
        onSubmit={(amountLimit) => {
          if (!periodId || !targetEdit) return;
          upsertTarget.mutate(
            {
              periodId,
              categoryId: targetEdit.id,
              amountLimit,
            },
            { onSuccess: () => setTargetEdit(null) }
          );
        }}
      />
    </div>
  );
}
