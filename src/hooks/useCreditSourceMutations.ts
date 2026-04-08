import type { CreditSourceType, RegionType } from "./../types/enums";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

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
