import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cardVariants } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ── Schema ────────────────────────────────────────────────────────────────────

const resetSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetFormData = z.infer<typeof resetSchema>;

// ── Component ─────────────────────────────────────────────────────────────────

type PageState = "loading" | "invalid" | "form" | "success";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Read URL params once — these are set by the Supabase email link
  const tokenHash = searchParams.get("token_hash");
  const flowType = searchParams.get("type"); // 'recovery' | 'invite'
  const code = searchParams.get("code");
  const isInvite = flowType === "invite";

  // Derive initial state synchronously — no need for an effect for the invalid case
  const hasValidParams =
    !!(tokenHash && (flowType === "recovery" || flowType === "invite")) || !!code;

  const [pageState, setPageState] = useState<PageState>(hasValidParams ? "loading" : "invalid");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // ── Token verification on mount ───────────────────────────────────────────
  // Only runs when valid params are present — all setState calls are in async callbacks

  useEffect(() => {
    if (!hasValidParams) return;

    if (tokenHash && (flowType === "recovery" || flowType === "invite")) {
      void supabase.auth
        .verifyOtp({ token_hash: tokenHash, type: flowType })
        .then(({ error }) => setPageState(error ? "invalid" : "form"));
    } else if (code) {
      void supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => setPageState(error ? "invalid" : "form"));
    }
  }, [hasValidParams, tokenHash, flowType, code]);

  // ── Form submit ───────────────────────────────────────────────────────────

  const onSubmit = async (values: ResetFormData) => {
    setServerError(null);

    const { error } = await supabase.auth.updateUser({ password: values.password });

    if (error) {
      setServerError(error.message);
      return;
    }

    setPageState("success");
    // Give user 2 s to read the success message, then land on dashboard
    setTimeout(() => void navigate("/dashboard", { replace: true }), 2000);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-background relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, oklch(0.35 0.05 260), transparent)",
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        <AnimatePresence mode="wait">
          {/* ── Loading ─────────────────────────────────────────────────── */}
          {pageState === "loading" && (
            <motion.div
              key="loading"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex justify-center"
            >
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </motion.div>
          )}

          {/* ── Invalid / expired ────────────────────────────────────────── */}
          {pageState === "invalid" && (
            <motion.div key="invalid" variants={cardVariants} initial="hidden" animate="visible">
              <Card className="border-border/60 bg-card/80 shadow-2xl shadow-black/30 backdrop-blur-md">
                <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8 text-center">
                  <div className="bg-destructive/10 flex h-14 w-14 items-center justify-center rounded-full">
                    <AlertCircle className="text-destructive h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-foreground text-lg font-semibold">Link expired</h2>
                    <p className="text-muted-foreground text-sm">
                      This link is invalid or has already been used. Request a new one.
                    </p>
                  </div>
                  <Link
                    to="/forgot-password"
                    className="text-primary hover:text-primary/80 text-sm transition-colors"
                  >
                    Request a new link
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Password form ─────────────────────────────────────────────── */}
          {pageState === "form" && (
            <motion.div
              key="form"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Icon + app label */}
              <div className="mb-6 flex flex-col items-center gap-2">
                <div className="bg-primary/10 border-border flex h-12 w-12 items-center justify-center rounded-2xl border">
                  <KeyRound className="text-primary h-5 w-5" />
                </div>
                <p className="text-muted-foreground text-xs tracking-widest uppercase">
                  Global Loan Tracker
                </p>
              </div>

              <Card className="border-border/60 bg-card/80 shadow-2xl shadow-black/30 backdrop-blur-md">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">
                    {isInvite ? "Set your password" : "Reset your password"}
                  </CardTitle>
                  <CardDescription>
                    {isInvite
                      ? "You've been invited. Create a password to access your account."
                      : "Enter a new password for your account."}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                    {/* New password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="password">New password</Label>
                      <Input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        autoFocus
                        placeholder="Min. 8 characters"
                        aria-invalid={!!errors.password}
                        {...register("password")}
                      />
                      {errors.password && (
                        <p className="text-destructive text-xs">{errors.password.message}</p>
                      )}
                    </div>

                    {/* Confirm password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword">Confirm password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Re-enter password"
                        aria-invalid={!!errors.confirmPassword}
                        {...register("confirmPassword")}
                      />
                      {errors.confirmPassword && (
                        <p className="text-destructive text-xs">{errors.confirmPassword.message}</p>
                      )}
                    </div>

                    {serverError && (
                      <motion.p
                        className="bg-destructive/10 border-destructive/30 text-destructive rounded-md border px-3 py-2 text-sm"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {serverError}
                      </motion.p>
                    )}

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving…
                        </>
                      ) : isInvite ? (
                        "Create password"
                      ) : (
                        "Update password"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Success ───────────────────────────────────────────────────── */}
          {pageState === "success" && (
            <motion.div key="success" variants={cardVariants} initial="hidden" animate="visible">
              <Card className="border-border/60 bg-card/80 shadow-2xl shadow-black/30 backdrop-blur-md">
                <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8 text-center">
                  <div className="bg-primary/10 flex h-14 w-14 items-center justify-center rounded-full">
                    <CheckCircle2 className="text-primary h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-foreground text-lg font-semibold">
                      {isInvite ? "Password created!" : "Password updated!"}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      Redirecting you to your dashboard…
                    </p>
                  </div>
                  <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
