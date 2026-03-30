import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { RegionType } from "@/types/enums";

export interface InviteBorrowerPayload {
  email: string;
  full_name: string;
  region: RegionType;
}

async function inviteBorrower(payload: InviteBorrowerPayload): Promise<void> {
  const { data, error } = await supabase.functions.invoke("invite-borrower", {
    body: payload,
  });

  // functions.invoke() puts non-2xx responses in `error`.
  // `error.context` is the raw Response object — read the body to get the real message.
  if (error) {
    let message = error.message;
    try {
      const body = (await (error.context as Response).json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* body not JSON — use the default message */
    }
    throw new Error(message);
  }

  if (data?.error) throw new Error(data.error as string);
}

export function useInviteBorrower() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: inviteBorrower,

    onSuccess: (_data, { email }) => {
      toast.success(`Invitation sent to ${email}.`);
      void queryClient.invalidateQueries({ queryKey: ["borrowers"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },

    onError: (err: Error) => {
      toast.error(err.message || "Failed to send invitation. Please try again.");
    },
  });
}
