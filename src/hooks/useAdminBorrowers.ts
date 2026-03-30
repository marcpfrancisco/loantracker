import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { RegionType } from "@/types/enums";

export interface BorrowerSummary {
  id: string;
  full_name: string;
  region: RegionType;
  created_at: string;
  totalLoans: number;
  activeLoans: number;
  isConfirmed: boolean;
}

async function fetchAdminBorrowers(): Promise<BorrowerSummary[]> {
  // Fetch all profiles (borrowers + admin) and their confirmation status in parallel
  const [profilesResult, confirmationResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, region, created_at, loans!loans_borrower_id_fkey(id, status)")
      .order("created_at", { ascending: false }),
    supabase.rpc("get_user_confirmation_statuses"),
  ]);

  if (profilesResult.error) throw profilesResult.error;

  const confirmationMap = new Map<string, boolean>(
    (confirmationResult.data ?? []).map((r: { id: string; is_confirmed: boolean }) => [
      r.id,
      r.is_confirmed,
    ])
  );

  return (profilesResult.data ?? []).map((p) => {
    const loans = p.loans ?? [];
    return {
      id: p.id,
      full_name: p.full_name,
      region: p.region,
      created_at: p.created_at,
      totalLoans: loans.length,
      activeLoans: loans.filter((l) => l.status === "active").length,
      isConfirmed: confirmationMap.get(p.id) ?? false,
    };
  });
}

export function useAdminBorrowers() {
  return useQuery({
    queryKey: ["admin", "borrowers"],
    queryFn: fetchAdminBorrowers,
  });
}
