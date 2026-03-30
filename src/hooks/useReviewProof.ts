import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { LoanDetail } from "@/hooks/useLoanDetail";
import type { PaymentStatus } from "@/types/enums";

export interface ReviewProofPayload {
  proofId: string;
  installmentId: string;
  loanId: string;
  action: "approve" | "reject";
  adminNote: string;
  reviewedBy: string;
  fileUrl: string | null;
}

async function reviewProof(payload: ReviewProofPayload): Promise<void> {
  const { proofId, installmentId, action, adminNote, reviewedBy, fileUrl } = payload;

  const newInstallmentStatus: PaymentStatus = action === "approve" ? "paid" : "unpaid";

  // 1. Update payment_proof record (clear file_url on rejection — Edge Function handles actual deletion)
  const { error: proofError } = await supabase
    .from("payment_proofs")
    .update({
      status: action === "approve" ? "approved" : "rejected",
      admin_note: adminNote || null,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      ...(action === "reject" ? { file_url: null } : {}),
    })
    .eq("id", proofId);

  if (proofError) throw proofError;

  // 2. Update installment status
  const { error: installError } = await supabase
    .from("installments")
    .update({
      status: newInstallmentStatus,
      paid_at: action === "approve" ? new Date().toISOString() : null,
    })
    .eq("id", installmentId);

  if (installError) throw installError;

  // 3. On rejection: fire-and-forget Edge Function to delete file + notify borrower
  //    Not awaited — rejection succeeds even if notification fails
  if (action === "reject") {
    void supabase.functions.invoke("notify-rejection", {
      body: { installmentId, adminNote, fileUrl },
    });
  }
}

export function useReviewProof(loanId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reviewProof,

    onMutate: async ({ installmentId, action }) => {
      await queryClient.cancelQueries({ queryKey: ["loan", loanId] });
      const previousLoan = queryClient.getQueryData<LoanDetail>(["loan", loanId]);

      const newStatus: PaymentStatus = action === "approve" ? "paid" : "unpaid";

      queryClient.setQueryData<LoanDetail>(["loan", loanId], (old) => {
        if (!old) return old;
        return {
          ...old,
          installments: old.installments.map((i) =>
            i.id === installmentId
              ? {
                  ...i,
                  status: newStatus,
                  paid_at: action === "approve" ? new Date().toISOString() : null,
                }
              : i
          ),
        };
      });

      return { previousLoan };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousLoan) {
        queryClient.setQueryData(["loan", loanId], context.previousLoan);
      }
      toast.error("Failed to process review. Please try again.");
    },

    onSuccess: (_data, { action, installmentId }) => {
      toast.success(
        action === "approve" ? "Payment approved." : "Payment rejected — borrower notified."
      );
      void queryClient.invalidateQueries({ queryKey: ["proof", installmentId] });
      void queryClient.invalidateQueries({ queryKey: ["loans"] });
      void queryClient.invalidateQueries({ queryKey: ["my-loans"] });
      void queryClient.invalidateQueries({ queryKey: ["upcoming-installments"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}
