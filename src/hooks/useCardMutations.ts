import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cardKeys } from "@/hooks/useCardAccounts";
import type { CardAccountFormInput } from "@/types/cards";
import type { CurrencyType } from "@/types/enums";

export function useCardMutations(currency: CurrencyType, userId: string | undefined) {
  const qc = useQueryClient();

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: cardKeys.byCurrency(currency) });
    void qc.invalidateQueries({ queryKey: cardKeys.all });
  };

  const createCard = useMutation({
    mutationFn: async (input: CardAccountFormInput & { region?: string }) => {
      if (!userId) throw new Error("Not authenticated");

      const lastFour = input.last_four?.replace(/\D/g, "").slice(-4) || null;

      const { error } = await supabase.from("card_accounts").insert({
        user_id: userId,
        name: input.name.trim(),
        issuer: input.issuer?.trim() || null,
        card_kind: input.card_kind,
        currency,
        last_four: lastFour,
        credit_limit: input.credit_limit ?? null,
        outstanding_balance: input.outstanding_balance ?? 0,
        statement_day: input.statement_day ?? null,
        notes: input.notes?.trim() || null,
        region: input.region ?? null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Card added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateCard = useMutation({
    mutationFn: async ({
      cardId,
      ...input
    }: CardAccountFormInput & { cardId: string; is_active?: boolean }) => {
      const lastFour = input.last_four?.replace(/\D/g, "").slice(-4) || null;

      const { error } = await supabase
        .from("card_accounts")
        .update({
          name: input.name.trim(),
          issuer: input.issuer?.trim() || null,
          card_kind: input.card_kind,
          last_four: lastFour,
          credit_limit: input.credit_limit ?? null,
          outstanding_balance: input.outstanding_balance ?? 0,
          statement_day: input.statement_day ?? null,
          notes: input.notes?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cardId);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Card updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateBalance = useMutation({
    mutationFn: async ({ cardId, balance }: { cardId: string; balance: number }) => {
      const { error } = await supabase
        .from("card_accounts")
        .update({
          outstanding_balance: balance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cardId);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Balance updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteCard = useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase.from("card_accounts").delete().eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Card removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { createCard, updateCard, updateBalance, deleteCard };
}
