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
import BorrowerDetailPage from "@/pages/BorrowerDetailPage";
import ExpenseTabsPage from "@/pages/ExpenseTabsPage";
import ExpenseTabDetailPage from "@/pages/ExpenseTabDetailPage";
import { RouteErrorPage } from "@/components/ErrorBoundary";
import SignupPage from "@/pages/SignupPage";
import OrgPickerPage from "@/pages/OrgPickerPage";
import OrgSettingsPage from "@/pages/OrgSettingsPage";

export const router = createBrowserRouter([
  // ── Root redirect ──────────────────────────────────────────────────────────
  // Forward Supabase auth params to /reset-password so recovery/invite links
  // that point to the Site URL root don't lose their code on redirect.
  {
    index: true,
    loader: ({ request }: LoaderFunctionArgs) => {
      const url = new URL(request.url);
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");

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
    path: "signup",
    loader: requireGuest,
    Component: SignupPage,
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

  // Org picker — shown after login for multi-org users; requires auth, not guest-only
  {
    path: "org-picker",
    loader: requireAuth,
    Component: OrgPickerPage,
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
        path: "org-settings",
        loader: requireAdmin,
        Component: OrgSettingsPage,
      },
      {
        path: "profile",
        Component: ProfilePage,
      },
      {
        path: "borrowers/:id",
        loader: requireAdmin,
        Component: BorrowerDetailPage,
      },
      {
        path: "tabs",
        Component: ExpenseTabsPage,
      },
      {
        path: "tabs/:id",
        Component: ExpenseTabDetailPage,
      },
    ],
  },
]);
