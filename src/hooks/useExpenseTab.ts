import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CurrencyType, RegionType } from "@/types/database";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  is_already_split: boolean;
  borrower_owes: number;
  entry_date: string;
  created_at: string;
}

export interface ExpensePayment {
  id: string;
  amount: number;
  notes: string | null;
  payment_date: string;
  created_at: string;
}

export type PaidStatus = "unpaid" | "partial" | "paid";

export interface ExpensePeriod {
  id: string;
  period: string; // "2026-01-01"
  is_locked: boolean;
  is_archived: boolean;
  items: ExpenseItem[];
  payments: ExpensePayment[];
  // Computed
  total_owed: number;
  total_paid: number;
  outstanding: number;
  paid_status: PaidStatus;
}

export interface ExpenseTabDetail {
  id: string;
  borrower_id: string;
  currency: CurrencyType;
  region: RegionType;
  title: string;
  status: string;
  borrower: { id: string; full_name: string };
  periods: ExpensePeriod[]; // sorted oldest → newest
  // Computed overall
  total_owed: number;
  total_paid: number;
  outstanding: number;
}

// ── Fetcher ───────────────────────────────────────────────────────────────────

async function fetchExpenseTab(tabId: string): Promise<ExpenseTabDetail> {
  const { data, error } = await supabase
    .from("expense_tabs")
    .select(
      `id, borrower_id, currency, region, title, status,
       profiles!expense_tabs_borrower_id_fkey(id, full_name),
       expense_periods(
         id, period, is_locked, is_archived, created_at,
         expense_items(id, description, amount, is_already_split, borrower_owes, entry_date, created_at),
         expense_payments(id, amount, notes, payment_date, created_at)
       )`
    )
    .eq("id", tabId)
    .single();

  if (error) throw error;

  let totalOwed = 0;
  let totalPaid = 0;

  const periods: ExpensePeriod[] = (data.expense_periods ?? [])
    .map((p) => {
      const items: ExpenseItem[] = (p.expense_items ?? [])
        .map((i) => ({
          id: i.id,
          description: i.description,
          amount: Number(i.amount),
          is_already_split: i.is_already_split,
          borrower_owes: Number(i.borrower_owes),
          entry_date: i.entry_date,
          created_at: i.created_at,
        }))
        .sort((a, b) => a.created_at.localeCompare(b.created_at));

      const payments: ExpensePayment[] = (p.expense_payments ?? [])
        .map((pay) => ({
          id: pay.id,
          amount: Number(pay.amount),
          notes: pay.notes,
          payment_date: pay.payment_date,
          created_at: pay.created_at,
        }))
        .sort((a, b) => a.created_at.localeCompare(b.created_at));

      const period_owed = items.reduce((s, i) => s + i.borrower_owes, 0);
      const period_paid = payments.reduce((s, p) => s + p.amount, 0);
      const outstanding = Math.max(0, period_owed - period_paid);
      const paid_status: PaidStatus =
        period_paid === 0 ? "unpaid" : outstanding <= 0 ? "paid" : "partial";

      totalOwed += period_owed;
      totalPaid += period_paid;

      return {
        id: p.id,
        period: p.period,
        is_locked: p.is_locked,
        is_archived: p.is_archived ?? false,
        items,
        payments,
        total_owed: period_owed,
        total_paid: period_paid,
        outstanding,
        paid_status,
      };
    })
    .sort((a, b) => a.period.localeCompare(b.period)); // oldest first

  return {
    id: data.id,
    borrower_id: data.borrower_id,
    currency: data.currency as CurrencyType,
    region: data.region as RegionType,
    title: data.title,
    status: data.status,
    borrower: {
      id: data.profiles?.id ?? "",
      full_name: data.profiles?.full_name ?? "Unknown",
    },
    periods,
    total_owed: totalOwed,
    total_paid: totalPaid,
    outstanding: Math.max(0, totalOwed - totalPaid),
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useExpenseTab(tabId: string | undefined) {
  return useQuery({
    queryKey: ["expense-tab", tabId],
    queryFn: () => fetchExpenseTab(tabId!),
    enabled: !!tabId,
  });
}
