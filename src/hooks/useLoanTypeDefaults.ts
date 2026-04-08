import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface LoanTypeDefault {
  id: string;
  credit_source_id: string;
  loan_type: string;
  /** Stored as decimal fraction in DB (0.0295 = 2.95%). Null if not set. */
  interest_rate: number | null;
  installments: number | null;
  due_day: number | null;
}

interface LoanTypeDefaultUpsertRow {
  credit_source_id: string;
  loan_type: string;
  interest_rate: number | null;
  installments: number | null;
  due_day: number | null;
}

// ── Fetch ──────────────────────────────────────────────────────────────────────

const TABLE = "credit_source_loan_type_defaults";

async function fetchAllLoanTypeDefaults(): Promise<LoanTypeDefault[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .select("id, credit_source_id, loan_type, interest_rate, installments, due_day")
    .order("credit_source_id")
    .order("loan_type");
  if (error) throw error;
  return (data ?? []) as LoanTypeDefault[];
}

/** Fetches all per-loan-type default rows for the org. Cached for 5 min. */
export function useAllLoanTypeDefaults() {
  return useQuery<LoanTypeDefault[]>({
    queryKey: ["loan-type-defaults"],
    queryFn: fetchAllLoanTypeDefaults,
    staleTime: 1000 * 60 * 5,
  });
}

// ── Upsert ─────────────────────────────────────────────────────────────────────

/**
 * Bulk-upserts an array of per-loan-type defaults.
 * Conflict target: (credit_source_id, loan_type).
 * Use for schema-known sources where the set of loan types is fixed.
 */
export function useUpsertLoanTypeDefaults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: LoanTypeDefaultUpsertRow[]) => {
      if (rows.length === 0) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from(TABLE)
        .upsert(rows, { onConflict: "credit_source_id,loan_type" });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["loan-type-defaults"] });
    },
  });
}

/**
 * Replaces all per-loan-type defaults for a given credit source.
 * Deletes all existing rows for the source, then inserts the new set.
 * Use for custom sources where loan types are user-defined and may be removed.
 */
export function useReplaceSourceLoanTypeDefaults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sourceId,
      rows,
    }: {
      sourceId: string;
      rows: LoanTypeDefaultUpsertRow[];
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: delError } = await (supabase as any)
        .from(TABLE)
        .delete()
        .eq("credit_source_id", sourceId);
      if (delError) throw delError;

      if (rows.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insError } = await (supabase as any).from(TABLE).insert(rows);
        if (insError) throw insError;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["loan-type-defaults"] });
    },
  });
}
