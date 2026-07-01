import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { cardKeys } from "@/hooks/useCardAccounts";
import type { CardAccount, CardStatement, CardTransaction } from "@/types/cards";

async function fetchCardAccount(cardId: string): Promise<CardAccount> {
  const { data, error } = await supabase
    .from("card_accounts")
    .select("*")
    .eq("id", cardId)
    .single();

  if (error) throw error;
  return {
    ...data,
    credit_limit: data.credit_limit != null ? Number(data.credit_limit) : null,
    outstanding_balance: Number(data.outstanding_balance),
    statement_day: data.statement_day,
  } as CardAccount;
}

async function fetchCardTransactions(cardId: string): Promise<CardTransaction[]> {
  const { data, error } = await supabase
    .from("card_transactions")
    .select(
      `*,
       budget_categories(name),
       linked_loan:loans!loans_card_transaction_id_fkey(id, status, installments_total)`
    )
    .eq("card_account_id", cardId)
    .order("txn_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    amount: Number(row.amount),
    linked_loan: Array.isArray(row.linked_loan) ? (row.linked_loan[0] ?? null) : row.linked_loan,
  })) as CardTransaction[];
}

async function fetchCardStatements(cardId: string): Promise<CardStatement[]> {
  const { data, error } = await supabase
    .from("card_statements")
    .select("*")
    .eq("card_account_id", cardId)
    .order("period_end", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    statement_balance: Number(row.statement_balance),
    min_payment: row.min_payment != null ? Number(row.min_payment) : null,
  })) as CardStatement[];
}

export function useCardAccount(cardId: string | undefined) {
  return useQuery({
    queryKey: cardKeys.detail(cardId ?? ""),
    enabled: Boolean(cardId),
    queryFn: () => fetchCardAccount(cardId!),
  });
}

export function useCardTransactions(cardId: string | undefined) {
  return useQuery({
    queryKey: cardKeys.transactions(cardId ?? ""),
    enabled: Boolean(cardId),
    queryFn: () => fetchCardTransactions(cardId!),
  });
}

export function useCardStatements(cardId: string | undefined) {
  return useQuery({
    queryKey: cardKeys.statements(cardId ?? ""),
    enabled: Boolean(cardId),
    queryFn: () => fetchCardStatements(cardId!),
  });
}
