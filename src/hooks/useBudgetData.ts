import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { budgetKeys } from "@/hooks/useBudgetSetup";
import type { BudgetEntry, BudgetTarget } from "@/types/budget";

async function fetchTargets(periodId: string): Promise<BudgetTarget[]> {
  const { data, error } = await supabase
    .from("budget_targets")
    .select("*")
    .eq("period_id", periodId);

  if (error) throw error;
  return (data ?? []).map((t) => ({
    ...t,
    amount_limit: Number(t.amount_limit),
  })) as BudgetTarget[];
}

async function fetchEntries(periodId: string): Promise<BudgetEntry[]> {
  const { data, error } = await supabase
    .from("budget_entries")
    .select(
      `*,
       budget_categories(name, group_key)`
    )
    .eq("period_id", periodId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((e) => ({
    ...e,
    amount: Number(e.amount),
  })) as BudgetEntry[];
}

export function useBudgetTargets(periodId: string | undefined) {
  return useQuery({
    queryKey: budgetKeys.targets(periodId ?? ""),
    enabled: Boolean(periodId),
    queryFn: () => fetchTargets(periodId!),
  });
}

export function useBudgetEntries(periodId: string | undefined) {
  return useQuery({
    queryKey: budgetKeys.entries(periodId ?? ""),
    enabled: Boolean(periodId),
    queryFn: () => fetchEntries(periodId!),
  });
}
