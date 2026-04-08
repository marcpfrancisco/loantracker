import { redirect } from "react-router";
import { supabase } from "@/lib/supabase";

/**
 * Use in protected route loaders.
 * Redirects to /login if no active session.
 * Redirects to /reset-password if the user hasn't completed password setup yet
 * (e.g. clicked an invite/recovery link but navigated away before saving).
 */
export async function requireAuth() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw redirect("/login");

  if (localStorage.getItem("pending_password_setup") === "1") {
    throw redirect("/reset-password?recovery=1");
  }

  return session;
}

/**
 * Use in admin-only route loaders.
 * Redirects to /login if unauthenticated, /dashboard if not admin.
 * Uses is_admin() RPC which reads from org_members + user_org_context,
 * so it correctly reflects the user's role in their active org.
 */
export async function requireAdmin() {
  const session = await requireAuth();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) throw redirect("/dashboard");
  return { session };
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
