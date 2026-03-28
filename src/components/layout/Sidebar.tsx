import { NavLink, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { LockKeyhole, LogOut, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { navItems } from "./navItems";
import { RegionBadge } from "@/components/ui/region-badge";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function resolveAvatarUrl(avatarUrl: string | null, userId: string): string | null {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith("dicebear:")) {
    const rest = avatarUrl.slice("dicebear:".length);
    const lastColon = rest.lastIndexOf(":");
    const style = lastColon >= 0 ? rest.slice(0, lastColon) : rest;
    const variant = lastColon >= 0 ? rest.slice(lastColon + 1) : "1";
    const seed = variant === "2" ? `${userId}_v2` : userId;
    return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
  }
  return supabase.storage.from("avatars").getPublicUrl(avatarUrl).data.publicUrl;
}

export function Sidebar() {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
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
          <button
            onClick={() => void navigate("/profile")}
            className="mb-2 flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50"
          >
            {/* Avatar */}
            {(() => {
              const src = resolveAvatarUrl(profile.avatar_url, profile.id);
              return src ? (
                <img
                  src={src}
                  alt={profile.full_name}
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="bg-primary/15 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                  {getInitials(profile.full_name)}
                </div>
              );
            })()}
            <div className="min-w-0 text-left">
              <p className="text-foreground truncate text-sm font-medium">
                {profile.full_name}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-xs capitalize">{profile.role}</span>
                <span className="text-border">·</span>
                <RegionBadge region={profile.region} />
              </div>
            </div>
          </button>
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

