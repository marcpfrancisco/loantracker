import { redirect } from "react-router";
import { supabase } from "@/lib/supabase";

/**
 * Use in protected route loaders.
 * Redirects to /login if no active session.
 */
export async function requireAuth() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw redirect("/login");
  return session;
}

/**
 * Use in admin-only route loaders.
 * Redirects to /login if unauthenticated, /dashboard if not admin.
 */
export async function requireAdmin() {
  const session = await requireAuth();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();
  if (profile?.role !== "admin") throw redirect("/dashboard");
  return { session, profile };
}

/**
 * Use in guest-only route loaders (login, forgot-password).
 * Redirects authenticated users away to /dashboard.
 */
export async function requireGuest() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) throw redirect("/dashboard");
  return null;
}
