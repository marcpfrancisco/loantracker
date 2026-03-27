import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Mail,
  MapPin,
  KeyRound,
  AlertCircle,
  Loader2,
  ChevronRight,
  Trash2,
  Check,
  Shuffle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { cardVariants } from "@/lib/animations";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useMyLoans } from "@/hooks/useMyLoans";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";
import { useChangePassword } from "@/hooks/useChangePassword";
import type { LoanStatus, CreditSourceType, LoanType } from "@/types/database";

// ── DiceBear ──────────────────────────────────────────────────────────────────

// Each style family gets 2 variants (different seeds). Stored as
// "dicebear:{style}:{variant}" where variant is "1" or "2".
const DICEBEAR_OPTIONS = [
  { style: "adventurer-neutral", variant: "1", label: "Adventurer A" },
  { style: "adventurer-neutral", variant: "2", label: "Adventurer B" },
  { style: "bottts-neutral",     variant: "1", label: "Bottts A"     },
  { style: "bottts-neutral",     variant: "2", label: "Bottts B"     },
  { style: "big-ears-neutral",   variant: "1", label: "Big Ears A"   },
  { style: "big-ears-neutral",   variant: "2", label: "Big Ears B"   },
] as const;

type DiceBearOptionId =
  `${(typeof DICEBEAR_OPTIONS)[number]["style"]}:${(typeof DICEBEAR_OPTIONS)[number]["variant"]}`;

/** Build a DiceBear SVG URL. Variant "2" uses an alternate seed. */
function dicebearUrl(style: string, variant: string, userId: string): string {
  const seed = variant === "2" ? `${userId}_v2` : userId;
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

/**
 * Resolves avatar_url from DB to a displayable src:
 *   - null                     → undefined (show initials)
 *   - "dicebear:{style}:{v}"   → DiceBear API URL
 *   - anything else            → Supabase Storage public URL
 */
function resolveAvatarUrl(avatarUrl: string | null, userId: string): string | undefined {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith("dicebear:")) {
    const rest = avatarUrl.slice("dicebear:".length); // e.g. "bottts-neutral:2"
    const lastColon = rest.lastIndexOf(":");
    const style = lastColon >= 0 ? rest.slice(0, lastColon) : rest;
    const variant = lastColon >= 0 ? rest.slice(lastColon + 1) : "1";
    return dicebearUrl(style, variant, userId);
  }
  return supabase.storage.from("avatars").getPublicUrl(avatarUrl).data.publicUrl;
}

// ── Other helpers ─────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const loanTypeLabels: Record<LoanType, string> = {
  tabby: "Tabby",
  sloan: "SLoan",
  gloan: "GLoan",
  spaylater: "SPayLater",
  credit_card: "Credit Card",
  custom: "Custom",
  lazcredit: "LazCredit",
  maribank_credit: "Maribank Credit",
};

const sourceTypeLabels: Record<CreditSourceType, string> = {
  e_wallet: "E-Wallet",
  credit_card: "Credit Card",
  bnpl: "BNPL",
  bank_transfer: "Bank Transfer",
};

const loanStatusStyles: Record<LoanStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  completed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  defaulted: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="bg-card border-border/60 overflow-hidden rounded-xl border"
    >
      <div className="border-border/60 border-b px-5 py-4">
        <h2 className="text-foreground text-sm font-semibold">{title}</h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </motion.div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ProfilePageSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <div className="bg-muted h-6 w-28 animate-pulse rounded" />

      {/* Basic Info card */}
      <div className="bg-card border-border/60 overflow-hidden rounded-xl border">
        <div className="border-border/60 border-b px-5 py-4">
          <div className="bg-muted h-4 w-20 animate-pulse rounded" />
        </div>
        <div className="space-y-6 px-5 py-5">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-muted h-20 w-20 animate-pulse rounded-full" />
            <div className="flex gap-2">
              <div className="bg-muted h-7 w-28 animate-pulse rounded-lg" />
              <div className="bg-muted h-7 w-28 animate-pulse rounded-lg" />
            </div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="bg-muted h-3 w-16 animate-pulse rounded" />
                <div className="bg-muted h-9 w-full animate-pulse rounded-lg" />
              </div>
            ))}
          </div>
          <div className="bg-muted h-9 w-28 animate-pulse rounded-lg" />
        </div>
      </div>

      {/* Account Settings card */}
      <div className="bg-card border-border/60 overflow-hidden rounded-xl border">
        <div className="border-border/60 border-b px-5 py-4">
          <div className="bg-muted h-4 w-32 animate-pulse rounded" />
        </div>
        <div className="space-y-4 px-5 py-5">
          <div className="bg-muted h-3 w-28 animate-pulse rounded" />
          {[1, 2].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="bg-muted h-3 w-20 animate-pulse rounded" />
              <div className="bg-muted h-9 w-full animate-pulse rounded-lg" />
            </div>
          ))}
          <div className="bg-muted h-9 w-36 animate-pulse rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { profile, session } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === "admin";

  // ── Avatar state ───────────────────────────────────────────────────────────
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  // pending DiceBear selection (not yet saved) — e.g. "bottts-neutral:2"
  const [pendingDiceBear, setPendingDiceBear] = useState<DiceBearOptionId | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Basic info state ───────────────────────────────────────────────────────
  const [fullName, setFullName] = useState(() => profile?.full_name ?? "");

  const { mutate: updateProfile, isPending: updatingProfile } = useUpdateProfile();

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setAvatarError("Only JPEG, PNG, or WebP images are accepted.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setAvatarError("Image must be under 2 MB.");
      return;
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setPendingDiceBear(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setShowStylePicker(false);
    e.target.value = "";
  }

  function handleStyleSelect(optionId: DiceBearOptionId) {
    setPendingDiceBear(optionId);
    setAvatarFile(null);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
    setAvatarError(null);
  }

  function handleSaveProfile() {
    if (!fullName.trim() || !profile) return;
    const dicebearValue = pendingDiceBear ? `dicebear:${pendingDiceBear}` : undefined;
    updateProfile(
      { fullName: fullName.trim(), avatarFile, dicebearStyle: dicebearValue },
      {
        onSuccess: () => {
          setAvatarFile(null);
          setPendingDiceBear(null);
          setShowStylePicker(false);
        },
      }
    );
  }

  // Resolve what to display in the big avatar circle
  const savedAvatarSrc = profile ? resolveAvatarUrl(profile.avatar_url, profile.id) : undefined;
  const previewSrc =
    avatarPreview ??
    (pendingDiceBear && profile
      ? (() => {
          const lastColon = pendingDiceBear.lastIndexOf(":");
          const style = pendingDiceBear.slice(0, lastColon);
          const variant = pendingDiceBear.slice(lastColon + 1);
          return dicebearUrl(style, variant, profile.id);
        })()
      : null);
  const displaySrc = previewSrc ?? savedAvatarSrc;

  // Active DiceBear option id (saved or pending) — e.g. "bottts-neutral:2"
  const activeDiceBearId: DiceBearOptionId | null =
    pendingDiceBear ??
    (profile?.avatar_url?.startsWith("dicebear:")
      ? (profile.avatar_url.slice("dicebear:".length) as DiceBearOptionId)
      : null);

  // ── Password state ─────────────────────────────────────────────────────────
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const { mutate: changePassword, isPending: changingPassword } = useChangePassword();

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    changePassword(newPassword, {
      onSuccess: () => {
        setNewPassword("");
        setConfirmPassword("");
      },
    });
  }

  // ── Loan history ───────────────────────────────────────────────────────────
  const { data: loans = [], isLoading: loansLoading } = useMyLoans();
  const activeLoans = loans.filter((l) => l.status === "active");
  const pastLoans = loans.filter((l) => l.status !== "active");

  if (!profile) return <ProfilePageSkeleton />;

  const inputClass =
    "bg-muted/50 border-border/60 focus:border-primary/60 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed";

  const hasPendingChange = !!avatarFile || !!pendingDiceBear;

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <h1 className="text-foreground text-lg font-semibold">My Profile</h1>

      {/* ── Basic Info ──────────────────────────────────────────────── */}
      <Section title="Basic Info">
        {/* ── Avatar area ── */}
        <div className="mb-6 flex flex-col items-center gap-4">
          {/* Big avatar circle */}
          <div className="relative">
            <div className="h-20 w-20 overflow-hidden rounded-full ring-2 ring-border">
              {displaySrc ? (
                <img src={displaySrc} alt={profile.full_name} className="h-full w-full object-cover" />
              ) : (
                <div className="bg-primary/15 text-primary flex h-full w-full items-center justify-center text-xl font-semibold">
                  {getInitials(profile.full_name)}
                </div>
              )}
            </div>
            {/* Pending indicator */}
            {hasPendingChange && (
              <span className="bg-primary border-background absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </span>
            )}
          </div>

          {/* Avatar action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setShowStylePicker((v) => !v); }}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                showStylePicker
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              )}
            >
              <Shuffle className="h-3.5 w-3.5" />
              Choose Avatar
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="border-border/60 text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload Photo
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            onChange={handleFileChange}
            className="hidden"
          />
          {avatarError && (
            <p className="flex items-center gap-1.5 text-xs text-rose-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {avatarError}
            </p>
          )}
        </div>

        {/* ── DiceBear style picker ── */}
        <AnimatePresence>
          {showStylePicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mb-5 overflow-hidden"
            >
              <p className="text-muted-foreground mb-3 text-xs font-medium">
                Pick a style — your unique avatar is generated from your account.
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {DICEBEAR_OPTIONS.map((opt) => {
                  const optionId = `${opt.style}:${opt.variant}` as DiceBearOptionId;
                  const isActive = activeDiceBearId === optionId;
                  return (
                    <button
                      key={optionId}
                      type="button"
                      onClick={() => handleStyleSelect(optionId)}
                      className={cn(
                        "group relative flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border p-2 transition-all",
                        isActive
                          ? "bg-primary/10 border-primary/50"
                          : "border-border/60 hover:border-border hover:bg-muted/30"
                      )}
                    >
                      <div className="h-12 w-12 overflow-hidden rounded-full bg-muted">
                        <img
                          src={dicebearUrl(opt.style, opt.variant, profile.id)}
                          alt={opt.label}
                          className="h-full w-full"
                          loading="lazy"
                        />
                      </div>
                      <span className="text-muted-foreground text-[10px]">{opt.label}</span>
                      {isActive && (
                        <span className="bg-primary absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full">
                          <Check className="h-2.5 w-2.5 text-white" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Form fields ── */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-xs font-medium">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-xs font-medium">Email</label>
            <input
              type="email"
              value={session?.user.email ?? ""}
              disabled
              className={inputClass}
            />
            <p className="text-muted-foreground flex items-center gap-1 text-xs">
              <Mail className="h-3 w-3 shrink-0" />
              To change your email, contact your administrator.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-xs font-medium">Region</label>
            <div className="bg-muted/50 border-border/60 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <MapPin className="text-muted-foreground h-4 w-4 shrink-0" />
              <span className="text-foreground">
                {profile.region === "PH" ? "🇵🇭 Philippines" : "🇦🇪 UAE"}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              Region is managed by your administrator.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={updatingProfile || !fullName.trim()}
          className="bg-primary text-primary-foreground mt-5 flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
        >
          {updatingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
          {updatingProfile ? "Saving…" : "Save Changes"}
        </button>
      </Section>

      {/* ── Account Settings ─────────────────────────────────────────── */}
      <Section title="Account Settings">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            Change Password
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-xs font-medium">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-xs font-medium">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              autoComplete="new-password"
              className={inputClass}
            />
          </div>

          {passwordError && (
            <p className="flex items-center gap-1.5 text-xs text-rose-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {passwordError}
            </p>
          )}

          <button
            type="submit"
            disabled={changingPassword || !newPassword || !confirmPassword}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
          >
            {changingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
            <KeyRound className="h-4 w-4" />
            {changingPassword ? "Updating…" : "Update Password"}
          </button>
        </form>
      </Section>

      {/* ── Loan History (borrowers only) ────────────────────────────── */}
      {!isAdmin && (
        <Section title="Loan History">
          {loansLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-muted h-14 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : loans.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">No loans yet.</p>
          ) : (
            <div className="space-y-4">
              {activeLoans.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
                    Active
                  </p>
                  <div className="divide-border/40 divide-y overflow-hidden rounded-lg border border-border/60">
                    {activeLoans.map((loan) => (
                      <LoanHistoryRow
                        key={loan.id}
                        loan={loan}
                        onClick={() => void navigate(`/loans/${loan.id}`)}
                      />
                    ))}
                  </div>
                </div>
              )}
              {pastLoans.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
                    Past
                  </p>
                  <div className="divide-border/40 divide-y overflow-hidden rounded-lg border border-border/60">
                    {pastLoans.map((loan) => (
                      <LoanHistoryRow
                        key={loan.id}
                        loan={loan}
                        onClick={() => void navigate(`/loans/${loan.id}`)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Section>
      )}

      {/* ── Danger Zone ──────────────────────────────────────────────── */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="bg-card border-border/60 overflow-hidden rounded-xl border"
      >
        <div className="border-border/60 border-b px-5 py-4">
          <h2 className="text-foreground text-sm font-semibold">Danger Zone</h2>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-foreground text-sm font-medium">Delete Account</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Permanently remove your account and all data. This action cannot be undone.
              </p>
            </div>
            <button
              type="button"
              disabled
              title="Coming soon — contact your administrator"
              className="flex shrink-0 cursor-not-allowed items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
          <p className="text-muted-foreground mt-3 text-xs">
            Account deletion is coming soon. In the meantime, contact your administrator.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ── Loan History Row ──────────────────────────────────────────────────────────

interface LoanHistoryRowProps {
  loan: {
    id: string;
    currency: string;
    principal: number;
    installments_total: number;
    status: LoanStatus;
    loan_type: LoanType;
    started_at: string;
    credit_source: { name: string; type: CreditSourceType };
    paidCount: number;
  };
  onClick: () => void;
}

function LoanHistoryRow({ loan, onClick }: LoanHistoryRowProps) {
  const progress = loan.installments_total > 0 ? loan.paidCount / loan.installments_total : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-muted/30 flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-foreground text-sm font-medium">{loan.credit_source.name}</p>
          <span className="text-muted-foreground text-xs">
            {sourceTypeLabels[loan.credit_source.type]}
          </span>
          <span
            className={cn(
              "rounded border px-1.5 py-0 text-[10px] font-medium capitalize",
              loanStatusStyles[loan.status]
            )}
          >
            {loan.status}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-muted-foreground text-xs">{loanTypeLabels[loan.loan_type]}</span>
          <span className="text-border">·</span>
          <span className="text-foreground text-xs font-medium">
            {formatCurrency(loan.principal, loan.currency)}
          </span>
          <span className="text-border">·</span>
          <span className="text-muted-foreground text-xs">
            {loan.paidCount}/{loan.installments_total} paid
          </span>
        </div>
        <div className="bg-muted mt-1.5 h-1 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-muted-foreground text-xs">{formatDate(loan.started_at)}</span>
        <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
      </div>
    </button>
  );
}
