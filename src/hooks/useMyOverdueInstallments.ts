import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { CurrencyType } from "@/types/enums";

export interface MyOverdueInstallment {
  id: string;
  installment_no: number;
  due_date: string;
  amount: number;
  currency: CurrencyType;
  loan_id: string;
  source_name: string;
  days_overdue: number;
}

async function fetchMyOverdueInstallments(): Promise<MyOverdueInstallment[]> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("installments")
    .select(
      "id, installment_no, due_date, amount, loans!installments_loan_id_fkey(id, currency, status, credit_sources!loans_source_id_fkey(name))"
    )
    .in("status", ["unpaid", "pending"])
    .lt("due_date", today)
    .order("due_date", { ascending: true });

  if (error) throw error;

  return (data ?? [])
    .filter((i) => i.loans?.status === "active")
    .map((i) => {
      const due = new Date(i.due_date + "T00:00:00");
      const daysOverdue = Math.floor((Date.now() - due.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: i.id,
        installment_no: i.installment_no,
        due_date: i.due_date,
        amount: Number(i.amount),
        currency: (i.loans?.currency ?? "PHP") as CurrencyType,
        loan_id: i.loans?.id ?? "",
        source_name: i.loans?.credit_sources?.name ?? "Unknown",
        days_overdue: daysOverdue,
      };
    });
}

export function useMyOverdueInstallments() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["my-overdue-installments", profile?.id],
    queryFn: fetchMyOverdueInstallments,
    enabled: !!profile?.id && profile.role !== "admin",
    staleTime: 1000 * 60 * 5,
  });
}
