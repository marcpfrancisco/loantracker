import { createBrowserRouter, redirect, type LoaderFunctionArgs } from "react-router";
import { requireAuth, requireAdmin, requireGuest } from "@/lib/loaders";
import DashboardLayout from "@/components/layout/DashboardLayout";
import LoginPage from "@/pages/LoginPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import LoansPage from "@/pages/LoansPage";
import LoanDetailPage from "@/pages/LoanDetailPage";
import AdminPage from "@/pages/AdminPage";
import ProfilePage from "@/pages/ProfilePage";
import { RouteErrorPage } from "@/components/ErrorBoundary";

export const router = createBrowserRouter([
  // ── Root redirect ──────────────────────────────────────────────────────────
  // Forward Supabase auth params to /reset-password so recovery/invite links
  // that point to the Site URL root don't lose their code on redirect.
  {
    index: true,
    loader: ({ request }: LoaderFunctionArgs) => {
      const url = new URL(request.url);
      const code      = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");
      const type      = url.searchParams.get("type");

      if (code || (tokenHash && type)) {
        return redirect(`/reset-password?${url.searchParams.toString()}`);
      }
      return redirect("/dashboard");
    },
    errorElement: <RouteErrorPage />,
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
    errorElement: <RouteErrorPage />,
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
      {
        path: "profile",
        Component: ProfilePage,
      },
    ],
  },
]);
