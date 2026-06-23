import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  computePaidStatus,
  computeOutstanding,
  currentMonthStr,
  getPeriodClosedMessage,
  isPeriodClosedForItems,
  normalizePeriodKey,
  roundMoney,
} from "@/lib/expensePeriodRules";
import type { CurrencyType, RegionType } from "@/types/enums";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the first day of the given month as a date string "YYYY-MM-DD". */
function toFirstOfMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

// ── Delete tab ────────────────────────────────────────────────────────────────

export function useDeleteExpenseTab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tabId: string) => {
      const { error } = await supabase.from("expense_tabs").delete().eq("id", tabId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expense-tabs"] });
      void qc.invalidateQueries({ queryKey: ["admin", "borrowers"] });
    },
  });
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
        .select(
          `id, period, is_locked, is_archived,
           expense_items(borrower_owes),
           expense_payments(amount)`
        )
        .single();

      if (periodError) throw periodError;

      const totalOwed = roundMoney(
        (periodData.expense_items ?? []).reduce(
          (s: number, i: { borrower_owes: number }) => s + Number(i.borrower_owes),
          0
        )
      );
      const totalPaid = roundMoney(
        (periodData.expense_payments ?? []).reduce(
          (s: number, p: { amount: number }) => s + Number(p.amount),
          0
        )
      );
      const paid_status = computePaidStatus(totalOwed, totalPaid);
      const closure = {
        period: periodData.period,
        is_locked: periodData.is_locked,
        is_archived: periodData.is_archived ?? false,
        paid_status,
        outstanding: computeOutstanding(totalOwed, totalPaid),
        total_owed: totalOwed,
      };

      if (isPeriodClosedForItems(closure)) {
        throw new Error(getPeriodClosedMessage(closure));
      }

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
      const { error } = await supabase.from("expense_items").delete().eq("id", itemId);
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
      const { data: period, error: fetchError } = await supabase
        .from("expense_periods")
        .select("period")
        .eq("id", params.periodId)
        .single();
      if (fetchError) throw fetchError;

      const currentMonth = currentMonthStr();
      if (normalizePeriodKey(period.period) !== currentMonth) {
        throw new Error("Only the current month can be locked or unlocked.");
      }

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
      const { error } = await supabase.from("expense_payments").delete().eq("id", paymentId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expense-tab", tabId] });
      void qc.invalidateQueries({ queryKey: ["expense-tabs"] });
    },
  });
}

// ── Delete period (only when empty — no items, no payments) ───────────────────

export function useDeleteExpensePeriod(tabId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (periodId: string) => {
      const { error } = await supabase.from("expense_periods").delete().eq("id", periodId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Month deleted.");
      void qc.invalidateQueries({ queryKey: ["expense-tab", tabId] });
      void qc.invalidateQueries({ queryKey: ["expense-tabs"] });
    },
    onError: () => {
      toast.error("Failed to delete month. Remove all items and payments first.");
    },
  });
}

// ── Delete all periods in a year (items + payments + periods) ─────────────────

export function useDeleteExpenseYear(tabId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (periodIds: string[]) => {
      if (periodIds.length === 0) return;

      const { error: payError } = await supabase
        .from("expense_payments")
        .delete()
        .in("period_id", periodIds);
      if (payError) throw payError;

      const { error: itemError } = await supabase
        .from("expense_items")
        .delete()
        .in("period_id", periodIds);
      if (itemError) throw itemError;

      const { error } = await supabase.from("expense_periods").delete().in("id", periodIds);
      if (error) throw error;
    },
    onSuccess: (_, periodIds) => {
      toast.success(`${periodIds.length} month${periodIds.length !== 1 ? "s" : ""} deleted.`);
      void qc.invalidateQueries({ queryKey: ["expense-tab", tabId] });
      void qc.invalidateQueries({ queryKey: ["expense-tabs"] });
    },
    onError: () => {
      toast.error("Failed to delete year. Please try again.");
    },
  });
}

// ── Archive period (fully paid months only) ───────────────────────────────────

export function useArchivePeriod(tabId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (periodId: string) => {
      const { error } = await supabase
        .from("expense_periods")
        .update({ is_archived: true, is_locked: true })
        .eq("id", periodId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expense-tab", tabId] });
      void qc.invalidateQueries({ queryKey: ["expense-tabs"] });
    },
  });
}

// ── Archive all periods in a year ─────────────────────────────────────────────

export function useArchiveYear(tabId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (periodIds: string[]) => {
      const { error } = await supabase
        .from("expense_periods")
        .update({ is_archived: true, is_locked: true })
        .in("id", periodIds);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expense-tab", tabId] });
      void qc.invalidateQueries({ queryKey: ["expense-tabs"] });
    },
  });
}

// ── Update item ───────────────────────────────────────────────────────────────

export function useUpdateExpenseItem(tabId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      description: string;
      amount: number;
      is_already_split: boolean;
    }) => {
      const borrower_owes = params.is_already_split
        ? params.amount
        : Math.round((params.amount / 2) * 100) / 100;
      const { error } = await supabase
        .from("expense_items")
        .update({
          description: params.description.trim(),
          amount: params.amount,
          is_already_split: params.is_already_split,
          borrower_owes,
        })
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expense-tab", tabId] });
      void qc.invalidateQueries({ queryKey: ["expense-tabs"] });
    },
  });
}
