import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { isFinanceRoute, mobileBottomNavItems, mobileMoreMenuItems } from "./navItems";
import { useAuth } from "@/hooks/useAuth";

export function BottomNav() {
  const { profile } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const isAdmin = profile?.role === "admin";

  const moreItems = mobileMoreMenuItems.filter((item) => !item.adminOnly || isAdmin);

  function isItemActive(item: (typeof mobileBottomNavItems)[number]): boolean {
    if (item.isMore) return moreOpen;
    if (item.id === "finance") return isFinanceRoute(pathname);
    if (item.to === "/dashboard") return pathname === "/dashboard";
    return pathname === item.to || pathname.startsWith(`${item.to}/`);
  }

  return (
    <>
      <nav className="border-border/60 bg-background/90 pb-safe fixed right-0 bottom-0 left-0 z-30 flex h-16 shrink-0 items-stretch border-t backdrop-blur-md md:hidden">
        {mobileBottomNavItems.map((item) => {
          const active = isItemActive(item);

          if (item.isMore) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMoreOpen(true)}
                className="relative flex flex-1 flex-col items-center justify-center gap-1"
                aria-label="More menu"
              >
                {active && <NavActiveIndicator />}
                <item.icon
                  className={cn(
                    "relative z-10 h-5 w-5 transition-colors",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "relative z-10 text-[10px] font-medium transition-colors",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <NavLink
              key={item.id}
              to={item.to!}
              end={item.to === "/dashboard"}
              className="relative flex flex-1 flex-col items-center justify-center gap-1"
            >
              {active && <NavActiveIndicator />}
              <item.icon
                className={cn(
                  "relative z-10 h-5 w-5 transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span
                className={cn(
                  "relative z-10 text-[10px] font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
              aria-label="Close menu"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="bg-background border-border/60 pb-safe fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border shadow-2xl md:hidden"
            >
              <div className="border-border/60 flex items-center justify-between border-b px-5 py-4">
                <div>
                  <h2 className="text-foreground text-sm font-semibold">More</h2>
                  <p className="text-muted-foreground text-xs">Quick links & settings</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="text-muted-foreground rounded-lg p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[50vh] overflow-y-auto p-3">
                {moreItems.map((item) => (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => {
                      void navigate(item.to);
                      setMoreOpen(false);
                    }}
                    className="hover:bg-muted/50 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors"
                  >
                    <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                      <item.icon className="text-foreground h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground text-sm font-medium">{item.label}</p>
                      {item.description && (
                        <p className="text-muted-foreground text-xs">{item.description}</p>
                      )}
                    </div>
                    <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function NavActiveIndicator() {
  return (
    <>
      <motion.div
        layoutId="bottom-nav-bg"
        className="bg-primary/10 absolute inset-x-2 inset-y-1 rounded-xl"
        transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
      />
      <motion.div
        layoutId="bottom-nav-indicator"
        className="bg-primary absolute bottom-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-t-full"
        transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
      />
    </>
  );
}
