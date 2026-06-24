import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

async function deleteLoan(loanId: string): Promise<void> {
  const { data: installments, error: fetchError } = await supabase
    .from("installments")
    .select("id")
    .eq("loan_id", loanId);

  if (fetchError) throw fetchError;

  const installmentIds = (installments ?? []).map((i) => i.id);

  if (installmentIds.length > 0) {
    const { error: proofError } = await supabase
      .from("payment_proofs")
      .delete()
      .in("installment_id", installmentIds);
    if (proofError) throw proofError;

    const { error: installmentError } = await supabase
      .from("installments")
      .delete()
      .in("id", installmentIds);
    if (installmentError) throw installmentError;
  }

  const { error: loanError } = await supabase.from("loans").delete().eq("id", loanId);
  if (loanError) throw loanError;
}

export function useDeleteLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteLoan,
    onSuccess: () => {
      toast.success("Loan removed permanently.");
      void queryClient.invalidateQueries({ queryKey: ["loans"] });
      void queryClient.invalidateQueries({ queryKey: ["loans-infinite"] });
      void queryClient.invalidateQueries({ queryKey: ["my-loans"] });
      void queryClient.invalidateQueries({ queryKey: ["upcoming-installments"] });
      void queryClient.invalidateQueries({ queryKey: ["overdue-installments"] });
      void queryClient.invalidateQueries({ queryKey: ["my-overdue-installments"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "pending-proofs"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      toast.error("Failed to remove loan. Please try again.");
    },
  });
}
