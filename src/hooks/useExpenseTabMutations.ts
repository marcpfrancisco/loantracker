import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CurrencyType, RegionType } from "@/types/database";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the first day of the given month as a date string "YYYY-MM-DD". */
function toFirstOfMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

// ── Create tab ────────────────────────────────────────────────────────────────

export function useCreateExpenseTab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      borrower_id: string;
      currency: CurrencyType;
      region: RegionType;
      title: string;
    }) => {
      const { data, error } = await supabase
        .from("expense_tabs")
        .insert(params)
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: ["expense-tabs"] });
      void qc.invalidateQueries({ queryKey: ["borrower", vars.borrower_id] });
    },
  });
}

// ── Add item (auto-creates period if needed) ──────────────────────────────────

export function useAddExpenseItem(tabId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      period: Date; // the month to add to
      description: string;
      amount: number;
      is_already_split: boolean;
    }) => {
      const periodStr = toFirstOfMonth(params.period);
      const borrower_owes = params.is_already_split
        ? params.amount
        : Math.round((params.amount / 2) * 100) / 100;

      // Upsert the period (creates it if it doesn't exist yet)
      const { data: periodData, error: periodError } = await supabase
        .from("expense_periods")
        .upsert({ tab_id: tabId, period: periodStr }, { onConflict: "tab_id,period" })
        .select("id, is_locked")
        .single();

      if (periodError) throw periodError;
      if (periodData.is_locked) throw new Error("This month is locked. Unlock it first to add items.");

      const { error: itemError } = await supabase.from("expense_items").insert({
        period_id: periodData.id,
        description: params.description.trim(),
        amount: params.amount,
        is_already_split: params.is_already_split,
        borrower_owes,
        entry_date: new Date().toISOString().slice(0, 10),
      });

      if (itemError) throw itemError;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expense-tab", tabId] });
      void qc.invalidateQueries({ queryKey: ["expense-tabs"] });
    },
  });
}

// ── Delete item ───────────────────────────────────────────────────────────────

export function useDeleteExpenseItem(tabId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("expense_items")
        .delete()
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expense-tab", tabId] });
      void qc.invalidateQueries({ queryKey: ["expense-tabs"] });
    },
  });
}

// ── Toggle period lock ────────────────────────────────────────────────────────

export function useTogglePeriodLock(tabId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { periodId: string; is_locked: boolean }) => {
      const { error } = await supabase
        .from("expense_periods")
        .update({ is_locked: params.is_locked })
        .eq("id", params.periodId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expense-tab", tabId] });
    },
  });
}

// ── Record payment ────────────────────────────────────────────────────────────

export function useRecordPayment(tabId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      period_id: string;
      amount: number;
      notes: string;
      payment_date: string;
    }) => {
      const { error } = await supabase.from("expense_payments").insert(params);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expense-tab", tabId] });
      void qc.invalidateQueries({ queryKey: ["expense-tabs"] });
    },
  });
}

// ── Delete payment ────────────────────────────────────────────────────────────

export function useDeletePayment(tabId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from("expense_payments")
        .delete()
        .eq("id", paymentId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expense-tab", tabId] });
      void qc.invalidateQueries({ queryKey: ["expense-tabs"] });
    },
  });
}
