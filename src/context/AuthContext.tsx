import { createContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib";
import type { Tables } from "@/types/database";
import type { UserRole } from "@/types/enums";

type Profile = Tables<"profiles">;

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  activeOrgId: string | null;
  activeRole: UserRole | null;
  activePlan: string | null;
  activeRegions: string[];
  switchOrg: (orgId: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
export type { AuthContextValue };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [activeRegions, setActiveRegions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(data);
  }

  // Resolves which org the user is currently acting in and their role within it.
  //
  // Single query fetches all org_members rows (gives count + roles in one shot).
  //
  // Single-org path:  always upsert user_org_context on every call so the row
  //   stays fresh on each sign-in and self-heals if it was ever deleted.
  //
  // Multi-org path:  read user_org_context to preserve the user's last chosen
  //   context. Only seed it if no row exists yet (new account or deleted row);
  //   multi-org users choose their active org via OrgPickerPage after login.
  async function fetchOrgContext(userId: string) {
    const { data: memberships } = await supabase
      .from("org_members")
      .select("org_id, role")
      .eq("user_id", userId);

    if (!memberships || memberships.length === 0) {
      setActiveOrgId(null);
      setActiveRole(null);
      return;
    }

    let orgId: string;
    let role: UserRole;

    if (memberships.length === 1) {
      // Single-org: always upsert to keep context fresh on every sign-in
      orgId = memberships[0].org_id;
      role = memberships[0].role as UserRole;
      await supabase
        .from("user_org_context")
        .upsert({ user_id: userId, org_id: orgId });
    } else {
      // Multi-org: honour their last chosen context; only seed when missing
      const { data: ctx } = await supabase
        .from("user_org_context")
        .select("org_id")
        .eq("user_id", userId)
        .single();

      if (ctx?.org_id) {
        orgId = ctx.org_id;
      } else {
        // No context row yet — seed with first membership
        // (LoginPage will redirect them to OrgPickerPage to make a real choice)
        orgId = memberships[0].org_id;
        await supabase
          .from("user_org_context")
          .upsert({ user_id: userId, org_id: orgId });
      }

      // Role is already in memory — no extra DB round-trip needed
      const match = memberships.find((m) => m.org_id === orgId);
      role = (match?.role ?? memberships[0].role) as UserRole;
    }

    setActiveOrgId(orgId);
    setActiveRole(role);

    const { data: org } = await supabase
      .from("organizations")
      .select("plan, region, active_regions")
      .eq("id", orgId)
      .single();
    setActivePlan(org?.plan ?? null);
    setActiveRegions(org?.active_regions ?? (org?.region ? [org.region] : []));
  }

  // Switches the user's active org context (for multi-org users).
  // Updates user_org_context in the DB so all subsequent RLS queries use the new org.
  async function switchOrg(orgId: string) {
    const userId = session?.user?.id;
    if (!userId) return;

    await supabase
      .from("user_org_context")
      .upsert({ user_id: userId, org_id: orgId });

    const { data: member } = await supabase
      .from("org_members")
      .select("role")
      .eq("user_id", userId)
      .eq("org_id", orgId)
      .single();

    setActiveOrgId(orgId);
    setActiveRole((member?.role as UserRole) ?? null);
  }

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      // PASSWORD_RECOVERY fires when the SDK exchanges a recovery/invite code.
      // Redirect immediately — do NOT set loading=false so the app never renders
      // the current route, preventing the bypass where users skip the reset form.
      if (event === "PASSWORD_RECOVERY") {
        window.location.replace("/reset-password?recovery=1");
        return;
      }

      setSession(next);

      if (next?.user) {
        // TOKEN_REFRESHED fires on tab focus every hour — user identity hasn't changed.
        // Only re-fetch when the user actually signs in or the session is first resolved.
        if (event !== "TOKEN_REFRESHED") {
          void Promise.all([
            fetchProfile(next.user.id),
            fetchOrgContext(next.user.id),
          ]);
        }
      } else {
        setProfile(null);
        setActiveOrgId(null);
        setActiveRole(null);
        setActivePlan(null);
        setActiveRegions([]);
        if (event === "SIGNED_OUT") {
          window.location.replace("/login");
        }
      }

      // INITIAL_SESSION fires exactly once on mount (session present or null).
      // Marks the auth state as resolved so the app can render.
      if (event === "INITIAL_SESSION") {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    const userId = session?.user?.id;
    if (userId) await fetchProfile(userId);
  };

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, activeOrgId, activeRole, activePlan, activeRegions, switchOrg, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}
