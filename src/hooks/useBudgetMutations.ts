import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cardBalanceDeltaForEntry, inferEntryType, wealthTxnTypeForEntry } from "@/lib/budgetRules";
import { budgetKeys } from "@/hooks/useBudgetSetup";
import { cardKeys } from "@/hooks/useCardAccounts";
import type { BudgetCategory, BudgetEntryType } from "@/types/budget";
import type { CardKind } from "@/types/cards";
import type { CurrencyType } from "@/types/enums";

interface AddEntryParams {
  periodId: string;
  userId: string;
  category: BudgetCategory;
  amount: number;
  entryDate: string;
  description?: string;
  notes?: string;
  wealthAccountId?: string | null;
  cardAccountId?: string | null;
}

interface UpsertTargetParams {
  periodId: string;
  categoryId: string;
  amountLimit: number;
}

async function adjustCardBalance(cardAccountId: string, delta: number): Promise<void> {
  const { data: card, error: fetchError } = await supabase
    .from("card_accounts")
    .select("outstanding_balance")
    .eq("id", cardAccountId)
    .single();

  if (fetchError) throw fetchError;

  const newBalance = Math.max(0, Number(card.outstanding_balance) + delta);
  const { error } = await supabase
    .from("card_accounts")
    .update({
      outstanding_balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cardAccountId);

  if (error) throw error;
}

async function syncCardBalanceForEntry(
  cardAccountId: string,
  entryType: BudgetEntryType,
  amount: number,
  direction: "apply" | "reverse"
): Promise<void> {
  const { data: card, error } = await supabase
    .from("card_accounts")
    .select("card_kind")
    .eq("id", cardAccountId)
    .single();

  if (error) throw error;

  const delta = cardBalanceDeltaForEntry(entryType, card.card_kind as CardKind, amount, direction);
  if (delta === null) return;

  await adjustCardBalance(cardAccountId, delta);
}

export function useBudgetMutations(currency: CurrencyType, periodId: string | undefined) {
  const qc = useQueryClient();

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: budgetKeys.entries(periodId ?? "") });
    void qc.invalidateQueries({ queryKey: budgetKeys.targets(periodId ?? "") });
    void qc.invalidateQueries({ queryKey: budgetKeys.wealth(currency) });
    void qc.invalidateQueries({ queryKey: budgetKeys.categories(currency) });
    void qc.invalidateQueries({ queryKey: cardKeys.byCurrency(currency) });
    void qc.invalidateQueries({ queryKey: cardKeys.all });
    if (periodId) {
      void qc.invalidateQueries({ queryKey: budgetKeys.period(currency, "") });
    }
  };

  const addEntry = useMutation({
    mutationFn: async (params: AddEntryParams) => {
      const entryType: BudgetEntryType = inferEntryType(params.category);
      const cardAccountId = params.cardAccountId ?? null;
      const wealthAccountId =
        cardAccountId && entryType === "expense"
          ? null
          : (params.wealthAccountId ?? params.category.wealth_account_id ?? null);

      const { data: entry, error } = await supabase
        .from("budget_entries")
        .insert({
          user_id: params.userId,
          period_id: params.periodId,
          category_id: params.category.id,
          entry_type: entryType,
          amount: params.amount,
          entry_date: params.entryDate,
          description: params.description?.trim() || null,
          notes: params.notes?.trim() || null,
          wealth_account_id: wealthAccountId,
          card_account_id: cardAccountId,
        })
        .select("id")
        .single();

      if (error) throw error;

      const txnType = wealthTxnTypeForEntry(entryType);
      if (wealthAccountId && txnType) {
        const { error: txnError } = await supabase.from("wealth_transactions").insert({
          user_id: params.userId,
          account_id: wealthAccountId,
          txn_type: txnType,
          amount: params.amount,
          txn_date: params.entryDate,
          notes: params.description?.trim() || null,
          budget_entry_id: entry.id,
        });
        if (txnError) throw txnError;
      }

      if (cardAccountId) {
        await syncCardBalanceForEntry(cardAccountId, entryType, params.amount, "apply");
      }

      return entry;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Entry added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const { data: entry, error: fetchError } = await supabase
        .from("budget_entries")
        .select("amount, entry_type, card_account_id, card_accounts(card_kind)")
        .eq("id", entryId)
        .single();

      if (fetchError) throw fetchError;

      const { error: txnDeleteError } = await supabase
        .from("wealth_transactions")
        .delete()
        .eq("budget_entry_id", entryId);

      if (txnDeleteError) throw txnDeleteError;

      if (entry.card_account_id && entry.card_accounts) {
        await syncCardBalanceForEntry(
          entry.card_account_id,
          entry.entry_type as BudgetEntryType,
          Number(entry.amount),
          "reverse"
        );
      }

      const { error } = await supabase.from("budget_entries").delete().eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Entry removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const upsertTarget = useMutation({
    mutationFn: async (params: UpsertTargetParams) => {
      const { error } = await supabase.from("budget_targets").upsert(
        {
          period_id: params.periodId,
          category_id: params.categoryId,
          amount_limit: params.amountLimit,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "period_id,category_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: budgetKeys.targets(periodId ?? "") });
      toast.success("Target updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { addEntry, deleteEntry, upsertTarget };
}
