import { AnimatePresence, motion } from "framer-motion";
import { X, Mail, User, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { useInviteBorrower } from "@/hooks/useInviteBorrower";
import type { RegionType } from "@/types/database";

// ── Schema ─────────────────────────────────────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  full_name: z.string().min(2, "Enter at least 2 characters").max(100),
  region: z.enum(["PH", "UAE"]),
});

type FormData = {
  email: string;
  full_name: string;
  region: RegionType;
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-rose-400">{message}</p>;
}

// ── Main component ─────────────────────────────────────────────────────────────

interface InviteBorrowerDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function InviteBorrowerDrawer({ open, onClose }: InviteBorrowerDrawerProps) {
  const { mutateAsync: invite, isPending } = useInviteBorrower();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      full_name: "",
      region: "PH",
    },
  });

  const selectedRegion = watch("region");

  function handleClose() {
    if (isPending) return;
    reset();
    onClose();
  }

  async function onSubmit(data: FormData) {
    await invite(data);
    handleClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="bg-background border-border/60 fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l shadow-2xl sm:w-[400px]"
          >
            {/* Header */}
            <div className="border-border/60 flex items-center gap-3 border-b px-5 py-4">
              <div className="flex-1">
                <h2 className="text-foreground font-semibold">Invite Borrower</h2>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Send an email invitation to a new borrower.
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={isPending}
                className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-lg p-1.5 transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => void handleSubmit(onSubmit)(e)}
              className="flex flex-1 flex-col overflow-y-auto"
            >
              <div className="flex-1 space-y-5 px-5 py-6">

                {/* Email */}
                <div>
                  <label className="text-foreground mb-1.5 block text-xs font-medium">
                    Email address <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <input
                      {...register("email")}
                      type="email"
                      placeholder="borrower@example.com"
                      autoComplete="off"
                      className={cn(
                        "bg-muted/50 border-border/60 focus:border-primary/60 w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/50",
                        errors.email && "border-rose-500/60"
                      )}
                    />
                  </div>
                  <FieldError message={errors.email?.message} />
                </div>

                {/* Full name */}
                <div>
                  <label className="text-foreground mb-1.5 block text-xs font-medium">
                    Full name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <input
                      {...register("full_name")}
                      type="text"
                      placeholder="Juan dela Cruz"
                      autoComplete="off"
                      className={cn(
                        "bg-muted/50 border-border/60 focus:border-primary/60 w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/50",
                        errors.full_name && "border-rose-500/60"
                      )}
                    />
                  </div>
                  <FieldError message={errors.full_name?.message} />
                </div>

                {/* Region */}
                <div>
                  <label className="text-foreground mb-1.5 block text-xs font-medium">
                    Region <span className="text-rose-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["PH", "UAE"] as RegionType[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setValue("region", r)}
                        className={cn(
                          "cursor-pointer rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                          selectedRegion === r
                            ? r === "UAE"
                              ? "border-amber-500/40 bg-amber-500/15 text-amber-400"
                              : "border-primary/40 bg-primary/15 text-primary"
                            : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                        )}
                      >
                        {r === "PH" ? "🇵🇭 Philippines" : "🇦🇪 UAE"}
                      </button>
                    ))}
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs">
                    Determines the borrower's currency and loan templates. Cannot be changed later.
                  </p>
                </div>

                {/* Info banner */}
                <div className="bg-muted/40 border-border/60 rounded-lg border px-4 py-3 text-xs text-muted-foreground">
                  The borrower will receive an email with a link to set their password and access the app.
                  Their account will be created with the <span className="text-foreground font-medium">borrower</span> role.
                </div>
              </div>

              {/* Footer */}
              <div className="border-border/60 flex items-center justify-end gap-3 border-t px-5 py-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="border-border/60 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg border px-4 py-2 text-sm transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Send Invitation"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
