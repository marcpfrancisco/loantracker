import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { LoanStatus } from "@/types/database";
import type { LoanDetail } from "@/hooks/useLoanDetail";

interface UpdateLoanStatusPayload {
  id: string;
  status: LoanStatus;
}

const statusToastMessages: Record<LoanStatus, string> = {
  active: "Loan reopened successfully.",
  completed: "Loan marked as completed.",
  defaulted: "Loan marked as defaulted.",
  cancelled: "Loan cancelled.",
};

async function updateLoanStatus({ id, status }: UpdateLoanStatusPayload): Promise<void> {
  const { error } = await supabase
    .from("loans")
    .update({
      status,
      ended_at: status !== "active" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) throw error;
}

export function useUpdateLoanStatus(_loanId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateLoanStatus,

    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["loan", id] });
      const previousLoan = queryClient.getQueryData<LoanDetail>(["loan", id]);

      queryClient.setQueryData<LoanDetail>(["loan", id], (old) => {
        if (!old) return old;
        return {
          ...old,
          status,
          ended_at: status !== "active" ? new Date().toISOString() : null,
        };
      });

      return { previousLoan };
    },

    onError: (_err, { id }, context) => {
      if (context?.previousLoan) {
        queryClient.setQueryData(["loan", id], context.previousLoan);
      }
      toast.error("Failed to update loan status. Please try again.");
    },

    onSuccess: (_data, { status }) => {
      toast.success(statusToastMessages[status]);
      void queryClient.invalidateQueries({ queryKey: ["loans"] });
      void queryClient.invalidateQueries({ queryKey: ["my-loans"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}
