import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { RegionType, CreditSourceType } from "@/types/enums";

export interface CreditSourceOption {
  id: string;
  name: string;
  type: CreditSourceType;
  region: RegionType;
  default_interest_rate: number | null;
  default_installments: number | null;
  default_due_day: number | null;
}

export interface CreditSourceRow extends CreditSourceOption {
  is_active: boolean;
}

async function fetchCreditSources(region: RegionType | null): Promise<CreditSourceOption[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("credit_sources")
    .select("id, name, type, region, default_interest_rate, default_installments, default_due_day")
    .eq("is_active", true)
    .order("name");

  if (region) query = query.eq("region", region);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CreditSourceOption[];
}

export function useCreditSources(region: RegionType | null) {
  return useQuery({
    queryKey: ["credit-sources", region],
    queryFn: () => fetchCreditSources(region),
    enabled: region !== null,
    staleTime: 1000 * 60 * 5, // credit sources rarely change
  });
}

// ── Admin: all sources including inactive ─────────────────────────────────────

async function fetchAllCreditSources(): Promise<CreditSourceRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("credit_sources")
    .select("id, name, type, region, is_active, default_interest_rate, default_installments, default_due_day")
    .order("region")
    .order("name");
  if (error) throw error;
  return (data ?? []) as CreditSourceRow[];
}

export function useAllCreditSources() {
  return useQuery<CreditSourceRow[]>({
    queryKey: ["credit-sources", "admin"],
    queryFn: fetchAllCreditSources,
  });
}
