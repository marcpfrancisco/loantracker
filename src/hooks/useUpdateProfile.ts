import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface UpdateProfilePayload {
  fullName: string;
  /** A File to upload to Storage. Takes priority over dicebearStyle. */
  avatarFile?: File | null;
  /** A "dicebear:{style}" string to store directly (no upload needed). */
  dicebearStyle?: string;
}

export function useUpdateProfile() {
  const { profile, refreshProfile } = useAuth();

  return useMutation({
    mutationFn: async ({ fullName, avatarFile, dicebearStyle }: UpdateProfilePayload) => {
      if (!profile) throw new Error("Not authenticated");

      let avatarUrl = profile.avatar_url;

      if (avatarFile) {
        // Upload custom photo — upsert so re-uploads replace the old file
        const ext = avatarFile.name.split(".").pop() ?? "jpg";
        const path = `${profile.id}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        avatarUrl = path;
      } else if (dicebearStyle) {
        // Store DiceBear preference directly — no upload required
        avatarUrl = dicebearStyle;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, avatar_url: avatarUrl })
        .eq("id", profile.id);

      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshProfile();
      toast.success("Profile updated.");
    },
    onError: () => {
      toast.error("Failed to update profile.");
    },
  });
}
