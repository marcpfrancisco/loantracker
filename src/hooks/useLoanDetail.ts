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
import type { FirstDueStrategy } from "@/types/schema";

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
  due_day_of_month: number | null;
  notes: string | null;
  first_due_strategy: FirstDueStrategy;
  card_transaction_id: string | null;
  card_transaction: {
    id: string;
    amount: number;
    txn_date: string;
    merchant: string | null;
    description: string | null;
    card_account_id: string;
    card_accounts: { id: string; name: string; currency: string } | null;
  } | null;
  credit_source: { name: string; type: CreditSourceType };
  borrower: { id: string; full_name: string } | null;
  installments: InstallmentDetail[];
}

async function fetchLoanDetail(id: string): Promise<LoanDetail> {
  const { data, error } = await supabase
    .from("loans")
    .select(
      `id, loan_type, currency, principal, interest_rate, service_fee, installments_total, status, region, started_at, ended_at, due_day_of_month, notes, first_due_strategy, card_transaction_id,
       card_transaction:card_transactions!loans_card_transaction_id_fkey(
         id, amount, txn_date, merchant, description, card_account_id,
         card_accounts(id, name, currency)
       ),
       credit_sources!loans_source_id_fkey(name, type),
       profiles!loans_borrower_id_fkey(id, full_name),
       installments(id, installment_no, due_date, amount, status, paid_at, receipt_url)`
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

  const cardTxnRaw = data.card_transaction;
  const cardTxn = Array.isArray(cardTxnRaw) ? cardTxnRaw[0] : cardTxnRaw;

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
    due_day_of_month: data.due_day_of_month !== null ? Number(data.due_day_of_month) : null,
    notes: data.notes,
    first_due_strategy: data.first_due_strategy as FirstDueStrategy,
    card_transaction_id: data.card_transaction_id,
    card_transaction: cardTxn
      ? {
          id: cardTxn.id,
          amount: Number(cardTxn.amount),
          txn_date: cardTxn.txn_date,
          merchant: cardTxn.merchant,
          description: cardTxn.description,
          card_account_id: cardTxn.card_account_id,
          card_accounts: cardTxn.card_accounts ?? null,
        }
      : null,
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
