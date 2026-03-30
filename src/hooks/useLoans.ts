import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  CurrencyType,
  LoanStatus,
  LoanType,
  CreditSourceType,
  RegionType,
} from "@/types/database";

export interface LoanListItem {
  id: string;
  loan_type: LoanType;
  currency: CurrencyType;
  principal: number;
  service_fee: number;
  installments_total: number;
  status: LoanStatus;
  region: RegionType;
  started_at: string;
  credit_source: { name: string; type: CreditSourceType };
  borrower: { id: string; full_name: string } | null;
  paidCount: number;
  pendingCount: number;
  nextDueDate: string | null;
}

async function fetchLoans(): Promise<LoanListItem[]> {
  const { data, error } = await supabase
    .from("loans")
    .select(
      "id, loan_type, currency, principal, service_fee, installments_total, status, region, started_at, credit_sources!loans_source_id_fkey(name, type), profiles!loans_borrower_id_fkey(id, full_name), installments(id, status, due_date)"
    )
    .order("started_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((loan) => {
    const installments = loan.installments ?? [];
    const unpaid = installments
      .filter((i) => i.status === "unpaid")
      .sort((a, b) => a.due_date.localeCompare(b.due_date));

    return {
      id: loan.id,
      loan_type: loan.loan_type,
      currency: loan.currency,
      principal: Number(loan.principal),
      service_fee: Number(loan.service_fee),
      installments_total: loan.installments_total,
      status: loan.status,
      region: loan.region,
      started_at: loan.started_at,
      credit_source: {
        name: loan.credit_sources?.name ?? "Unknown",
        type: loan.credit_sources?.type ?? "custom",
      },
      borrower: loan.profiles ? { id: loan.profiles.id, full_name: loan.profiles.full_name } : null,
      paidCount: installments.filter((i) => i.status === "paid").length,
      pendingCount: installments.filter((i) => i.status === "pending").length,
      nextDueDate: unpaid[0]?.due_date ?? null,
    };
  });
}

export function useLoans() {
  return useQuery({
    queryKey: ["loans"],
    queryFn: fetchLoans,
  });
}
