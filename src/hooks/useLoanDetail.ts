import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  CurrencyType,
  LoanStatus,
  LoanType,
  CreditSourceType,
  RegionType,
  PaymentStatus,
} from "@/types/enums";

export interface InstallmentDetail {
  id: string;
  installment_no: number;
  due_date: string;
  amount: number;
  status: PaymentStatus;
  paid_at: string | null;
  receipt_url: string | null;
}

export interface LoanDetail {
  id: string;
  loan_type: LoanType;
  currency: CurrencyType;
  principal: number;
  interest_rate: number | null;
  service_fee: number;
  installments_total: number;
  status: LoanStatus;
  region: RegionType;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  credit_source: { name: string; type: CreditSourceType };
  borrower: { id: string; full_name: string } | null;
  installments: InstallmentDetail[];
}

async function fetchLoanDetail(id: string): Promise<LoanDetail> {
  const { data, error } = await supabase
    .from("loans")
    .select(
      "id, loan_type, currency, principal, interest_rate, service_fee, installments_total, status, region, started_at, ended_at, notes, credit_sources!loans_source_id_fkey(name, type), profiles!loans_borrower_id_fkey(id, full_name), installments(id, installment_no, due_date, amount, status, paid_at, receipt_url)"
    )
    .eq("id", id)
    .single();

  if (error) throw error;

  const installments = (data.installments ?? [])
    .map((i) => ({
      id: i.id,
      installment_no: i.installment_no,
      due_date: i.due_date,
      amount: Number(i.amount),
      status: i.status,
      paid_at: i.paid_at,
      receipt_url: i.receipt_url,
    }))
    .sort((a, b) => a.installment_no - b.installment_no);

  return {
    id: data.id,
    loan_type: data.loan_type,
    currency: data.currency,
    principal: Number(data.principal),
    interest_rate: data.interest_rate !== null ? Number(data.interest_rate) : null,
    service_fee: Number(data.service_fee),
    installments_total: data.installments_total,
    status: data.status,
    region: data.region,
    started_at: data.started_at,
    ended_at: data.ended_at,
    notes: data.notes,
    credit_source: {
      name: data.credit_sources?.name ?? "Unknown",
      type: data.credit_sources?.type ?? "custom",
    },
    borrower: data.profiles ? { id: data.profiles.id, full_name: data.profiles.full_name } : null,
    installments,
  };
}

export function useLoanDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["loan", id],
    queryFn: () => fetchLoanDetail(id!),
    enabled: !!id,
    // 30s staleTime: prevents redundant refetches while the user is on the page.
    // Invalidation from mutations bypasses this immediately, so post-update
    // background refetches still happen to reconcile server truth.
    staleTime: 1000 * 30,
  });
}
