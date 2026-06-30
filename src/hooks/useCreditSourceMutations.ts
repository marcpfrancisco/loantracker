import type { CreditSourceType, RegionType } from "./../types/enums";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { findMissingSchemaCreditSources } from "@/types/schema";
import type { CreditSourceRow } from "@/hooks/useCreditSources";

const LOAN_TYPE_DEFAULTS_TABLE = "credit_source_loan_type_defaults";

interface CreditSourceDefaults {
  default_interest_rate?: number | null;
  default_installments?: number | null;
  default_due_day?: number | null;
}

// ── Create ────────────────────────────────────────────────────────────────────

export function useCreateCreditSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      params: { name: string; type: CreditSourceType; region: RegionType } & CreditSourceDefaults
    ) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("credit_sources")
        .insert(params)
        .select("id")
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["credit-sources"] });
    },
  });
}

// ── Update name / type / defaults ─────────────────────────────────────────────

export function useUpdateCreditSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      params: { id: string; name: string; type: CreditSourceType } & CreditSourceDefaults
    ) => {
      const { id, ...rest } = params;
      const { error } = await supabase
        .from("credit_sources")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ ...rest, name: rest.name.trim() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["credit-sources"] });
    },
  });
}

// ── Toggle active flag ────────────────────────────────────────────────────────

export function useToggleCreditSourceActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("credit_sources")
        .update({ is_active: params.is_active })
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["credit-sources"] });
    },
  });
}

// ── Delete ────────────────────────────────────────────────────────────────────

export function useDeleteCreditSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("credit_sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["credit-sources"] });
    },
  });
}

// ── Sync built-in sources from schema.ts ────────────────────────────────────────

/** Inserts credit_sources rows (and per-loan-type defaults) missing from the org DB. */
export function useSyncSchemaCreditSources() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (existing: CreditSourceRow[]) => {
      const missing = findMissingSchemaCreditSources(existing);
      if (missing.length === 0) return [] as string[];

      const createdRegions: string[] = [];

      for (const config of missing) {
        const primary = config.loan_types[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from("credit_sources")
          .insert({
            name: config.name,
            type: config.type,
            region: config.region,
            is_active: true,
            default_interest_rate:
              primary?.interest_rate != null ? primary.interest_rate / 100 : null,
            default_installments: primary?.installments_total ?? null,
            default_due_day: primary?.due_day_of_month ?? null,
          })
          .select("id")
          .single();
        if (error) throw error;

        const ltRows = config.loan_types.map((lt) => ({
          credit_source_id: data.id as string,
          loan_type: lt.loan_type,
          interest_rate: lt.interest_rate != null ? lt.interest_rate / 100 : null,
          installments: lt.installments_total,
          due_day: lt.due_day_of_month,
        }));

        if (ltRows.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: ltError } = await (supabase as any)
            .from(LOAN_TYPE_DEFAULTS_TABLE)
            .upsert(ltRows, { onConflict: "credit_source_id,loan_type" });
          if (ltError) throw ltError;
        }

        createdRegions.push(config.region);
      }

      return createdRegions;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["credit-sources"] });
      void qc.invalidateQueries({ queryKey: ["loan-type-defaults"] });
    },
  });
}
