import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Coins, Plus, Settings2, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { cardVariants } from "@/lib/animations";
import {
  computeBudgetSummary,
  currentMonthStr,
  formatMonthLabel,
  getActiveGroupOrder,
  isBudgetPeriodClosed,
} from "@/lib/budgetRules";
import { formatCurrency } from "@/lib/formatCurrency";
import { getDefaultCurrency } from "@/lib/countries";
import { useAuth } from "@/hooks/useAuth";
import { useBudgetCurrencies, useBudgetCurrencyMutations } from "@/hooks/useBudgetCurrencies";
import { useBudgetCategories, useBudgetSetup, useWealthAccounts } from "@/hooks/useBudgetSetup";
import { useBudgetEntries, useBudgetTargets } from "@/hooks/useBudgetData";
import { useBudgetMutations } from "@/hooks/useBudgetMutations";
import { useCardAccounts } from "@/hooks/useCardAccounts";
import { useCategoryMutations } from "@/hooks/useCategoryMutations";
import {
  dismissWealthOnboarding,
  useWealthMutations,
  useWealthOnboardingStatus,
} from "@/hooks/useWealthMutations";
import {
  WealthOnboardingBanner,
  WealthOpeningBalanceDrawer,
} from "@/components/budget/WealthOpeningBalanceDrawer";
import { ManageCategoriesDrawer } from "@/components/budget/ManageCategoriesDrawer";
import { ManageBudgetCurrenciesDrawer } from "@/components/budget/ManageBudgetCurrenciesDrawer";
import { WealthAccountsPanel } from "@/components/budget/WealthAccountsPanel";
import {
  AddWealthAccountDrawer,
  EditWealthAccountDrawer,
} from "@/components/budget/AddWealthAccountDrawer";
import { BudgetMonthPicker } from "@/components/budget/BudgetMonthPicker";
import { BudgetPeriodStatusBar } from "@/components/budget/BudgetPeriodStatusBar";
import { BudgetGroupSection } from "@/components/budget/BudgetGroupSection";
import { BudgetEntryList } from "@/components/budget/BudgetEntryList";
import { AddBudgetEntryDrawer, EditBudgetTargetDrawer } from "@/components/budget/BudgetDrawers";
import { RefreshButton } from "@/components/ui/refresh-button";
import { BUDGET_GROUP_LABELS } from "@/types/budget";
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

  const [currency, setCurrency] = useState<CurrencyType>(defaultCurrency);
  const [monthKey, setMonthKey] = useState(currentMonthStr());
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [currenciesOpen, setCurrenciesOpen] = useState(false);
  const [wealthBalanceOpen, setWealthBalanceOpen] = useState(false);
  const [wealthFocusAccountId, setWealthFocusAccountId] = useState<string | null>(null);
  const [wealthAddOpen, setWealthAddOpen] = useState(false);
  const [wealthEditId, setWealthEditId] = useState<string | null>(null);
  const [targetEdit, setTargetEdit] = useState<{ id: string; name: string; target: number } | null>(
    null
  );

  const { data: budgetCurrencyRows = [], isLoading: currenciesLoading } = useBudgetCurrencies(
    profile?.id,
    profile?.region
  );
  const budgetCurrencies = useMemo(
    () => budgetCurrencyRows.map((r) => r.currency as CurrencyType),
    [budgetCurrencyRows]
  );
  const { addCurrency, removeCurrency } = useBudgetCurrencyMutations(profile?.id);

  const resolvedCurrency = useMemo((): CurrencyType => {
    if (budgetCurrencies.length === 0) return currency;
    if (budgetCurrencies.includes(currency)) return currency;
    return budgetCurrencies.includes(defaultCurrency) ? defaultCurrency : budgetCurrencies[0];
  }, [budgetCurrencies, currency, defaultCurrency]);

  const {
    data: period,
    isLoading: periodLoading,
    isFetching,
    error: periodError,
    refetch,
  } = useBudgetSetup(resolvedCurrency, monthKey, profile?.id);

  const periodId = period?.id;
  const setupReady = Boolean(periodId);

  const { data: categories = [] } = useBudgetCategories(resolvedCurrency, setupReady);
  const { data: wealthAccounts = [] } = useWealthAccounts(resolvedCurrency, setupReady);
  const { data: cardAccounts = [] } = useCardAccounts(resolvedCurrency, setupReady);
  const { data: onboardingStatus } = useWealthOnboardingStatus(
    profile?.id,
    resolvedCurrency,
    setupReady
  );
  const { data: targets = [] } = useBudgetTargets(periodId);
  const { data: entries = [] } = useBudgetEntries(periodId);

  const { addEntry, deleteEntry, upsertTarget, togglePeriodStatus } = useBudgetMutations(
    resolvedCurrency,
    periodId,
    monthKey
  );
  const { createCategory, updateCategory, deleteCategory } = useCategoryMutations(
    resolvedCurrency,
    profile?.id
  );
  const {
    setOpeningBalance,
    setOpeningBalancesBatch,
    createWealthAccount,
    updateWealthAccount,
    deleteWealthAccount,
  } = useWealthMutations(resolvedCurrency, profile?.id);

  const wealthEditAccount = wealthEditId
    ? wealthAccounts.find((a) => a.id === wealthEditId)
    : undefined;

  function openWealthBalances(accountId: string | null) {
    setWealthFocusAccountId(accountId);
    setWealthBalanceOpen(true);
  }

  function handleDismissWealthOnboarding() {
    if (profile?.id) {
      dismissWealthOnboarding(profile.id, resolvedCurrency);
      void queryClient.invalidateQueries({
        queryKey: ["budget", "wealth-onboarding", profile.id, resolvedCurrency],
      });
    }
  }

  const activeGroups = useMemo(() => getActiveGroupOrder(categories), [categories]);

  const summary = useMemo(() => {
    if (!categories.length) return null;
    return computeBudgetSummary(categories, targets, entries);
  }, [categories, targets, entries]);

  const targetCategoryName = targetEdit && categories.find((c) => c.id === targetEdit.id)?.name;
  const periodClosed = period ? isBudgetPeriodClosed(period) : false;

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
      <div className="flex flex-wrap items-center gap-2">
        {currenciesLoading ? (
          <div className="bg-muted h-8 w-24 animate-pulse rounded-full" />
        ) : (
          budgetCurrencies.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                resolvedCurrency === c
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              )}
            >
              {c}
            </button>
          ))
        )}
        <button
          type="button"
          onClick={() => setCurrenciesOpen(true)}
          className="border-border/60 text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium"
          title="Manage budget currencies"
        >
          <Coins className="h-3.5 w-3.5" />
          Currencies
        </button>
      </div>

      <BudgetMonthPicker monthKey={monthKey} onMonthChange={setMonthKey} />

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

      {!periodLoading && period && !periodError && (
        <BudgetPeriodStatusBar
          period={period}
          monthKey={monthKey}
          isPending={togglePeriodStatus.isPending}
          onToggleStatus={(status) => {
            if (!periodId) return;
            togglePeriodStatus.mutate({ periodId, status });
          }}
        />
      )}

      {!periodLoading && period && !periodError && !summary && (
        <div className="border-border/60 rounded-xl border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">No categories for {resolvedCurrency} yet.</p>
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
              value={formatCurrency(summary.period.income_total, resolvedCurrency)}
              accent="green"
            />
            <SummaryCard
              label="Living"
              value={formatCurrency(
                summary.period.essentials_spent + summary.period.lifestyle_spent,
                resolvedCurrency
              )}
            />
            <SummaryCard
              label="Saved & invested"
              value={formatCurrency(
                summary.period.savings_allocated + summary.period.investments_allocated,
                resolvedCurrency
              )}
            />
            <SummaryCard
              label="Net flow"
              value={formatCurrency(summary.period.net_cash_flow, resolvedCurrency)}
              accent={summary.period.net_cash_flow >= 0 ? "green" : "rose"}
              sub={`Unallocated ${formatCurrency(summary.period.unallocated_income, resolvedCurrency)}`}
            />
          </motion.div>

          {onboardingStatus?.needsOnboarding && wealthAccounts.length > 0 && (
            <WealthOnboardingBanner
              currency={resolvedCurrency}
              accountCount={wealthAccounts.length}
              onSetBalances={() => openWealthBalances(null)}
              onDismiss={handleDismissWealthOnboarding}
            />
          )}

          <WealthAccountsPanel
            accounts={wealthAccounts}
            currency={resolvedCurrency}
            onAddAccount={() => setWealthAddOpen(true)}
            onEditBalance={(accountId) => openWealthBalances(accountId)}
            onEditAccount={(accountId) => setWealthEditId(accountId)}
          />

          <div className="space-y-3">
            {activeGroups.map((groupKey) => (
              <BudgetGroupSection
                key={groupKey}
                groupKey={groupKey}
                label={BUDGET_GROUP_LABELS[groupKey]}
                categories={summary.categories}
                currency={resolvedCurrency}
                defaultOpen={groupKey !== "transfers" && groupKey !== "debt"}
                readOnly={periodClosed}
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
              {!periodClosed && (
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              )}
            </div>
            <BudgetEntryList
              entries={entries.slice(0, 20)}
              currency={resolvedCurrency}
              onDelete={periodClosed ? undefined : (id) => deleteEntry.mutate(id)}
              isDeleting={deleteEntry.isPending}
            />
          </section>
        </>
      )}

      {!periodClosed && (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="bg-primary text-primary-foreground fixed right-6 bottom-20 z-30 flex h-14 w-14 items-center justify-center rounded-full shadow-lg md:bottom-8"
          aria-label="Add budget entry"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <AddBudgetEntryDrawer
        open={addOpen && !periodClosed}
        onClose={() => setAddOpen(false)}
        categories={categories}
        wealthAccounts={wealthAccounts}
        cardAccounts={cardAccounts}
        currency={resolvedCurrency}
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
              wealthAccountId: data.wealth_account_id,
              cardAccountId: data.card_account_id,
            },
            { onSuccess: () => setAddOpen(false) }
          );
        }}
      />

      <ManageCategoriesDrawer
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        currency={resolvedCurrency}
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
        currency={resolvedCurrency}
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

      <AddWealthAccountDrawer
        open={wealthAddOpen}
        onClose={() => setWealthAddOpen(false)}
        currency={resolvedCurrency}
        isPending={createWealthAccount.isPending}
        onSubmit={async (input) => {
          await createWealthAccount.mutateAsync({
            ...input,
            region:
              resolvedCurrency === "PHP"
                ? "PH"
                : resolvedCurrency === "AED"
                  ? "AE"
                  : profile?.region,
          });
        }}
      />

      {wealthEditAccount && (
        <EditWealthAccountDrawer
          open={Boolean(wealthEditId)}
          onClose={() => setWealthEditId(null)}
          currency={resolvedCurrency}
          accountName={wealthEditAccount.name}
          institution={wealthEditAccount.institution}
          isPending={updateWealthAccount.isPending}
          isDeleting={deleteWealthAccount.isPending}
          onSave={async (input) => {
            await updateWealthAccount.mutateAsync({
              accountId: wealthEditAccount.id,
              ...input,
            });
          }}
          onDelete={async () => {
            await deleteWealthAccount.mutateAsync(wealthEditAccount.id);
          }}
        />
      )}

      <ManageBudgetCurrenciesDrawer
        open={currenciesOpen}
        onClose={() => setCurrenciesOpen(false)}
        currencies={budgetCurrencyRows}
        activeCurrency={resolvedCurrency}
        isAdding={addCurrency.isPending}
        isRemoving={removeCurrency.isPending}
        onAdd={async (code) => {
          await addCurrency.mutateAsync(code);
        }}
        onRemove={async (code) => {
          await removeCurrency.mutateAsync(code);
          if (code === resolvedCurrency && budgetCurrencies.length > 1) {
            const next = budgetCurrencies.find((c) => c !== code);
            if (next) setCurrency(next);
          }
        }}
      />

      <EditBudgetTargetDrawer
        open={Boolean(targetEdit)}
        onClose={() => setTargetEdit(null)}
        categoryName={targetCategoryName ?? ""}
        currency={resolvedCurrency}
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
