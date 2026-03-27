import { createContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib";
import type { Tables } from "@/types/database";

type Profile = Tables<"profiles">;

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
export type { AuthContextValue };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch the public profile row for the current user
  async function fetchProfile(userId: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(data);
  }

  useEffect(() => {
    // Single source of truth: onAuthStateChange fires INITIAL_SESSION immediately
    // on mount (synchronously from localStorage), so no need for a separate getSession() call.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);

      if (next?.user) {
        // TOKEN_REFRESHED fires on tab focus every hour — profile data hasn't changed.
        // Only re-fetch when the user identity actually changes.
        if (event !== "TOKEN_REFRESHED") {
          void fetchProfile(next.user.id);
        }
      } else {
        setProfile(null);
        if (event === "SIGNED_OUT") {
          window.location.replace("/login");
        }
      }

      // INITIAL_SESSION fires exactly once on mount (session present or null).
      if (event === "INITIAL_SESSION") {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
