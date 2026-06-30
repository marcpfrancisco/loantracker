import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  defaultEntryTypeForGroup,
  defaultWealthKindForGroup,
  nextCategorySortOrder,
} from "@/lib/budgetRules";
import { budgetKeys } from "@/hooks/useBudgetSetup";
import type {
  BudgetCategory,
  BudgetEntryTypeHint,
  BudgetGroupKey,
  WealthAccountKind,
} from "@/types/budget";
import type { CurrencyType } from "@/types/enums";

export interface CategoryFormInput {
  name: string;
  group_key: BudgetGroupKey;
  entry_type_hint: BudgetEntryTypeHint;
  wealth_account_id?: string | null;
  create_wealth_account?: boolean;
  wealth_account_kind?: WealthAccountKind;
}

async function countCategoryEntries(categoryId: string): Promise<number> {
  const { count, error } = await supabase
    .from("budget_entries")
    .select("*", { count: "exact", head: true })
    .eq("category_id", categoryId);

  if (error) throw error;
  return count ?? 0;
}

export function useCategoryMutations(currency: CurrencyType, userId: string | undefined) {
  const qc = useQueryClient();

  const invalidateCategories = () => {
    void qc.invalidateQueries({ queryKey: budgetKeys.categories(currency) });
    void qc.invalidateQueries({ queryKey: budgetKeys.wealth(currency) });
  };

  const createCategory = useMutation({
    mutationFn: async (input: CategoryFormInput) => {
      if (!userId) throw new Error("Not authenticated");

      const { data: existingCats, error: fetchError } = await supabase
        .from("budget_categories")
        .select("id, group_key, sort_order")
        .eq("currency", currency);

      if (fetchError) throw fetchError;

      const sort_order = nextCategorySortOrder(
        (existingCats ?? []).map((c) => ({
          group_key: c.group_key as BudgetGroupKey,
          sort_order: c.sort_order,
        })),
        input.group_key
      );

      let wealthAccountId = input.wealth_account_id ?? null;

      if (
        input.entry_type_hint === "allocation" &&
        input.create_wealth_account &&
        !wealthAccountId
      ) {
        const kind = input.wealth_account_kind ?? defaultWealthKindForGroup(input.group_key);
        const { data: account, error: accountError } = await supabase
          .from("wealth_accounts")
          .insert({
            user_id: userId,
            name: input.name.trim(),
            currency,
            account_kind: kind,
          })
          .select("id")
          .single();

        if (accountError) throw accountError;
        wealthAccountId = account.id;
      }

      const { data, error } = await supabase
        .from("budget_categories")
        .insert({
          user_id: userId,
          name: input.name.trim(),
          group_key: input.group_key,
          entry_type_hint: input.entry_type_hint,
          currency,
          sort_order,
          wealth_account_id: input.entry_type_hint === "allocation" ? wealthAccountId : null,
        })
        .select("*")
        .single();

      if (error) throw error;
      return data as BudgetCategory;
    },
    onSuccess: () => {
      invalidateCategories();
      toast.success("Category added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateCategory = useMutation({
    mutationFn: async ({ categoryId, input }: { categoryId: string; input: CategoryFormInput }) => {
      if (!userId) throw new Error("Not authenticated");

      let wealthAccountId = input.wealth_account_id ?? null;

      if (
        input.entry_type_hint === "allocation" &&
        input.create_wealth_account &&
        !wealthAccountId
      ) {
        const kind = input.wealth_account_kind ?? defaultWealthKindForGroup(input.group_key);
        const { data: account, error: accountError } = await supabase
          .from("wealth_accounts")
          .insert({
            user_id: userId,
            name: input.name.trim(),
            currency,
            account_kind: kind,
          })
          .select("id")
          .single();

        if (accountError) throw accountError;
        wealthAccountId = account.id;
      }

      const { data, error } = await supabase
        .from("budget_categories")
        .update({
          name: input.name.trim(),
          group_key: input.group_key,
          entry_type_hint: input.entry_type_hint,
          wealth_account_id: input.entry_type_hint === "allocation" ? wealthAccountId : null,
        })
        .eq("id", categoryId)
        .select("*")
        .single();

      if (error) throw error;
      return data as BudgetCategory;
    },
    onSuccess: () => {
      invalidateCategories();
      toast.success("Category updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteCategory = useMutation({
    mutationFn: async (categoryId: string) => {
      const entryCount = await countCategoryEntries(categoryId);
      if (entryCount > 0) {
        throw new Error(
          `This category has ${entryCount} entr${entryCount === 1 ? "y" : "ies"}. Remove or reassign them before deleting.`
        );
      }

      const { error } = await supabase.from("budget_categories").delete().eq("id", categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCategories();
      toast.success("Category deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { createCategory, updateCategory, deleteCategory };
}

/** Build sensible defaults for a new category form. */
export function buildCategoryFormDefaults(
  groupKey: BudgetGroupKey = "essentials"
): CategoryFormInput {
  return {
    name: "",
    group_key: groupKey,
    entry_type_hint: defaultEntryTypeForGroup(groupKey),
    wealth_account_id: null,
    create_wealth_account: false,
    wealth_account_kind: defaultWealthKindForGroup(groupKey),
  };
}
