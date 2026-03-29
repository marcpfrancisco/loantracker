import { useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  FileCheck,
  CheckCircle,
  XCircle,
  Clock,
  CheckCheck,
  CreditCard,
  Trophy,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatRelative(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffM = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffM / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffM < 1) return "just now";
  if (diffM < 60) return `${diffM}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD === 1) return "yesterday";
  return `${diffD}d ago`;
}

function NotificationIcon({ type }: { type: string }) {
  const base = "h-4 w-4";
  switch (type) {
    case "proof_submitted":
      return <FileCheck className={cn(base, "text-primary")} />;
    case "proof_approved":
      return <CheckCircle className={cn(base, "text-emerald-400")} />;
    case "proof_rejected":
      return <XCircle className={cn(base, "text-rose-400")} />;
    case "installment_paid":
      return <CheckCircle className={cn(base, "text-emerald-400")} />;
    case "loan_assigned":
      return <CreditCard className={cn(base, "text-primary")} />;
    case "loan_completed":
      return <Trophy className={cn(base, "text-blue-400")} />;
    case "loan_defaulted":
      return <AlertTriangle className={cn(base, "text-rose-400")} />;
    case "loan_cancelled":
      return <XCircle className={cn(base, "text-zinc-400")} />;
    case "loan_reopened":
      return <RefreshCw className={cn(base, "text-emerald-400")} />;
    default:
      return <Clock className={cn(base, "text-muted-foreground")} />;
  }
}

function iconBg(type: string): string {
  switch (type) {
    case "proof_submitted":
      return "bg-primary/10";
    case "proof_approved":
      return "bg-emerald-500/10";
    case "proof_rejected":
      return "bg-rose-500/10";
    case "installment_paid":
      return "bg-emerald-500/10";
    case "loan_assigned":
      return "bg-primary/10";
    case "loan_completed":
      return "bg-blue-500/10";
    case "loan_defaulted":
      return "bg-rose-500/10";
    case "loan_cancelled":
      return "bg-zinc-500/10";
    case "loan_reopened":
      return "bg-emerald-500/10";
    default:
      return "bg-muted";
  }
}

// ── Notification row ───────────────────────────────────────────────────────────

function NotificationRow({
  notification,
  onClose,
  markRead,
}: {
  notification: AppNotification;
  onClose: () => void;
  markRead: (id: string) => void;
}) {
  const navigate = useNavigate();
  const isUnread = !notification.read_at;

  function handleClick() {
    if (isUnread) markRead(notification.id);
    if (notification.data.loan_id) {
      void navigate(`/loans/${notification.data.loan_id}`);
    }
    onClose();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors",
        isUnread ? "hover:bg-muted/50 bg-primary/5" : "hover:bg-muted/30"
      )}
    >
      {/* Type icon */}
      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          iconBg(notification.type)
        )}
      >
        <NotificationIcon type={notification.type} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm leading-snug",
              isUnread ? "text-foreground font-medium" : "text-muted-foreground"
            )}
          >
            {notification.title}
          </p>
          {isUnread && <span className="bg-primary mt-1 h-1.5 w-1.5 shrink-0 rounded-full" />}
        </div>
        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-relaxed">
          {notification.body}
        </p>
        <p className="text-muted-foreground/60 mt-1 text-[10px]">
          {formatRelative(notification.created_at)}
        </p>
      </div>
    </button>
  );
}

// ── Bell button + panel ────────────────────────────────────────────────────────

interface NotificationBellProps {
  /** "bottom-right" for Sidebar (desktop), "top-right" for TopBar (mobile) */
  panelOrigin?: "top-right" | "bottom-right";
}

export function NotificationBell({ panelOrigin = "top-right" }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const { notifications, isLoading, unreadCount, markRead, markAllRead } = useNotifications();

  const unread = notifications.filter((n) => !n.read_at);
  const read = notifications.filter((n) => !!n.read_at);

  const panelClass = cn(
    "bg-card border-border/60 absolute z-50 w-80 overflow-hidden rounded-xl border shadow-2xl",
    panelOrigin === "top-right" && "right-0 top-10",
    panelOrigin === "bottom-right" && "bottom-10 left-0"
  );

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground hover:bg-muted/50 relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] leading-none font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            {/* Panel */}
            <motion.div
              className={panelClass}
              initial={{ opacity: 0, scale: 0.95, y: panelOrigin === "top-right" ? -6 : 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: panelOrigin === "top-right" ? -6 : 6 }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Header */}
              <div className="border-border/60 flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-foreground text-sm font-semibold">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="bg-primary/15 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllRead()}
                    className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 text-xs transition-colors"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="max-h-[420px] overflow-y-auto">
                {isLoading ? (
                  <div className="divide-border/40 space-y-0 divide-y">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-start gap-3 px-4 py-3">
                        <div className="bg-muted mt-0.5 h-7 w-7 animate-pulse rounded-full" />
                        <div className="flex-1 space-y-1.5">
                          <div className="bg-muted h-3.5 w-40 animate-pulse rounded" />
                          <div className="bg-muted h-3 w-56 animate-pulse rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                    <Bell className="text-muted-foreground/30 mb-3 h-8 w-8" />
                    <p className="text-muted-foreground text-sm">No notifications yet.</p>
                    <p className="text-muted-foreground/60 mt-0.5 text-xs">
                      You'll be notified about payment proofs here.
                    </p>
                  </div>
                ) : (
                  <>
                    {unread.length > 0 && (
                      <div className="divide-border/40 divide-y">
                        {unread.map((n) => (
                          <NotificationRow
                            key={n.id}
                            notification={n}
                            onClose={() => setOpen(false)}
                            markRead={markRead}
                          />
                        ))}
                      </div>
                    )}

                    {read.length > 0 && (
                      <>
                        {unread.length > 0 && (
                          <div className="border-border/40 border-t px-4 py-2">
                            <p className="text-muted-foreground/60 text-[10px] font-medium tracking-wider uppercase">
                              Earlier
                            </p>
                          </div>
                        )}
                        <div className="divide-border/40 divide-y">
                          {read.map((n) => (
                            <NotificationRow
                              key={n.id}
                              notification={n}
                              onClose={() => setOpen(false)}
                              markRead={markRead}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
