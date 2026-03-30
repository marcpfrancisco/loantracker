import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CurrencyType } from "@/types/enums";

export interface OverdueInstallment {
  id: string;
  installment_no: number;
  due_date: string;
  amount: number;
  currency: CurrencyType;
  loan_id: string;
  source_name: string;
  borrower_name: string;
  days_overdue: number;
}

async function fetchOverdueInstallments(): Promise<OverdueInstallment[]> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("installments")
    .select(
      "id, installment_no, due_date, amount, loans!installments_loan_id_fkey(id, currency, status, credit_sources!loans_source_id_fkey(name), profiles!loans_borrower_id_fkey(full_name))"
    )
    .in("status", ["unpaid", "pending"])
    .lt("due_date", today)
    .order("due_date", { ascending: true })
    .limit(20);

  if (error) throw error;

  return (
    (data ?? [])
      // Only show overdue on active loans — skip defaulted/cancelled/completed
      .filter((i) => i.loans?.status === "active")
      .map((i) => {
        const due = new Date(i.due_date + "T00:00:00");
        const now = new Date();
        const diffMs = now.getTime() - due.getTime();
        const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        return {
          id: i.id,
          installment_no: i.installment_no,
          due_date: i.due_date,
          amount: Number(i.amount),
          currency: (i.loans?.currency ?? "PHP") as CurrencyType,
          loan_id: i.loans?.id ?? "",
          source_name: i.loans?.credit_sources?.name ?? "Unknown",
          borrower_name: i.loans?.profiles?.full_name ?? "Unknown",
          days_overdue: daysOverdue,
        };
      })
  );
}

export function useOverdueInstallments() {
  return useQuery({
    queryKey: ["admin", "overdue-installments"],
    queryFn: fetchOverdueInstallments,
    staleTime: 1000 * 60 * 5,
  });
}
