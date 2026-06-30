import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { budgetKeys } from "@/hooks/useBudgetSetup";
import type { WealthAccountKind } from "@/types/budget";
import type { CurrencyType } from "@/types/enums";

export interface OpeningBalanceInput {
  accountId: string;
  cashBalance: number;
  marketValue?: number | null;
  notes?: string;
  asOfDate?: string;
}

const ONBOARDING_DISMISS_KEY = (userId: string, currency: string) =>
  `budget-wealth-onboarding-dismissed:${userId}:${currency}`;

export function isWealthOnboardingDismissed(userId: string, currency: string): boolean {
  try {
    return localStorage.getItem(ONBOARDING_DISMISS_KEY(userId, currency)) === "1";
  } catch {
    return false;
  }
}

export function dismissWealthOnboarding(userId: string, currency: string): void {
  try {
    localStorage.setItem(ONBOARDING_DISMISS_KEY(userId, currency), "1");
  } catch {
    /* ignore */
  }
}

async function fetchWealthTransactionCount(
  userId: string,
  currency: CurrencyType
): Promise<number> {
  const { data: accounts, error: accountsError } = await supabase
    .from("wealth_accounts")
    .select("id")
    .eq("user_id", userId)
    .eq("currency", currency);

  if (accountsError) throw accountsError;
  const accountIds = (accounts ?? []).map((a) => a.id);
  if (accountIds.length === 0) return 0;

  const { count, error } = await supabase
    .from("wealth_transactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("account_id", accountIds);

  if (error) throw error;
  return count ?? 0;
}

export function useWealthOnboardingStatus(
  userId: string | undefined,
  currency: CurrencyType,
  enabled: boolean
) {
  return useQuery({
    queryKey: ["budget", "wealth-onboarding", userId ?? "", currency],
    enabled: Boolean(userId) && enabled,
    queryFn: async () => {
      const txnCount = await fetchWealthTransactionCount(userId!, currency);
      const dismissed = userId ? isWealthOnboardingDismissed(userId, currency) : false;
      return {
        needsOnboarding: txnCount === 0 && !dismissed,
        hasAnyTransactions: txnCount > 0,
      };
    },
  });
}

/** Sets cash to an absolute target via deposit/withdrawal delta; sets market_value directly. */
async function applyAbsoluteBalance(userId: string, input: OpeningBalanceInput): Promise<void> {
  const { data: account, error: fetchError } = await supabase
    .from("wealth_accounts")
    .select("cash_balance, market_value")
    .eq("id", input.accountId)
    .eq("user_id", userId)
    .single();

  if (fetchError) throw fetchError;

  const currentCash = Number(account.cash_balance);
  const targetCash = input.cashBalance;
  const txnDate = input.asOfDate ?? new Date().toISOString().slice(0, 10);
  const note = input.notes?.trim() || "Balance update";

  if (targetCash > currentCash) {
    const { error } = await supabase.from("wealth_transactions").insert({
      user_id: userId,
      account_id: input.accountId,
      txn_type: "deposit",
      amount: targetCash - currentCash,
      txn_date: txnDate,
      notes: note,
    });
    if (error) throw error;
  } else if (targetCash < currentCash) {
    const { error } = await supabase.from("wealth_transactions").insert({
      user_id: userId,
      account_id: input.accountId,
      txn_type: "withdrawal",
      amount: currentCash - targetCash,
      txn_date: txnDate,
      notes: note,
    });
    if (error) throw error;
  }

  if (input.marketValue != null) {
    const { error: mvError } = await supabase
      .from("wealth_accounts")
      .update({
        market_value: input.marketValue > 0 ? input.marketValue : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.accountId)
      .eq("user_id", userId);

    if (mvError) throw mvError;
  }
}

export function useWealthMutations(currency: CurrencyType, userId: string | undefined) {
  const qc = useQueryClient();

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: budgetKeys.wealth(currency) });
    void qc.invalidateQueries({
      queryKey: ["budget", "wealth-onboarding", userId ?? "", currency],
    });
  };

  const setOpeningBalance = useMutation({
    mutationFn: async (input: OpeningBalanceInput) => {
      if (!userId) throw new Error("Not authenticated");
      if (input.cashBalance < 0) throw new Error("Balance cannot be negative");
      if (input.cashBalance === 0 && (input.marketValue ?? 0) <= 0) {
        throw new Error("Enter a balance greater than zero");
      }
      await applyAbsoluteBalance(userId, input);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Balance updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const setOpeningBalancesBatch = useMutation({
    mutationFn: async (inputs: OpeningBalanceInput[]) => {
      if (!userId) throw new Error("Not authenticated");
      const toSave = inputs.filter(
        (i) => i.cashBalance > 0 || (i.marketValue != null && i.marketValue > 0)
      );
      if (toSave.length === 0) {
        throw new Error("Enter at least one balance");
      }
      for (const input of toSave) {
        await applyAbsoluteBalance(userId, {
          ...input,
          notes: input.notes ?? "Opening balance",
        });
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Starting balances saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createWealthAccount = useMutation({
    mutationFn: async (params: {
      name: string;
      account_kind: WealthAccountKind;
      institution?: string;
      region?: string;
      openingCash?: number;
      openingMarketValue?: number | null;
    }) => {
      if (!userId) throw new Error("Not authenticated");

      const { data: account, error } = await supabase
        .from("wealth_accounts")
        .insert({
          user_id: userId,
          name: params.name.trim(),
          currency,
          account_kind: params.account_kind,
          institution: params.institution?.trim() || null,
          region: params.region ?? null,
        })
        .select("id")
        .single();

      if (error) throw error;

      if ((params.openingCash ?? 0) > 0 || (params.openingMarketValue ?? 0) > 0) {
        await applyAbsoluteBalance(userId, {
          accountId: account.id,
          cashBalance: params.openingCash ?? 0,
          marketValue: params.openingMarketValue ?? null,
          notes: "Opening balance",
        });
      }

      return account;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Account added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateWealthAccount = useMutation({
    mutationFn: async (params: { accountId: string; name: string; institution: string | null }) => {
      if (!userId) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("wealth_accounts")
        .update({
          name: params.name.trim(),
          institution: params.institution,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.accountId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Account updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteWealthAccount = useMutation({
    mutationFn: async (accountId: string) => {
      if (!userId) throw new Error("Not authenticated");

      const { count: entryCount, error: entryError } = await supabase
        .from("budget_entries")
        .select("*", { count: "exact", head: true })
        .eq("wealth_account_id", accountId);

      if (entryError) throw entryError;
      if ((entryCount ?? 0) > 0) {
        throw new Error(
          "This account has budget entries linked to it. Remove those entries first."
        );
      }

      const { error: unlinkError } = await supabase
        .from("budget_categories")
        .update({ wealth_account_id: null })
        .eq("wealth_account_id", accountId)
        .eq("user_id", userId);

      if (unlinkError) throw unlinkError;

      const { error } = await supabase
        .from("wealth_accounts")
        .delete()
        .eq("id", accountId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      void qc.invalidateQueries({ queryKey: budgetKeys.categories(currency) });
      toast.success("Account removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    setOpeningBalance,
    setOpeningBalancesBatch,
    createWealthAccount,
    updateWealthAccount,
    deleteWealthAccount,
  };
}
