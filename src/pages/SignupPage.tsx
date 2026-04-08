import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, Building2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { CountryPicker } from "@/components/ui/country-picker";

// ── Country detection ─────────────────────────────────────────────────────────
// Parse the country subtag from the browser's BCP 47 locale string.
// e.g. "ar-AE" → "AE", "fil-PH" → "PH", "en-US" → "US", "en" → ""
function detectCountry(): string {
  const lang =
    (typeof navigator !== "undefined" && (navigator.language || navigator.languages?.[0])) || "";
  const parts = lang.split("-");
  if (parts.length >= 2) {
    const code = parts[parts.length - 1].toUpperCase();
    if (/^[A-Z]{2}$/.test(code)) return code;
  }
  return "";
}

// ── Schema ────────────────────────────────────────────────────────────────────

const signupSchema = z
  .object({
    full_name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    region: z.string().min(2, "Select a country"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

// ── Component ─────────────────────────────────────────────────────────────────

export default function SignupPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { region: detectCountry() },
  });

  const onSubmit = async (values: SignupFormData) => {
    setServerError(null);

    const { data, error } = await supabase.functions.invoke("register-lender", {
      body: {
        full_name: values.full_name,
        email: values.email,
        password: values.password,
        region: values.region,
      },
    });

    if (error || !data?.success) {
      setServerError(
        (data?.error as string | undefined) ??
          error?.message ??
          "Registration failed. Please try again."
      );
      return;
    }

    setRegistered(true);
  };

  // ── Success state ──────────────────────────────────────────────────────────

  if (registered) {
    return (
      <div className="bg-background relative flex min-h-screen items-center justify-center overflow-hidden p-4">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 40%, oklch(0.35 0.08 150), transparent)",
          }}
        />

        <motion.div
          className="relative z-10 w-full max-w-sm"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="border-border/60 bg-card/80 shadow-2xl shadow-black/30 backdrop-blur-md text-center">
            <CardHeader className="pb-2">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              </div>
              <CardTitle className="text-xl">Account Created</CardTitle>
              <CardDescription>
                Your lender account is ready. Sign in to access your dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <Button className="w-full" onClick={() => void navigate("/login", { replace: true })}>
                Sign in
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ── Registration form ──────────────────────────────────────────────────────

  return (
    <div className="bg-background relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Subtle ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, oklch(0.35 0.05 260), transparent)",
        }}
      />

      <motion.div
        className="relative z-10 w-full max-w-sm"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* App icon */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="bg-primary/10 border-border flex h-12 w-12 items-center justify-center rounded-2xl border">
            <Building2 className="text-primary h-5 w-5" />
          </div>
          <p className="text-muted-foreground text-xs tracking-widest uppercase">
            Global Loan Tracker
          </p>
        </div>

        <Card className="border-border/60 bg-card/80 shadow-2xl shadow-black/30 backdrop-blur-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Create a lender account</CardTitle>
            <CardDescription>
              Set up your workspace and start tracking loans
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Your Full Name</Label>
                <Input
                  id="full_name"
                  type="text"
                  autoComplete="name"
                  autoFocus
                  placeholder="Juan dela Cruz"
                  aria-invalid={!!errors.full_name}
                  {...register("full_name")}
                />
                {errors.full_name && (
                  <p className="text-destructive text-xs">{errors.full_name.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-destructive text-xs">{errors.email.message}</p>
                )}
              </div>

              {/* Country */}
              <div className="space-y-1.5">
                <Label htmlFor="region">Your Country</Label>
                <Controller
                  name="region"
                  control={control}
                  render={({ field }) => (
                    <CountryPicker
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                {errors.region && (
                  <p className="text-destructive text-xs">{errors.region.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-destructive text-xs">{errors.password.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirm_password">Confirm Password</Label>
                <PasswordInput
                  id="confirm_password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  aria-invalid={!!errors.confirm_password}
                  {...register("confirm_password")}
                />
                {errors.confirm_password && (
                  <p className="text-destructive text-xs">{errors.confirm_password.message}</p>
                )}
              </div>

              {/* Server error */}
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

              {/* Submit */}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Link back to login */}
        <p className="text-muted-foreground mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-foreground hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
