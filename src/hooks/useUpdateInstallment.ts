import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { PaymentStatus } from "@/types/database";
import type { LoanDetail } from "@/hooks/useLoanDetail";

interface UpdateInstallmentPayload {
  id: string;
  status: PaymentStatus;
  loanId: string;
}

const statusToastMessages: Record<PaymentStatus, string> = {
  unpaid:  "Payment reverted to unpaid.",
  pending: "Payment submitted for review.",
  paid:    "Payment marked as paid.",
};

async function updateInstallment({ id, status }: UpdateInstallmentPayload): Promise<void> {
  const { error } = await supabase
    .from("installments")
    .update({
      status,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) throw error;
}

export function useUpdateInstallment(loanId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateInstallment,

    onMutate: async ({ id: installmentId, status }) => {
      await queryClient.cancelQueries({ queryKey: ["loan", loanId] });
      const previousLoan = queryClient.getQueryData<LoanDetail>(["loan", loanId]);

      queryClient.setQueryData<LoanDetail>(["loan", loanId], (old) => {
        if (!old) return old;
        return {
          ...old,
          installments: old.installments.map((i) =>
            i.id === installmentId
              ? { ...i, status, paid_at: status === "paid" ? new Date().toISOString() : null }
              : i
          ),
        };
      });

      return { previousLoan };
    },

    onError: (_err, { loanId: lid }, context) => {
      if (context?.previousLoan) {
        queryClient.setQueryData(["loan", lid], context.previousLoan);
      }
      toast.error("Failed to update payment status. Please try again.");
    },

    onSuccess: (_data, { status }) => {
      toast.success(statusToastMessages[status]);
      void queryClient.invalidateQueries({ queryKey: ["loans"] });
      void queryClient.invalidateQueries({ queryKey: ["my-loans"] });
      void queryClient.invalidateQueries({ queryKey: ["upcoming-installments"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}
