import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { PaymentStatus } from "@/types/enums";
import type { LoanDetail } from "@/hooks/useLoanDetail";

interface UpdateInstallmentPayload {
  id: string;
  status: PaymentStatus;
  loanId: string;
}

const statusToastMessages: Record<PaymentStatus, string> = {
  unpaid: "Payment reverted to unpaid.",
  pending: "Payment submitted for review.",
  paid: "Payment marked as paid.",
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

export function useBulkMarkPaid(loanId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("installments")
        .update({ status: "paid" })
        .in("id", ids);
      if (error) throw error;
    },

    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ["loan", loanId] });
      const previousLoan = queryClient.getQueryData<LoanDetail>(["loan", loanId]);

      queryClient.setQueryData<LoanDetail>(["loan", loanId], (old) => {
        if (!old) return old;
        const idSet = new Set(ids);
        return {
          ...old,
          installments: old.installments.map((i) =>
            idSet.has(i.id)
              ? { ...i, status: "paid" as const, paid_at: new Date().toISOString() }
              : i
          ),
        };
      });

      return { previousLoan };
    },

    onError: (_err, _ids, context) => {
      if (context?.previousLoan) {
        queryClient.setQueryData(["loan", loanId], context.previousLoan);
      }
      toast.error("Bulk update failed. Please try again.");
    },

    onSuccess: (_data, ids) => {
      toast.success(`${ids.length} installment${ids.length !== 1 ? "s" : ""} marked as paid.`);
      void queryClient.invalidateQueries({ queryKey: ["loans"] });
      void queryClient.invalidateQueries({ queryKey: ["loans-infinite"] });
      void queryClient.invalidateQueries({ queryKey: ["my-loans"] });
      void queryClient.invalidateQueries({ queryKey: ["upcoming-installments"] });
      void queryClient.invalidateQueries({ queryKey: ["my-overdue-installments"] });
      void queryClient.invalidateQueries({ queryKey: ["overdue-installments"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      // Notify borrower via email for all confirmed installments (fire-and-forget)
      void supabase.functions.invoke("notify-payment-confirmed", {
        body: { installmentIds: ids },
      });
    },
  });
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

    onSuccess: (_data, { id, status }) => {
      toast.success(statusToastMessages[status]);
      // Reconcile detail page with server truth (real paid_at, receipt_url, etc.)
      // Runs as a background refetch — no loading state since optimistic cache exists.
      void queryClient.invalidateQueries({ queryKey: ["loan", loanId] });
      // Refresh all derived/list views
      void queryClient.invalidateQueries({ queryKey: ["loans"] });
      void queryClient.invalidateQueries({ queryKey: ["loans-infinite"] });
      void queryClient.invalidateQueries({ queryKey: ["my-loans"] });
      void queryClient.invalidateQueries({ queryKey: ["upcoming-installments"] });
      void queryClient.invalidateQueries({ queryKey: ["overdue-installments"] });
      void queryClient.invalidateQueries({ queryKey: ["my-overdue-installments"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      // Notify borrower via email (fire-and-forget — never blocks the UI)
      if (status === "paid") {
        void supabase.functions.invoke("notify-payment-confirmed", {
          body: { installmentIds: [id] },
        });
      }
    },
  });
}
