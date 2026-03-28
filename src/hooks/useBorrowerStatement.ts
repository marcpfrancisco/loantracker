import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CurrencyType, LoanStatus, LoanType, CreditSourceType, RegionType, PaymentStatus } from "@/types/database";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StatementInstallment {
  id: string;
  installment_no: number;
  due_date: string;
  amount: number;
  status: PaymentStatus;
  paid_at: string | null;
}

export interface StatementLoan {
  id: string;
  loan_type: LoanType;
  currency: CurrencyType;
  principal: number;
  interest_rate: number | null;
  service_fee: number;
  installments_total: number;
  status: LoanStatus;
  region: RegionType;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  credit_source: { name: string; type: CreditSourceType };
  installments: StatementInstallment[];
  // Computed
  totalRepayable: number;
  totalPaid: number;
  totalOutstanding: number;
}

export interface BorrowerStatement {
  borrower: { id: string; full_name: string; region: RegionType };
  loans: StatementLoan[];
  generatedAt: string;
  // Totals across all loans (same currency groupings)
  summary: {
    PHP: { principal: number; paid: number; outstanding: number };
    AED: { principal: number; paid: number; outstanding: number };
  };
}

// ── Fetcher ───────────────────────────────────────────────────────────────────

async function fetchBorrowerStatement(borrowerId: string): Promise<BorrowerStatement> {
  const [profileResult, loansResult] = await Promise.all([
    supabase.from("profiles").select("id, full_name, region").eq("id", borrowerId).single(),
    supabase
      .from("loans")
      .select(
        "id, loan_type, currency, principal, interest_rate, service_fee, installments_total, status, region, started_at, ended_at, notes, credit_sources!loans_source_id_fkey(name, type), installments(id, installment_no, due_date, amount, status, paid_at)"
      )
      .eq("borrower_id", borrowerId)
      .order("started_at", { ascending: false }),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (loansResult.error) throw loansResult.error;

  const summary = {
    PHP: { principal: 0, paid: 0, outstanding: 0 },
    AED: { principal: 0, paid: 0, outstanding: 0 },
  };

  const loans: StatementLoan[] = (loansResult.data ?? []).map((loan) => {
    const installments: StatementInstallment[] = (loan.installments ?? [])
      .map((i) => ({
        id: i.id,
        installment_no: i.installment_no,
        due_date: i.due_date,
        amount: Number(i.amount),
        status: i.status as PaymentStatus,
        paid_at: i.paid_at,
      }))
      .sort((a, b) => a.installment_no - b.installment_no);

    const totalRepayable = installments.reduce((s, i) => s + i.amount, 0);
    const totalPaid = installments
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + i.amount, 0);
    const totalOutstanding = installments
      .filter((i) => i.status !== "paid")
      .reduce((s, i) => s + i.amount, 0);

    const cur = loan.currency as "PHP" | "AED";
    summary[cur].principal += Number(loan.principal);
    summary[cur].paid += totalPaid;
    summary[cur].outstanding += totalOutstanding;

    return {
      id: loan.id,
      loan_type: loan.loan_type as LoanType,
      currency: cur,
      principal: Number(loan.principal),
      interest_rate: loan.interest_rate !== null ? Number(loan.interest_rate) : null,
      service_fee: Number(loan.service_fee),
      installments_total: loan.installments_total,
      status: loan.status as LoanStatus,
      region: loan.region as RegionType,
      started_at: loan.started_at,
      ended_at: loan.ended_at,
      notes: loan.notes,
      credit_source: {
        name: loan.credit_sources?.name ?? "Unknown",
        type: (loan.credit_sources?.type ?? "custom") as CreditSourceType,
      },
      installments,
      totalRepayable,
      totalPaid,
      totalOutstanding,
    };
  });

  return {
    borrower: {
      id: profileResult.data.id,
      full_name: profileResult.data.full_name,
      region: profileResult.data.region as RegionType,
    },
    loans,
    generatedAt: new Date().toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    summary,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useBorrowerStatement(borrowerId: string | null) {
  return useQuery({
    queryKey: ["statement", borrowerId],
    queryFn: () => fetchBorrowerStatement(borrowerId!),
    enabled: !!borrowerId,
    staleTime: 0, // Always refetch — statement must be up-to-date
  });
}
