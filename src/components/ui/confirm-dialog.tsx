import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  isPending = false,
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus cancel button when dialog opens (safer default)
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  const isDanger = variant === "danger";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />

          {/* Dialog — bottom sheet on mobile, centered on desktop */}
          <motion.div
            role="alertdialog"
            aria-modal="true"
            className="bg-card border-border/60 relative z-10 max-h-[85dvh] w-full max-w-sm overflow-y-auto rounded-t-2xl border shadow-2xl sm:rounded-2xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.15 }}
          >
            {/* Icon + content */}
            <div className="p-5 sm:p-6">
              <div
                className={cn(
                  "mb-4 flex h-10 w-10 items-center justify-center rounded-full",
                  isDanger ? "bg-rose-500/15" : "bg-amber-500/15"
                )}
              >
                {isDanger ? (
                  <Trash2
                    className={cn("h-5 w-5", isDanger ? "text-rose-400" : "text-amber-400")}
                  />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                )}
              </div>

              <p className="text-foreground text-sm font-semibold">{title}</p>
              {description && (
                <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                  {description}
                </p>
              )}
            </div>

            {/* Actions — stacked on narrow screens for easier tapping */}
            <div className="border-border/60 pb-safe flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:gap-3 sm:px-6">
              <button
                ref={cancelRef}
                type="button"
                onClick={onCancel}
                disabled={isPending}
                className="border-border/60 text-muted-foreground hover:text-foreground active:bg-muted/40 flex min-h-11 flex-1 touch-manipulation items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 sm:min-h-0"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isPending}
                className={cn(
                  "flex min-h-11 flex-1 touch-manipulation items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors active:scale-[0.98] disabled:opacity-50 sm:min-h-0",
                  isDanger
                    ? "bg-rose-500 text-white hover:bg-rose-600"
                    : "bg-amber-500 text-white hover:bg-amber-600"
                )}
              >
                {isPending ? "Please wait…" : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
