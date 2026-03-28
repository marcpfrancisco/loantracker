import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CurrencyType, LoanStatus, LoanType, RegionType } from "@/types/database";

export interface BorrowerLoanSummary {
  id: string;
  loan_type: LoanType;
  currency: CurrencyType;
  principal: number;
  status: LoanStatus;
  started_at: string;
  source_name: string;
}

export interface BorrowerDetailData {
  id: string;
  full_name: string;
  role: string;
  region: RegionType;
  avatar_url: string | null;
  created_at: string;
  isConfirmed: boolean;
  loans: BorrowerLoanSummary[];
  expenseTab: { id: string; title: string; currency: CurrencyType; status: string } | null;
}

async function fetchBorrowerDetail(borrowerId: string): Promise<BorrowerDetailData> {
  const [profileResult, loansResult, tabResult, confirmResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, region, avatar_url, created_at")
      .eq("id", borrowerId)
      .single(),
    supabase
      .from("loans")
      .select(
        "id, loan_type, currency, principal, status, started_at, credit_sources!loans_source_id_fkey(name)"
      )
      .eq("borrower_id", borrowerId)
      .order("started_at", { ascending: false }),
    supabase
      .from("expense_tabs")
      .select("id, title, currency, status")
      .eq("borrower_id", borrowerId)
      .maybeSingle(),
    supabase.rpc("get_user_confirmation_statuses"),
  ]);

  if (profileResult.error) throw profileResult.error;

  const confirmMap = new Map<string, boolean>(
    (confirmResult.data ?? []).map((r: { id: string; is_confirmed: boolean }) => [
      r.id,
      r.is_confirmed,
    ])
  );

  return {
    ...profileResult.data,
    isConfirmed: confirmMap.get(borrowerId) ?? false,
    loans: (loansResult.data ?? []).map((l) => ({
      id: l.id,
      loan_type: l.loan_type as LoanType,
      currency: l.currency as CurrencyType,
      principal: Number(l.principal),
      status: l.status as LoanStatus,
      started_at: l.started_at,
      source_name: l.credit_sources?.name ?? "Unknown",
    })),
    expenseTab: tabResult.data
      ? {
          id: tabResult.data.id,
          title: tabResult.data.title,
          currency: tabResult.data.currency as CurrencyType,
          status: tabResult.data.status,
        }
      : null,
  };
}

export function useBorrowerDetail(borrowerId: string | undefined) {
  return useQuery({
    queryKey: ["borrower", borrowerId],
    queryFn: () => fetchBorrowerDetail(borrowerId!),
    enabled: !!borrowerId,
  });
}
