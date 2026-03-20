import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface AdminStats {
  borrowerCount: number;
  pendingProofsCount: number;
  activeLoans: {
    PH: { count: number; totalPrincipal: number };
    UAE: { count: number; totalPrincipal: number };
  };
}

async function fetchAdminStats(): Promise<AdminStats> {
  const [borrowersRes, proofsRes, loansRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "borrower"),
    supabase
      .from("payment_proofs")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase.from("loans").select("region, principal").eq("status", "active"),
  ]);

  if (borrowersRes.error) throw borrowersRes.error;
  if (proofsRes.error) throw proofsRes.error;
  if (loansRes.error) throw loansRes.error;

  const activeLoans = loansRes.data ?? [];

  const ph = activeLoans.filter((l) => l.region === "PH");
  const uae = activeLoans.filter((l) => l.region === "UAE");

  return {
    borrowerCount: borrowersRes.count ?? 0,
    pendingProofsCount: proofsRes.count ?? 0,
    activeLoans: {
      PH: {
        count: ph.length,
        totalPrincipal: ph.reduce((sum, l) => sum + Number(l.principal), 0),
      },
      UAE: {
        count: uae.length,
        totalPrincipal: uae.reduce((sum, l) => sum + Number(l.principal), 0),
      },
    },
  };
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: fetchAdminStats,
  });
}
