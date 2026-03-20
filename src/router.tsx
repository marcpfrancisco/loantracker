import { createBrowserRouter, redirect } from "react-router";
import { requireAuth, requireAdmin, requireGuest } from "@/lib/loaders";
import DashboardLayout from "@/components/layout/DashboardLayout";
import LoginPage from "@/pages/LoginPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import LoansPage from "@/pages/LoansPage";
import LoanDetailPage from "@/pages/LoanDetailPage";
import AdminPage from "@/pages/AdminPage";

export const router = createBrowserRouter([
  // ── Root redirect ──────────────────────────────────────────────────────────
  {
    index: true,
    loader: () => redirect("/dashboard"),
  },

  // ── Guest-only routes ──────────────────────────────────────────────────────
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

  // Recovery link must allow access before session resolves — no requireGuest
  {
    path: "reset-password",
    Component: ResetPasswordPage,
  },

  // ── Protected layout shell ─────────────────────────────────────────────────
  {
    loader: requireAuth,
    Component: DashboardLayout,
    children: [
      {
        path: "dashboard",
        Component: DashboardPage,
      },
      {
        path: "loans",
        Component: LoansPage,
      },
      {
        path: "loans/:id",
        Component: LoanDetailPage,
      },
      {
        path: "admin",
        loader: requireAdmin,
        Component: AdminPage,
      },
    ],
  },
]);
