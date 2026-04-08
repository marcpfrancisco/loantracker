import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export interface AppNotification {
  id: string;
  user_id: string;
  type: "proof_submitted" | "proof_approved" | "proof_rejected" | string;
  title: string;
  body: string;
  data: {
    loan_id?: string;
    installment_id?: string;
    proof_id?: string;
    [key: string]: string | undefined;
  };
  read_at: string | null;
  created_at: string;
}

async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) throw error;
  return (data ?? []) as AppNotification[];
}

export function useNotifications() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", profile?.id],
    queryFn: () => fetchNotifications(profile!.id),
    enabled: !!profile?.id,
  });

  // Realtime: new notifications arrive instantly without a manual refresh.
  // We explicitly remove any stale channel with the same topic before subscribing.
  // removeChannel() is async — without this guard, React StrictMode (or any fast
  // re-render) can cause supabase.channel() to return the still-registered, already-
  // subscribed instance, which throws "cannot add callbacks after subscribe()".
  useEffect(() => {
    if (!profile?.id) return;

    const channelName = `notifications:${profile.id}`;

    supabase
      .getChannels()
      .filter((ch) => ch.topic === `realtime:${channelName}`)
      .forEach((ch) => void supabase.removeChannel(ch));

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: ["notifications", profile.id],
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);

  const { mutate: markRead } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications", profile?.id] });
    },
  });

  const { mutate: markAllRead } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", profile!.id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications", profile?.id] });
    },
  });

  const notifications = query.data ?? [];
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return {
    notifications,
    isLoading: query.isLoading,
    unreadCount,
    markRead,
    markAllRead,
  };
}
