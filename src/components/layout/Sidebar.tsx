import { NavLink } from "react-router";
import { motion } from "framer-motion";
import { LockKeyhole, LogOut, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { navItems } from "./navItems";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Sidebar() {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isAdmin = profile?.role === "admin";

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="bg-card/60 border-border/60 hidden w-60 shrink-0 flex-col border-r backdrop-blur-sm md:flex">
      {/* Logo */}
      <div className="border-border/60 flex h-16 items-center gap-3 border-b px-5">
        <div className="bg-primary/10 border-border flex h-8 w-8 items-center justify-center rounded-xl border">
          <LockKeyhole className="text-primary h-4 w-4" />
        </div>
        <span className="text-foreground text-sm font-semibold tracking-tight">
          Loan Tracker
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {visibleItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === "/dashboard"}>
            {({ isActive }) => (
              <div className="relative flex items-center gap-3 rounded-lg px-3 py-2.5">
                {isActive && (
                  <>
                    <motion.div
                      layoutId="sidebar-bg"
                      className="bg-primary/10 absolute inset-0 rounded-lg"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    />
                    <motion.div
                      layoutId="sidebar-accent"
                      className="bg-primary absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    />
                  </>
                )}
                <item.icon
                  className={cn(
                    "relative z-10 h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "relative z-10 text-sm font-medium transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      {profile && (
        <div className="border-border/60 border-t px-3 py-4">
          <div className="mb-2 flex items-center gap-3 px-3">
            {/* Avatar with initials */}
            <div className="bg-primary/15 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {getInitials(profile.full_name)}
            </div>
            <div className="min-w-0">
              <p className="text-foreground truncate text-sm font-medium">
                {profile.full_name}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-xs capitalize">{profile.role}</span>
                <span className="text-border">·</span>
                <RegionBadge region={profile.region} />
              </div>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button
            onClick={() => void signOut()}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}

function RegionBadge({ region }: { region: string }) {
  const styles =
    region === "UAE"
      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
      : "bg-blue-500/15 text-blue-400 border-blue-500/30";

  return (
    <span className={cn("rounded border px-1 py-0 text-[10px] font-medium", styles)}>
      {region}
    </span>
  );
}
