import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CurrencyType } from "@/types/enums";

export interface PendingProofItem {
  id: string;
  installment_id: string;
  loan_id: string;
  installment_no: number;
  amount: number;
  currency: CurrencyType;
  source_name: string;
  borrower_name: string;
  note: string | null;
  submitted_at: string;
}

async function fetchAdminPendingProofs(): Promise<PendingProofItem[]> {
  const { data, error } = await supabase
    .from("payment_proofs")
    .select(
      "id, note, created_at, installments!payment_proofs_installment_id_fkey(id, installment_no, amount, loans!installments_loan_id_fkey(id, currency, credit_sources!loans_source_id_fkey(name), profiles!loans_borrower_id_fkey(full_name)))"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) throw error;

  return (data ?? []).map((p) => ({
    id: p.id,
    installment_id: p.installments?.id ?? "",
    loan_id: p.installments?.loans?.id ?? "",
    installment_no: p.installments?.installment_no ?? 0,
    amount: Number(p.installments?.amount ?? 0),
    currency: (p.installments?.loans?.currency ?? "PHP") as CurrencyType,
    source_name: p.installments?.loans?.credit_sources?.name ?? "Unknown",
    borrower_name: p.installments?.loans?.profiles?.full_name ?? "Unknown",
    note: p.note ?? null,
    submitted_at: p.created_at,
  }));
}

export function useAdminPendingProofs() {
  return useQuery({
    queryKey: ["admin", "pending-proofs-detail"],
    queryFn: fetchAdminPendingProofs,
    staleTime: 1000 * 60 * 2,
  });
}
