import { lazy, Suspense, type ComponentType } from "react";
import { createBrowserRouter, redirect, type LoaderFunctionArgs } from "react-router";
import { requireAuth, requireAdmin, requireGuest } from "@/lib/loaders";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { RouteFallback } from "@/components/layout/RouteFallback";
import { RouteErrorPage } from "@/components/ErrorBoundary";

function lazyPage(factory: () => Promise<{ default: ComponentType<object> }>) {
  const LazyComponent = lazy(factory);
  return function LazyPage() {
    return (
      <Suspense fallback={<RouteFallback />}>
        <LazyComponent />
      </Suspense>
    );
  };
}

const LoginPage = lazyPage(() => import("@/pages/LoginPage"));
const SignupPage = lazyPage(() => import("@/pages/SignupPage"));
const ForgotPasswordPage = lazyPage(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazyPage(() => import("@/pages/ResetPasswordPage"));
const OrgPickerPage = lazyPage(() => import("@/pages/OrgPickerPage"));
const DashboardPage = lazyPage(() => import("@/pages/DashboardPage"));
const LoansPage = lazyPage(() => import("@/pages/LoansPage"));
const LoanDetailPage = lazyPage(() => import("@/pages/LoanDetailPage"));
const AdminPage = lazyPage(() => import("@/pages/AdminPage"));
const ProfilePage = lazyPage(() => import("@/pages/ProfilePage"));
const BorrowerDetailPage = lazyPage(() => import("@/pages/BorrowerDetailPage"));
const ExpenseTabsPage = lazyPage(() => import("@/pages/ExpenseTabsPage"));
const ExpenseTabDetailPage = lazyPage(() => import("@/pages/ExpenseTabDetailPage"));
const BudgetPage = lazyPage(() => import("@/pages/BudgetPage"));
const OrgSettingsPage = lazyPage(() => import("@/pages/OrgSettingsPage"));

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
      {
        path: "budget",
        Component: BudgetPage,
      },
    ],
  },
]);
