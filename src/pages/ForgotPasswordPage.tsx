import { useState } from "react";
import { Link } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cardVariants } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ── Schema ────────────────────────────────────────────────────────────────────

const forgotSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

// ── Component ─────────────────────────────────────────────────────────────────

type PageState = "form" | "success";

export default function ForgotPasswordPage() {
  const [pageState, setPageState] = useState<PageState>("form");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotFormData) => {
    setServerError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setServerError("Something went wrong. Please try again.");
      return;
    }

    // Always show success — never reveal whether the email exists
    setPageState("success");
  };

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
                  <Mail className="text-primary h-5 w-5" />
                </div>
                <p className="text-muted-foreground text-xs tracking-widest uppercase">
                  Global Loan Tracker
                </p>
              </div>

              <Card className="border-border/60 bg-card/80 shadow-2xl shadow-black/30 backdrop-blur-md">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Forgot password?</CardTitle>
                  <CardDescription>
                    Enter your email and we'll send you a reset link.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        autoFocus
                        placeholder="you@example.com"
                        aria-invalid={!!errors.email}
                        {...register("email")}
                      />
                      {errors.email && (
                        <p className="text-destructive text-xs">{errors.email.message}</p>
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
                          Sending…
                        </>
                      ) : (
                        "Send reset link"
                      )}
                    </Button>

                    <Link
                      to="/login"
                      className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 text-sm transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to sign in
                    </Link>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {pageState === "success" && (
            <motion.div key="success" variants={cardVariants} initial="hidden" animate="visible">
              <Card className="border-border/60 bg-card/80 shadow-2xl shadow-black/30 backdrop-blur-md">
                <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8 text-center">
                  <div className="bg-primary/10 flex h-14 w-14 items-center justify-center rounded-full">
                    <CheckCircle2 className="text-primary h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-foreground text-lg font-semibold">Check your email</h2>
                    <p className="text-muted-foreground text-sm">
                      If that address is registered, you'll receive a reset link shortly.
                    </p>
                  </div>
                  <Link
                    to="/login"
                    className="text-muted-foreground hover:text-foreground mt-2 flex items-center gap-1.5 text-sm transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to sign in
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
