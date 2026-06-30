import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CardAccount } from "@/types/cards";
import type { CurrencyType } from "@/types/enums";

export const cardKeys = {
  all: ["cards"] as const,
  byCurrency: (currency: string) => ["cards", currency] as const,
};

async function fetchCardAccounts(currency: CurrencyType): Promise<CardAccount[]> {
  const { data, error } = await supabase
    .from("card_accounts")
    .select("*")
    .eq("currency", currency)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    credit_limit: row.credit_limit != null ? Number(row.credit_limit) : null,
    outstanding_balance: Number(row.outstanding_balance),
    statement_day: row.statement_day,
  })) as CardAccount[];
}

export function useCardAccounts(currency: CurrencyType, enabled = true) {
  return useQuery({
    queryKey: cardKeys.byCurrency(currency),
    enabled,
    queryFn: () => fetchCardAccounts(currency),
  });
}

export function useAllCardAccounts(enabled = true) {
  return useQuery({
    queryKey: cardKeys.all,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_accounts")
        .select("*")
        .eq("is_active", true)
        .order("currency")
        .order("name");

      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        credit_limit: row.credit_limit != null ? Number(row.credit_limit) : null,
        outstanding_balance: Number(row.outstanding_balance),
      })) as CardAccount[];
    },
  });
}
