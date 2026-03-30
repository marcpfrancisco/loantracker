import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CurrencyType, RegionType } from "@/types/database";

export interface ExpenseTabSummary {
  id: string;
  title: string;
  currency: CurrencyType;
  region: RegionType;
  status: string;
  borrower: { id: string; full_name: string; region: RegionType };
  // Computed from periods
  totalOwed: number;
  totalPaid: number;
  outstanding: number;
  periodSummaries: Array<{
    period: string;
    is_locked: boolean;
    is_archived: boolean;
    paid_status: "unpaid" | "partial" | "paid";
  }>;
}

async function fetchExpenseTabs(): Promise<ExpenseTabSummary[]> {
  const { data, error } = await supabase
    .from("expense_tabs")
    .select(
      `id, title, currency, region, status,
       profiles!expense_tabs_borrower_id_fkey(id, full_name, region),
       expense_periods(
         id, period, is_locked, is_archived,
         expense_items(borrower_owes),
         expense_payments(amount)
       )`
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((tab) => {
    const periods = tab.expense_periods ?? [];
    let totalOwed = 0;
    let totalPaid = 0;

    const periodSummaries = periods
      .map((p) => {
        const owed = (p.expense_items ?? []).reduce(
          (s: number, i: { borrower_owes: number }) => s + Number(i.borrower_owes),
          0
        );
        const paid = (p.expense_payments ?? []).reduce(
          (s: number, pay: { amount: number }) => s + Number(pay.amount),
          0
        );
        totalOwed += owed;
        totalPaid += paid;
        const outstanding = Math.max(0, owed - paid);
        const paid_status: "unpaid" | "partial" | "paid" =
          paid === 0 ? "unpaid" : outstanding <= 0 ? "paid" : "partial";
        return { period: p.period, is_locked: p.is_locked, is_archived: p.is_archived ?? false, paid_status };
      })
      .sort((a, b) => a.period.localeCompare(b.period));

    return {
      id: tab.id,
      title: tab.title,
      currency: tab.currency as CurrencyType,
      region: tab.region as RegionType,
      status: tab.status,
      borrower: {
        id: tab.profiles?.id ?? "",
        full_name: tab.profiles?.full_name ?? "Unknown",
        region: (tab.profiles?.region ?? "PH") as RegionType,
      },
      totalOwed,
      totalPaid,
      outstanding: Math.max(0, totalOwed - totalPaid),
      periodSummaries,
    };
  });
}

async function fetchMyExpenseTab(): Promise<ExpenseTabSummary | null> {
  const { data, error } = await supabase
    .from("expense_tabs")
    .select(
      `id, title, currency, region, status,
       profiles!expense_tabs_borrower_id_fkey(id, full_name, region),
       expense_periods(
         id, period, is_locked, is_archived,
         expense_items(borrower_owes),
         expense_payments(amount)
       )`
    )
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const periods = data.expense_periods ?? [];
  let totalOwed = 0;
  let totalPaid = 0;

  const periodSummaries = periods
    .map((p) => {
      const owed = (p.expense_items ?? []).reduce(
        (s: number, i: { borrower_owes: number }) => s + Number(i.borrower_owes),
        0
      );
      const paid = (p.expense_payments ?? []).reduce(
        (s: number, pay: { amount: number }) => s + Number(pay.amount),
        0
      );
      totalOwed += owed;
      totalPaid += paid;
      const outstanding = Math.max(0, owed - paid);
      const paid_status: "unpaid" | "partial" | "paid" =
        paid === 0 ? "unpaid" : outstanding <= 0 ? "paid" : "partial";
      return { period: p.period, is_locked: p.is_locked, is_archived: p.is_archived ?? false, paid_status };
    })
    .sort((a, b) => a.period.localeCompare(b.period));

  return {
    id: data.id,
    title: data.title,
    currency: data.currency as CurrencyType,
    region: data.region as RegionType,
    status: data.status,
    borrower: {
      id: data.profiles?.id ?? "",
      full_name: data.profiles?.full_name ?? "",
      region: (data.profiles?.region ?? "PH") as RegionType,
    },
    totalOwed,
    totalPaid,
    outstanding: Math.max(0, totalOwed - totalPaid),
    periodSummaries,
  };
}

export function useExpenseTabsAdmin() {
  return useQuery<ExpenseTabSummary[]>({
    queryKey: ["expense-tabs", "admin"],
    queryFn: fetchExpenseTabs,
  });
}

export function useMyExpenseTab() {
  return useQuery<ExpenseTabSummary | null>({
    queryKey: ["expense-tabs", "borrower"],
    queryFn: fetchMyExpenseTab,
  });
}

/** @deprecated Use useExpenseTabsAdmin or useMyExpenseTab directly */
export function useExpenseTabs(isAdmin: boolean) {
  const adminQuery = useExpenseTabsAdmin();
  const borrowerQuery = useMyExpenseTab();
  return isAdmin ? adminQuery : borrowerQuery;
}
