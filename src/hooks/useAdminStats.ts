import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface AdminStats {
  borrowerCount: number;
  pendingProofsCount: number;
  defaultedCount: number;
  activeLoans: {
    PH: { count: number; totalPrincipal: number };
    UAE: { count: number; totalPrincipal: number };
  };
  portfolioOutstanding: {
    PHP: number;
    AED: number;
  };
}

async function fetchAdminStats(): Promise<AdminStats> {
  const [borrowersRes, proofsRes, activeLoansRes, defaultedRes, paidRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "borrower"),

    supabase
      .from("payment_proofs")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),

    supabase
      .from("loans")
      .select("id, region, principal, service_fee, interest_rate, currency")
      .eq("status", "active"),

    supabase
      .from("loans")
      .select("id", { count: "exact", head: true })
      .eq("status", "defaulted"),

    // Sum of paid installment amounts grouped by loan currency
    supabase
      .from("installments")
      .select("amount, loans!installments_loan_id_fkey(currency, status)")
      .eq("status", "paid"),
  ]);

  if (borrowersRes.error) throw borrowersRes.error;
  if (proofsRes.error) throw proofsRes.error;
  if (activeLoansRes.error) throw activeLoansRes.error;
  if (defaultedRes.error) throw defaultedRes.error;
  if (paidRes.error) throw paidRes.error;

  const activeLoans = activeLoansRes.data ?? [];
  const ph = activeLoans.filter((l) => l.region === "PH");
  const uae = activeLoans.filter((l) => l.region === "UAE");

  // Total amount disbursed (principal + service_fee) across active loans
  const totalDisbursedPHP = activeLoans
    .filter((l) => l.currency === "PHP")
    .reduce((sum, l) => sum + Number(l.principal) + Number(l.service_fee), 0);
  const totalDisbursedAED = activeLoans
    .filter((l) => l.currency === "AED")
    .reduce((sum, l) => sum + Number(l.principal) + Number(l.service_fee), 0);

  // Total already collected from paid installments on active loans
  const paidRows = (paidRes.data ?? []).filter((i) => i.loans?.status === "active");
  const collectedPHP = paidRows
    .filter((i) => i.loans?.currency === "PHP")
    .reduce((sum, i) => sum + Number(i.amount), 0);
  const collectedAED = paidRows
    .filter((i) => i.loans?.currency === "AED")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  return {
    borrowerCount: borrowersRes.count ?? 0,
    pendingProofsCount: proofsRes.count ?? 0,
    defaultedCount: defaultedRes.count ?? 0,
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
    portfolioOutstanding: {
      PHP: Math.max(0, totalDisbursedPHP - collectedPHP),
      AED: Math.max(0, totalDisbursedAED - collectedAED),
    },
  };
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: fetchAdminStats,
    staleTime: 1000 * 60 * 3,
  });
}
