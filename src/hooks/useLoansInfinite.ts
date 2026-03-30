import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { LoanListItem } from "./useLoans";
import type { LoanStatus, RegionType } from "@/types/database";

export const LOANS_PAGE_SIZE = 20;

export type StatusFilter = LoanStatus | "all";
export type RegionFilter = RegionType | "all";

async function fetchLoansPage({
  pageParam,
  status,
  region,
}: {
  pageParam: number;
  status: StatusFilter;
  region: RegionFilter;
}): Promise<LoanListItem[]> {
  let query = supabase
    .from("loans")
    .select(
      "id, loan_type, currency, principal, service_fee, installments_total, status, region, started_at, credit_sources!loans_source_id_fkey(name, type), profiles!loans_borrower_id_fkey(id, full_name), installments(id, status, due_date)"
    )
    .order("started_at", { ascending: false })
    .range(pageParam, pageParam + LOANS_PAGE_SIZE - 1);

  if (status !== "all") query = query.eq("status", status);
  if (region !== "all") query = query.eq("region", region);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((loan) => {
    const installments = loan.installments ?? [];
    const unpaid = installments
      .filter((i) => i.status === "unpaid")
      .sort((a, b) => a.due_date.localeCompare(b.due_date));

    return {
      id: loan.id,
      loan_type: loan.loan_type,
      currency: loan.currency,
      principal: Number(loan.principal),
      service_fee: Number(loan.service_fee),
      installments_total: loan.installments_total,
      status: loan.status,
      region: loan.region,
      started_at: loan.started_at,
      credit_source: {
        name: loan.credit_sources?.name ?? "Unknown",
        type: loan.credit_sources?.type ?? "custom",
      },
      borrower: loan.profiles
        ? { id: loan.profiles.id, full_name: loan.profiles.full_name }
        : null,
      paidCount: installments.filter((i) => i.status === "paid").length,
      pendingCount: installments.filter((i) => i.status === "pending").length,
      nextDueDate: unpaid[0]?.due_date ?? null,
    };
  });
}

export function useLoansInfinite(status: StatusFilter, region: RegionFilter) {
  return useInfiniteQuery({
    queryKey: ["loans-infinite", status, region],
    queryFn: ({ pageParam }) =>
      fetchLoansPage({ pageParam: pageParam as number, status, region }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < LOANS_PAGE_SIZE) return undefined;
      return allPages.flat().length;
    },
  });
}
