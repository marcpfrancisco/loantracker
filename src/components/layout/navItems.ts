import { CreditCard, LayoutDashboard, ShieldCheck, UserCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export const navItems: NavItem[] = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/loans", icon: CreditCard, label: "Loans" },
  { to: "/admin", icon: ShieldCheck, label: "Admin", adminOnly: true },
  { to: "/profile", icon: UserCircle, label: "Profile" },
];
