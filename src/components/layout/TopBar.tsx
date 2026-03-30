import { useState } from "react";
import { useNavigate } from "react-router";
import { LockKeyhole, Sun, Moon, LogOut, UserCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { RegionBadge } from "@/components/ui/region-badge";
import { NotificationBell } from "@/components/layout/NotificationBell";

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

export function TopBar() {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header className="border-border/60 bg-background/80 flex h-14 shrink-0 items-center justify-between border-b px-4 backdrop-blur-sm md:hidden">
      {/* App logo + name */}
      <div className="flex items-center gap-2.5">
        <div className="bg-primary/10 border-border flex h-7 w-7 items-center justify-center rounded-lg border">
          <LockKeyhole className="text-primary h-3.5 w-3.5" />
        </div>
        <span className="text-foreground text-sm font-semibold tracking-tight">Loan Tracker</span>
      </div>

      {/* Right: theme toggle + notifications + avatar menu */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <NotificationBell panelOrigin="top-right" />

        {profile && (
          <div className="relative">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="bg-primary/15 text-primary flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full text-xs font-semibold"
              aria-label="Account menu"
            >
              {(() => {
                const src = resolveAvatarUrl(profile.avatar_url, profile.id);
                return src ? (
                  <img src={src} alt={profile.full_name} className="h-full w-full object-cover" />
                ) : (
                  getInitials(profile.full_name)
                );
              })()}
            </button>

            {showMenu && (
              <>
                {/* Invisible backdrop to close on outside click */}
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />

                {/* Dropdown */}
                <div className="bg-card border-border/60 absolute top-10 right-0 z-50 w-52 overflow-hidden rounded-xl border shadow-xl">
                  {/* User info */}
                  <div className="border-border/60 border-b px-4 py-3">
                    <p className="text-foreground text-sm font-medium">{profile.full_name}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="text-muted-foreground text-xs capitalize">
                        {profile.role}
                      </span>
                      <span className="text-border">·</span>
                      <RegionBadge region={profile.region} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-1">
                    <button
                      onClick={() => {
                        void navigate("/profile");
                        setShowMenu(false);
                      }}
                      className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
                    >
                      <UserCircle className="h-4 w-4" />
                      My Profile
                    </button>
                    <button
                      onClick={() => {
                        void signOut();
                        setShowMenu(false);
                      }}
                      className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
