import { NavLink } from "react-router";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { navItems } from "./navItems";
import { useAuth } from "@/hooks/useAuth";

export function BottomNav() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className="border-border/60 bg-background/90 fixed right-0 bottom-0 left-0 flex h-16 shrink-0 items-stretch border-t backdrop-blur-md md:hidden">
      {visibleItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/dashboard"}
          className="relative flex flex-1 flex-col items-center justify-center gap-1"
        >
          {({ isActive }) => (
            <>
              {isActive && (
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
              )}
              <item.icon
                className={cn(
                  "relative z-10 h-5 w-5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span
                className={cn(
                  "relative z-10 text-[10px] font-medium transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
