import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { RegionType } from "@/types/database";

export interface BorrowerSummary {
  id: string;
  full_name: string;
  region: RegionType;
  created_at: string;
  totalLoans: number;
  activeLoans: number;
}

async function fetchAdminBorrowers(): Promise<BorrowerSummary[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, region, created_at, loans!loans_borrower_id_fkey(id, status)")
    .eq("role", "borrower")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((p) => {
    const loans = p.loans ?? [];
    return {
      id: p.id,
      full_name: p.full_name,
      region: p.region,
      created_at: p.created_at,
      totalLoans: loans.length,
      activeLoans: loans.filter((l) => l.status === "active").length,
    };
  });
}

export function useAdminBorrowers() {
  return useQuery({
    queryKey: ["admin", "borrowers"],
    queryFn: fetchAdminBorrowers,
  });
}
