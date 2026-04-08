import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface RegionStat {
  count: number;
  totalPrincipal: number;
  currency: string;
}

export interface AdminStats {
  borrowerCount: number;
  pendingProofsCount: number;
  defaultedCount: number;
  /** Keyed by ISO 3166-1 alpha-2 region code, e.g. "PH", "AE" */
  activeLoans: Record<string, RegionStat>;
  /** Keyed by ISO 4217 currency code, e.g. "PHP", "AED" */
  portfolioOutstanding: Record<string, number>;
}

async function fetchAdminStats(): Promise<AdminStats> {
  const [borrowersRes, proofsRes, activeLoansRes, defaultedRes, paidRes] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "borrower"),

    supabase
      .from("payment_proofs")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),

    supabase
      .from("loans")
      .select("id, region, principal, service_fee, interest_rate, currency")
      .eq("status", "active"),

    supabase.from("loans").select("id", { count: "exact", head: true }).eq("status", "defaulted"),

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

  // Group active loans by region
  const activeLoansMap: Record<string, RegionStat> = {};
  for (const loan of activeLoans) {
    const region = loan.region ?? "??";
    const currency = loan.currency ?? "";
    if (!activeLoansMap[region]) {
      activeLoansMap[region] = { count: 0, totalPrincipal: 0, currency };
    }
    activeLoansMap[region].count += 1;
    activeLoansMap[region].totalPrincipal += Number(loan.principal);
  }

  // Total disbursed and collected grouped by currency
  const disbursedByCurrency: Record<string, number> = {};
  for (const loan of activeLoans) {
    const currency = loan.currency ?? "";
    disbursedByCurrency[currency] =
      (disbursedByCurrency[currency] ?? 0) +
      Number(loan.principal) +
      Number(loan.service_fee);
  }

  const paidRows = (paidRes.data ?? []).filter((i) => i.loans?.status === "active");
  const collectedByCurrency: Record<string, number> = {};
  for (const row of paidRows) {
    const currency = row.loans?.currency ?? "";
    collectedByCurrency[currency] = (collectedByCurrency[currency] ?? 0) + Number(row.amount);
  }

  // Outstanding = disbursed - collected, floor at 0
  const portfolioOutstanding: Record<string, number> = {};
  for (const currency of Object.keys(disbursedByCurrency)) {
    portfolioOutstanding[currency] = Math.max(
      0,
      disbursedByCurrency[currency] - (collectedByCurrency[currency] ?? 0)
    );
  }

  return {
    borrowerCount: borrowersRes.count ?? 0,
    pendingProofsCount: proofsRes.count ?? 0,
    defaultedCount: defaultedRes.count ?? 0,
    activeLoans: activeLoansMap,
    portfolioOutstanding,
  };
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: fetchAdminStats,
    staleTime: 1000 * 60 * 3,
  });
}
