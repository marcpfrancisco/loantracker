import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getSeedCategories, getSeedWealthAccounts } from "@/lib/budgetSeed";
import { normalizeMonthKey } from "@/lib/budgetRules";
import type { CurrencyType } from "@/types/enums";
import type { BudgetCategory, BudgetPeriod, WealthAccount } from "@/types/budget";

export const budgetKeys = {
  all: ["budget"] as const,
  period: (currency: string, month: string) =>
    ["budget", "period", currency, normalizeMonthKey(month)] as const,
  categories: (currency: string) => ["budget", "categories", currency] as const,
  entries: (periodId: string) => ["budget", "entries", periodId] as const,
  targets: (periodId: string) => ["budget", "targets", periodId] as const,
  wealth: (currency: string) => ["budget", "wealth", currency] as const,
};

async function fetchCategories(currency: CurrencyType): Promise<BudgetCategory[]> {
  const { data, error } = await supabase
    .from("budget_categories")
    .select("*")
    .eq("currency", currency)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as BudgetCategory[];
}

async function fetchWealthAccounts(currency: CurrencyType): Promise<WealthAccount[]> {
  const { data, error } = await supabase
    .from("wealth_accounts")
    .select("*")
    .eq("currency", currency)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as WealthAccount[];
}

async function fetchPeriod(
  currency: CurrencyType,
  periodMonth: string
): Promise<BudgetPeriod | null> {
  const monthKey = normalizeMonthKey(periodMonth);
  const { data, error } = await supabase
    .from("budget_periods")
    .select("*")
    .eq("currency", currency)
    .eq("period_month", monthKey)
    .maybeSingle();

  if (error) throw error;
  return (data as BudgetPeriod | null) ?? null;
}

async function seedBudgetCurrency(currency: CurrencyType, userId: string): Promise<void> {
  const existing = await fetchCategories(currency);
  if (existing.length > 0) return;

  const wealthSeeds = getSeedWealthAccounts(currency);
  const { data: wealthRows, error: wealthError } = await supabase
    .from("wealth_accounts")
    .insert(
      wealthSeeds.map((w) => ({
        user_id: userId,
        name: w.name,
        currency,
        account_kind: w.account_kind,
        region: w.region ?? null,
      }))
    )
    .select("id, name");

  if (wealthError) throw wealthError;

  const wealthByName = new Map((wealthRows ?? []).map((w) => [w.name, w.id]));
  const categorySeeds = getSeedCategories(currency);

  const { error: catError } = await supabase.from("budget_categories").insert(
    categorySeeds.map((c) => ({
      user_id: userId,
      name: c.name,
      group_key: c.group_key,
      entry_type_hint: c.entry_type_hint,
      currency,
      sort_order: c.sort_order,
      wealth_account_id: c.wealth_account_name
        ? (wealthByName.get(c.wealth_account_name) ?? null)
        : null,
    }))
  );

  if (catError) throw catError;
}

async function ensurePeriod(
  currency: CurrencyType,
  periodMonth: string,
  userId: string
): Promise<BudgetPeriod> {
  const monthKey = normalizeMonthKey(periodMonth);
  const existing = await fetchPeriod(currency, monthKey);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("budget_periods")
    .insert({
      user_id: userId,
      currency,
      period_month: monthKey,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as BudgetPeriod;
}

export function useBudgetSetup(
  currency: CurrencyType,
  periodMonth: string,
  userId: string | undefined
) {
  return useQuery({
    queryKey: budgetKeys.period(currency, periodMonth),
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      await seedBudgetCurrency(currency, userId);
      const period = await ensurePeriod(currency, periodMonth, userId);
      return period;
    },
  });
}

export function useBudgetCategories(currency: CurrencyType, enabled: boolean) {
  return useQuery({
    queryKey: budgetKeys.categories(currency),
    enabled,
    queryFn: () => fetchCategories(currency),
  });
}

export function useWealthAccounts(currency: CurrencyType, enabled: boolean) {
  return useQuery({
    queryKey: budgetKeys.wealth(currency),
    enabled,
    queryFn: () => fetchWealthAccounts(currency),
  });
}
