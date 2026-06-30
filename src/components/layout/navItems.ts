import {
  Banknote,
  CreditCard,
  LayoutDashboard,
  LayoutGrid,
  Receipt,
  ShieldCheck,
  UserCircle,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  /** Sidebar section heading — items with the same section render grouped */
  section?: "overview" | "finance" | "lending" | "admin";
}

export interface MobileNavItem {
  id: string;
  to?: string;
  label: string;
  icon: LucideIcon;
  /** Opens the more sheet instead of navigating */
  isMore?: boolean;
}

/** Routes that highlight the Finance tab on mobile */
export const financeRoutes = ["/finance", "/budget", "/cards", "/tabs"] as const;

export function isFinanceRoute(pathname: string): boolean {
  return financeRoutes.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

export const desktopNavItems: NavItem[] = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", section: "overview" },
  { to: "/finance", icon: LayoutGrid, label: "Finance", section: "finance" },
  { to: "/budget", icon: Wallet, label: "Budget", section: "finance" },
  { to: "/cards", icon: CreditCard, label: "Cards", section: "finance" },
  { to: "/tabs", icon: Receipt, label: "Tabs", section: "finance" },
  { to: "/loans", icon: Banknote, label: "Loans", section: "lending" },
  { to: "/admin", icon: ShieldCheck, label: "Admin", adminOnly: true, section: "admin" },
];

/** Compact mobile bottom bar — 4 primary actions */
export const mobileBottomNavItems: MobileNavItem[] = [
  { id: "home", to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { id: "finance", to: "/finance", label: "Finance", icon: LayoutGrid },
  { id: "loans", to: "/loans", label: "Loans", icon: Banknote },
  { id: "more", label: "More", icon: UserCircle, isMore: true },
];

export interface MoreMenuItem {
  to: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  adminOnly?: boolean;
}

export const mobileMoreMenuItems: MoreMenuItem[] = [
  {
    to: "/budget",
    label: "Budget",
    icon: Wallet,
    description: "Monthly plan & wealth",
  },
  {
    to: "/cards",
    label: "Cards",
    icon: CreditCard,
    description: "Credit & debit cards",
  },
  {
    to: "/tabs",
    label: "Expense tabs",
    icon: Receipt,
    description: "Shared expenses",
  },
  {
    to: "/profile",
    label: "Profile & backup",
    icon: UserCircle,
    description: "Account settings",
  },
  {
    to: "/admin",
    label: "Admin",
    icon: ShieldCheck,
    description: "Borrowers & org",
    adminOnly: true,
  },
];

export const navSectionLabels: Record<NonNullable<NavItem["section"]>, string> = {
  overview: "Overview",
  finance: "Personal finance",
  lending: "Lending",
  admin: "Administration",
};

/** @deprecated Use desktopNavItems — kept for any legacy imports */
export const navItems = desktopNavItems;
