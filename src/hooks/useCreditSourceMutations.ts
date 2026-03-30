import type { CreditSourceType, RegionType } from "./../types/enums";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ── Create ────────────────────────────────────────────────────────────────────

export function useCreateCreditSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { name: string; type: CreditSourceType; region: RegionType }) => {
      const { error } = await supabase.from("credit_sources").insert(params);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["credit-sources"] });
    },
  });
}

// ── Update name / type ────────────────────────────────────────────────────────

export function useUpdateCreditSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; name: string; type: CreditSourceType }) => {
      const { error } = await supabase
        .from("credit_sources")
        .update({ name: params.name.trim(), type: params.type })
        .eq("id", params.id);
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
