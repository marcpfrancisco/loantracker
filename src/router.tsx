import { createBrowserRouter, redirect } from "react-router";
import { requireAuth, requireAdmin, requireGuest } from "@/lib/loaders";
import LoginPage from "@/pages/LoginPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import LoanDetailPage from "@/pages/LoanDetailPage";
import AdminPage from "@/pages/AdminPage";

export const router = createBrowserRouter([
  // ── Root redirect ──────────────────────────────────────────────────────────
  {
    index: true,
    loader: () => redirect("/dashboard"),
  },

  // ── Guest-only routes (redirect away if already authenticated) ────────────
  {
    path: "login",
    loader: requireGuest,
    Component: LoginPage,
  },
  {
    path: "forgot-password",
    loader: requireGuest,
    Component: ForgotPasswordPage,
  },

  // Reset password is intentionally NOT behind requireGuest —
  // the recovery link from Supabase lands here and establishes a session
  // in the same page load, so we must allow access before session resolves.
  {
    path: "reset-password",
    Component: ResetPasswordPage,
  },

  // ── Protected routes ───────────────────────────────────────────────────────
  {
    path: "dashboard",
    loader: requireAuth,
    Component: DashboardPage,
  },
  {
    path: "loans/:id",
    loader: requireAuth,
    Component: LoanDetailPage,
  },

  // ── Admin-only routes ──────────────────────────────────────────────────────
  {
    path: "admin",
    loader: requireAdmin,
    Component: AdminPage,
  },
]);
