import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getDefaultCurrency } from "@/lib/countries";
import { normalizeCurrencyCode } from "@/lib/currencies";
import { DEFAULT_BUDGET_CURRENCIES } from "@/types/budget";
import type { CurrencyType } from "@/types/enums";

export interface BudgetCurrencyRow {
  id: string;
  user_id: string;
  org_id: string;
  currency: CurrencyType;
  sort_order: number;
  created_at: string;
}

export const budgetCurrencyKeys = {
  all: ["budget", "currencies"] as const,
};

async function fetchBudgetCurrencies(): Promise<BudgetCurrencyRow[]> {
  const { data, error } = await supabase
    .from("budget_currencies")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as BudgetCurrencyRow[];
}

function defaultSeedCurrencies(profileRegion: string | undefined): CurrencyType[] {
  const home = getDefaultCurrency(profileRegion ?? "PH") as CurrencyType;
  const seeds = new Set<CurrencyType>([...DEFAULT_BUDGET_CURRENCIES]);
  seeds.add(home);
  const ordered = [home, ...DEFAULT_BUDGET_CURRENCIES.filter((c) => c !== home)];
  return [...new Set(ordered)];
}

async function ensureDefaultBudgetCurrencies(
  userId: string,
  profileRegion: string | undefined
): Promise<BudgetCurrencyRow[]> {
  const existing = await fetchBudgetCurrencies();
  if (existing.length > 0) return existing;

  const seeds = defaultSeedCurrencies(profileRegion);
  const { data, error } = await supabase
    .from("budget_currencies")
    .insert(
      seeds.map((currency, index) => ({
        user_id: userId,
        currency,
        sort_order: index,
      }))
    )
    .select("*");

  if (error) throw error;
  return (data ?? []) as BudgetCurrencyRow[];
}

export function useBudgetCurrencies(userId: string | undefined, profileRegion: string | undefined) {
  return useQuery({
    queryKey: budgetCurrencyKeys.all,
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      return ensureDefaultBudgetCurrencies(userId, profileRegion);
    },
    staleTime: 1000 * 60 * 5,
  });
}

async function countCurrencyUsage(userId: string, currency: string): Promise<number> {
  const [categories, wealth, periods] = await Promise.all([
    supabase
      .from("budget_categories")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("currency", currency),
    supabase
      .from("wealth_accounts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("currency", currency),
    supabase
      .from("budget_periods")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("currency", currency),
  ]);

  if (categories.error) throw categories.error;
  if (wealth.error) throw wealth.error;
  if (periods.error) throw periods.error;

  return (categories.count ?? 0) + (wealth.count ?? 0) + (periods.count ?? 0);
}

export function useBudgetCurrencyMutations(userId: string | undefined) {
  const qc = useQueryClient();

  const invalidate = () => void qc.invalidateQueries({ queryKey: budgetCurrencyKeys.all });

  const addCurrency = useMutation({
    mutationFn: async (rawCode: string) => {
      if (!userId) throw new Error("Not authenticated");
      const currency = normalizeCurrencyCode(rawCode) as CurrencyType;

      const rows = await fetchBudgetCurrencies();
      if (rows.some((r) => r.currency === currency)) {
        throw new Error(`${currency} is already in your budget currencies.`);
      }

      const { error } = await supabase.from("budget_currencies").insert({
        user_id: userId,
        currency,
        sort_order: rows.length,
      });

      if (error) throw error;
      return currency;
    },
    onSuccess: invalidate,
  });

  const removeCurrency = useMutation({
    mutationFn: async (currency: string) => {
      if (!userId) throw new Error("Not authenticated");

      const rows = await fetchBudgetCurrencies();
      if (rows.length <= 1) {
        throw new Error("Keep at least one budget currency.");
      }

      const usage = await countCurrencyUsage(userId, currency);
      if (usage > 0) {
        throw new Error(
          `Cannot remove ${currency} — it has budget categories, wealth accounts, or monthly periods. Clear or move that data first.`
        );
      }

      const { error } = await supabase
        .from("budget_currencies")
        .delete()
        .eq("user_id", userId)
        .eq("currency", currency);

      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { addCurrency, removeCurrency };
}
