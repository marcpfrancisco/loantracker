import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { LoanDetail } from "@/hooks/useLoanDetail";

export interface SubmitProofPayload {
  installmentId: string;
  loanId: string;
  borrowerId: string;
  note: string;
  file: File | null;
}

async function submitPaymentProof(payload: SubmitProofPayload): Promise<void> {
  const { installmentId, loanId, borrowerId, note, file } = payload;

  let filePath: string | null = null;

  // 1. Upload file to Supabase Storage (optional)
  if (file) {
    // Path: {borrowerId}/{loanId}/{installmentId}/{timestamp}.{ext}
    // First segment must equal auth.uid() to satisfy RLS policy
    const ext = file.name.split(".").pop() ?? "jpg";
    filePath = `${borrowerId}/${loanId}/${installmentId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("payment-receipts")
      .upload(filePath, file, { cacheControl: "3600", upsert: false });

    if (uploadError) throw uploadError;
  }

  // 2. Insert payment_proof row
  const { error: proofError } = await supabase.from("payment_proofs").insert({
    installment_id: installmentId,
    submitted_by: borrowerId,
    file_url: filePath,
    note,
    status: "pending",
  });

  if (proofError) {
    // Clean up uploaded file on DB insert failure
    if (filePath) {
      await supabase.storage.from("payment-receipts").remove([filePath]);
    }
    throw proofError;
  }

  // 3. Mark installment as pending
  const { error: installError } = await supabase
    .from("installments")
    .update({ status: "pending" })
    .eq("id", installmentId);

  if (installError) throw installError;
}

export function useSubmitPaymentProof(loanId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitPaymentProof,

    onMutate: async ({ installmentId }) => {
      await queryClient.cancelQueries({ queryKey: ["loan", loanId] });
      const previousLoan = queryClient.getQueryData<LoanDetail>(["loan", loanId]);

      queryClient.setQueryData<LoanDetail>(["loan", loanId], (old) => {
        if (!old) return old;
        return {
          ...old,
          installments: old.installments.map((i) =>
            i.id === installmentId ? { ...i, status: "pending" as const } : i
          ),
        };
      });

      return { previousLoan };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousLoan) {
        queryClient.setQueryData(["loan", loanId], context.previousLoan);
      }
      toast.error("Failed to submit payment proof. Please try again.");
    },

    onSuccess: () => {
      toast.success("Payment proof submitted for review.");
      void queryClient.invalidateQueries({ queryKey: ["loans"] });
      void queryClient.invalidateQueries({ queryKey: ["my-loans"] });
      void queryClient.invalidateQueries({ queryKey: ["upcoming-installments"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}
