import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { CurrencyType, PaymentStatus } from "@/types/database";

export interface UpcomingInstallment {
  id: string;
  installment_no: number;
  due_date: string;
  amount: number;
  status: PaymentStatus;
  loan_id: string;
  currency: CurrencyType;
  source_name: string;
  borrower_name?: string;
}

async function fetchUpcomingInstallments(
  userId: string,
  isAdmin: boolean
): Promise<UpcomingInstallment[]> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("installments")
    .select(
      "id, installment_no, due_date, amount, status, loans!installments_loan_id_fkey(id, currency, borrower_id, credit_sources!loans_source_id_fkey(name), profiles!loans_borrower_id_fkey(full_name))"
    )
    .in("status", ["unpaid", "pending"])
    .gte("due_date", today)
    .order("due_date", { ascending: true })
    .limit(isAdmin ? 10 : 8);

  if (error) throw error;

  const rows = data ?? [];

  // RLS already filters installments to the borrower's own loans.
  // For admin, RLS returns everything — no client-side filter needed.
  const filtered = isAdmin ? rows : rows.filter((i) => i.loans?.borrower_id === userId);

  return filtered.map((i) => ({
    id: i.id,
    installment_no: i.installment_no,
    due_date: i.due_date,
    amount: Number(i.amount),
    status: i.status,
    loan_id: i.loans?.id ?? "",
    currency: i.loans?.currency ?? "PHP",
    source_name: i.loans?.credit_sources?.name ?? "Unknown",
    borrower_name: i.loans?.profiles?.full_name ?? undefined,
  }));
}

export function useUpcomingInstallments() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  return useQuery({
    queryKey: ["upcoming-installments", profile?.id, isAdmin],
    queryFn: () => fetchUpcomingInstallments(profile!.id, isAdmin),
    enabled: !!profile?.id,
  });
}
