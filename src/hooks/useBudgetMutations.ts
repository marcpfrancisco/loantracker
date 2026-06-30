import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { inferEntryType, wealthTxnTypeForEntry } from "@/lib/budgetRules";
import { budgetKeys } from "@/hooks/useBudgetSetup";
import type { BudgetCategory, BudgetEntryType } from "@/types/budget";
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
}

interface UpsertTargetParams {
  periodId: string;
  categoryId: string;
  amountLimit: number;
}

export function useBudgetMutations(currency: CurrencyType, periodId: string | undefined) {
  const qc = useQueryClient();

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: budgetKeys.entries(periodId ?? "") });
    void qc.invalidateQueries({ queryKey: budgetKeys.targets(periodId ?? "") });
    void qc.invalidateQueries({ queryKey: budgetKeys.wealth(currency) });
    void qc.invalidateQueries({ queryKey: budgetKeys.categories(currency) });
    if (periodId) {
      void qc.invalidateQueries({ queryKey: budgetKeys.period(currency, "") });
    }
  };

  const addEntry = useMutation({
    mutationFn: async (params: AddEntryParams) => {
      const entryType: BudgetEntryType = inferEntryType(params.category);
      const wealthAccountId = params.wealthAccountId ?? params.category.wealth_account_id ?? null;

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
      const { error: txnDeleteError } = await supabase
        .from("wealth_transactions")
        .delete()
        .eq("budget_entry_id", entryId);

      if (txnDeleteError) throw txnDeleteError;

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
