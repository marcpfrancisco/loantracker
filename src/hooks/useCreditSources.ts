import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { RegionType, CreditSourceType } from "@/types/enums";

export interface CreditSourceOption {
  id: string;
  name: string;
  type: CreditSourceType;
  region: RegionType;
}

export interface CreditSourceRow extends CreditSourceOption {
  is_active: boolean;
}

async function fetchCreditSources(region: RegionType | null): Promise<CreditSourceOption[]> {
  let query = supabase
    .from("credit_sources")
    .select("id, name, type, region")
    .eq("is_active", true)
    .order("name");

  if (region) query = query.eq("region", region);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
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
  const { data, error } = await supabase
    .from("credit_sources")
    .select("id, name, type, region, is_active")
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
