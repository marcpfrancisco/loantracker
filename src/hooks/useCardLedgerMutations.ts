import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { balanceAdjustmentTxn } from "@/lib/cardRules";
import { supabase } from "@/lib/supabase";
import { cardKeys } from "@/hooks/useCardAccounts";
import type { CardStatementFormInput, CardTransactionFormInput, CardTxnType } from "@/types/cards";
import type { CurrencyType } from "@/types/enums";

function invalidateCardDetail(
  qc: ReturnType<typeof useQueryClient>,
  cardId: string,
  currency?: string
) {
  void qc.invalidateQueries({ queryKey: cardKeys.detail(cardId) });
  void qc.invalidateQueries({ queryKey: cardKeys.transactions(cardId) });
  void qc.invalidateQueries({ queryKey: cardKeys.statements(cardId) });
  void qc.invalidateQueries({ queryKey: cardKeys.all });
  if (currency) {
    void qc.invalidateQueries({ queryKey: cardKeys.byCurrency(currency) });
  }
}

export function useCardLedgerMutations(
  cardId: string,
  currency: CurrencyType,
  userId: string | undefined
) {
  const qc = useQueryClient();

  const invalidate = () => invalidateCardDetail(qc, cardId, currency);

  const addTransaction = useMutation({
    mutationFn: async (input: CardTransactionFormInput) => {
      if (!userId) throw new Error("Not authenticated");

      const { error } = await supabase.from("card_transactions").insert({
        user_id: userId,
        card_account_id: cardId,
        txn_type: input.txn_type,
        amount: input.amount,
        txn_date: input.txn_date,
        merchant: input.merchant?.trim() || null,
        description: input.description?.trim() || null,
        statement_id: input.statement_id ?? null,
        notes: input.notes?.trim() || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Transaction added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteTransaction = useMutation({
    mutationFn: async (transactionId: string) => {
      const { error } = await supabase.from("card_transactions").delete().eq("id", transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Transaction removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const setBalance = useMutation({
    mutationFn: async ({
      currentBalance,
      targetBalance,
      txnDate,
      description,
    }: {
      currentBalance: number;
      targetBalance: number;
      txnDate?: string;
      description?: string;
    }) => {
      if (!userId) throw new Error("Not authenticated");

      const adjustment = balanceAdjustmentTxn(currentBalance, targetBalance);
      if (!adjustment) return;

      const { error } = await supabase.from("card_transactions").insert({
        user_id: userId,
        card_account_id: cardId,
        txn_type: adjustment.txnType,
        amount: adjustment.amount,
        txn_date: txnDate ?? new Date().toISOString().slice(0, 10),
        description: description?.trim() || "Balance adjustment",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Balance updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createStatement = useMutation({
    mutationFn: async (input: CardStatementFormInput) => {
      if (!userId) throw new Error("Not authenticated");

      const { error } = await supabase.from("card_statements").insert({
        user_id: userId,
        card_account_id: cardId,
        period_start: input.period_start,
        period_end: input.period_end,
        statement_balance: input.statement_balance,
        min_payment: input.min_payment ?? null,
        payment_due_date: input.payment_due_date ?? null,
        notes: input.notes?.trim() || null,
        status: "open",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Statement added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const markStatementPaid = useMutation({
    mutationFn: async ({
      statementId,
      amount,
      txnDate,
    }: {
      statementId: string;
      amount: number;
      txnDate?: string;
    }) => {
      if (!userId) throw new Error("Not authenticated");

      const { error: txnError } = await supabase.from("card_transactions").insert({
        user_id: userId,
        card_account_id: cardId,
        statement_id: statementId,
        txn_type: "payment" satisfies CardTxnType,
        amount,
        txn_date: txnDate ?? new Date().toISOString().slice(0, 10),
        description: "Statement payment",
      });

      if (txnError) throw txnError;

      const { error: stmtError } = await supabase
        .from("card_statements")
        .update({ status: "paid", updated_at: new Date().toISOString() })
        .eq("id", statementId);

      if (stmtError) throw stmtError;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Statement marked paid");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteStatement = useMutation({
    mutationFn: async (statementId: string) => {
      const { error } = await supabase.from("card_statements").delete().eq("id", statementId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Statement removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    addTransaction,
    deleteTransaction,
    setBalance,
    createStatement,
    markStatementPaid,
    deleteStatement,
  };
}

/** Insert opening-balance or budget-linked card ledger rows (shared by card + budget mutations). */
export async function insertCardLedgerRow(params: {
  userId: string;
  cardAccountId: string;
  txnType: CardTxnType;
  amount: number;
  txnDate: string;
  description?: string | null;
  merchant?: string | null;
  budgetEntryId?: string | null;
  budgetCategoryId?: string | null;
  statementId?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("card_transactions").insert({
    user_id: params.userId,
    card_account_id: params.cardAccountId,
    txn_type: params.txnType,
    amount: params.amount,
    txn_date: params.txnDate,
    description: params.description?.trim() || null,
    merchant: params.merchant?.trim() || null,
    budget_entry_id: params.budgetEntryId ?? null,
    budget_category_id: params.budgetCategoryId ?? null,
    statement_id: params.statementId ?? null,
  });

  if (error) throw error;
}

export async function deleteCardLedgerForBudgetEntry(budgetEntryId: string): Promise<void> {
  const { error } = await supabase
    .from("card_transactions")
    .delete()
    .eq("budget_entry_id", budgetEntryId);

  if (error) throw error;
}
