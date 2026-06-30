import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getDefaultCurrency } from "@/lib/countries";
import { normalizeCurrencyCode } from "@/lib/currencies";
import { DEFAULT_CARD_CURRENCIES } from "@/types/cards";
import type { CurrencyType } from "@/types/enums";

export interface CardCurrencyRow {
  id: string;
  user_id: string;
  org_id: string;
  currency: CurrencyType;
  sort_order: number;
  created_at: string;
}

export const cardCurrencyKeys = {
  all: ["cards", "currencies"] as const,
};

async function fetchCardCurrencies(): Promise<CardCurrencyRow[]> {
  const { data, error } = await supabase
    .from("card_currencies")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as CardCurrencyRow[];
}

function defaultSeedCurrencies(profileRegion: string | undefined): CurrencyType[] {
  const home = getDefaultCurrency(profileRegion ?? "PH") as CurrencyType;
  const seeds = new Set<CurrencyType>([...DEFAULT_CARD_CURRENCIES]);
  seeds.add(home);
  const ordered = [home, ...DEFAULT_CARD_CURRENCIES.filter((c) => c !== home)];
  return [...new Set(ordered)];
}

async function ensureDefaultCardCurrencies(
  userId: string,
  profileRegion: string | undefined
): Promise<CardCurrencyRow[]> {
  const existing = await fetchCardCurrencies();
  if (existing.length > 0) return existing;

  const seeds = defaultSeedCurrencies(profileRegion);
  const { data, error } = await supabase
    .from("card_currencies")
    .insert(
      seeds.map((currency, index) => ({
        user_id: userId,
        currency,
        sort_order: index,
      }))
    )
    .select("*");

  if (error) throw error;
  return (data ?? []) as CardCurrencyRow[];
}

export function useCardCurrencies(userId: string | undefined, profileRegion: string | undefined) {
  return useQuery({
    queryKey: cardCurrencyKeys.all,
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      return ensureDefaultCardCurrencies(userId, profileRegion);
    },
    staleTime: 1000 * 60 * 5,
  });
}

async function countCardCurrencyUsage(userId: string, currency: string): Promise<number> {
  const { count, error } = await supabase
    .from("card_accounts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("currency", currency);

  if (error) throw error;
  return count ?? 0;
}

export function useCardCurrencyMutations(userId: string | undefined) {
  const qc = useQueryClient();

  const invalidate = () => void qc.invalidateQueries({ queryKey: cardCurrencyKeys.all });

  const addCurrency = useMutation({
    mutationFn: async (rawCode: string) => {
      if (!userId) throw new Error("Not authenticated");
      const currency = normalizeCurrencyCode(rawCode) as CurrencyType;

      const rows = await fetchCardCurrencies();
      if (rows.some((r) => r.currency === currency)) {
        throw new Error(`${currency} is already in your card currencies.`);
      }

      const { error } = await supabase.from("card_currencies").insert({
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

      const rows = await fetchCardCurrencies();
      if (rows.length <= 1) {
        throw new Error("Keep at least one card currency.");
      }

      const usage = await countCardCurrencyUsage(userId, currency);
      if (usage > 0) {
        throw new Error(
          `Cannot remove ${currency} — it has card accounts. Remove or reassign those cards first.`
        );
      }

      const { error } = await supabase
        .from("card_currencies")
        .delete()
        .eq("user_id", userId)
        .eq("currency", currency);

      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { addCurrency, removeCurrency };
}
