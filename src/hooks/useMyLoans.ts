import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { CurrencyType, LoanStatus, LoanType, CreditSourceType } from "@/types/database";
import type { LoanCardData } from "@/components/dashboard/LoanCard";

export interface MyLoan extends LoanCardData {
  loan_type: LoanType;
  currency: CurrencyType;
  service_fee: number;
  status: LoanStatus;
  started_at: string;
  credit_source: { name: string; type: CreditSourceType };
}

async function fetchMyLoans(userId: string): Promise<MyLoan[]> {
  const { data, error } = await supabase
    .from("loans")
    .select(
      "id, loan_type, currency, principal, service_fee, installments_total, status, started_at, credit_sources!loans_source_id_fkey(name, type), installments(id, status, due_date)"
    )
    .eq("borrower_id", userId)
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
      started_at: loan.started_at,
      credit_source: {
        name: loan.credit_sources?.name ?? "Unknown",
        type: loan.credit_sources?.type ?? "custom",
      },
      paidCount: installments.filter((i) => i.status === "paid").length,
      pendingCount: installments.filter((i) => i.status === "pending").length,
      nextDueDate: unpaid[0]?.due_date ?? null,
    };
  });
}

export function useMyLoans() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["my-loans", profile?.id],
    queryFn: () => fetchMyLoans(profile!.id),
    enabled: !!profile?.id,
  });
}
