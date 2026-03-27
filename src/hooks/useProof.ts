import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ProofStatus } from "@/types/database";

export interface ProofDetail {
  id: string;
  file_url: string | null;
  note: string | null;
  status: ProofStatus;
  admin_note: string | null;
  submitted_by: string;
  created_at: string;
  signedUrl: string | null;
}

async function fetchProof(installmentId: string): Promise<ProofDetail | null> {
  const { data, error } = await supabase
    .from("payment_proofs")
    .select("id, file_url, note, status, admin_note, submitted_by, created_at")
    .eq("installment_id", installmentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // Only generate a signed URL if a file was actually attached
  let signedUrl: string | null = null;
  if (data.file_url) {
    const { data: signed } = await supabase.storage
      .from("payment-receipts")
      .createSignedUrl(data.file_url, 3600);
    signedUrl = signed?.signedUrl ?? null;
  }

  return {
    id: data.id,
    file_url: data.file_url,
    note: data.note,
    status: data.status,
    admin_note: data.admin_note,
    submitted_by: data.submitted_by,
    created_at: data.created_at,
    signedUrl,
  };
}

export function useProof(installmentId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["proof", installmentId],
    queryFn: () => fetchProof(installmentId),
    enabled,
    staleTime: 1000 * 60 * 50, // re-fetch before 1-hour signed URL expires
  });
}
