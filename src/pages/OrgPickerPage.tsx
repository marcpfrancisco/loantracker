import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, ChevronRight, Loader2, ShieldCheck, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RegionBadge } from "@/components/ui/region-badge";
import { PlanBadge } from "@/components/ui/plan-badge";
import type { UserRole, RegionType } from "@/types/enums";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrgOption {
  orgId: string;
  orgName: string;
  region: RegionType;
  plan: string;
  role: UserRole;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchOrgOptions(userId: string): Promise<OrgOption[]> {
  const { data, error } = await supabase
    .from("org_members")
    .select("org_id, role, organizations(id, name, region, plan)")
    .eq("user_id", userId);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const org = Array.isArray(row.organizations)
      ? row.organizations[0]
      : row.organizations;

    return {
      orgId: row.org_id,
      orgName: org?.name ?? "Unnamed Organization",
      region: (org?.region ?? "PH") as RegionType,
      plan: org?.plan ?? "free",
      role: row.role as UserRole,
    };
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  const isAdmin = role === "admin";
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        isAdmin
          ? "bg-violet-500/15 text-violet-400 border border-violet-500/25"
          : "bg-sky-500/15 text-sky-400 border border-sky-500/25",
      ].join(" ")}
    >
      {isAdmin ? <ShieldCheck className="h-3 w-3" /> : <User className="h-3 w-3" />}
      {isAdmin ? "Admin" : "Borrower"}
    </span>
  );
}


// ── Component ─────────────────────────────────────────────────────────────────

export default function OrgPickerPage() {
  const { session, switchOrg } = useAuth();
  const navigate = useNavigate();

  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  // Load memberships on mount
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    fetchOrgOptions(userId)
      .then((options) => {
        // Single-org users shouldn't reach this page — redirect immediately
        if (options.length === 1) {
          void switchOrg(options[0].orgId).then(() => navigate("/dashboard", { replace: true }));
          return;
        }
        setOrgs(options);
        setLoading(false);
      })
      .catch(() => {
        setLoadError("Could not load your organisations. Please try again.");
        setLoading(false);
      });
  }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = async (orgId: string) => {
    setSelecting(orgId);
    try {
      await switchOrg(orgId);
      void navigate("/dashboard", { replace: true });
    } catch {
      setSelecting(null);
      setLoadError("Failed to switch organisation. Please try again.");
    }
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────

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

      <motion.div
        className="relative z-10 w-full max-w-sm"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* App icon + heading */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="bg-primary/10 border-border flex h-12 w-12 items-center justify-center rounded-2xl border">
            <Building2 className="text-primary h-5 w-5" />
          </div>
          <p className="text-muted-foreground text-xs tracking-widest uppercase">
            Global Loan Tracker
          </p>
        </div>

        <div className="mb-4 text-center">
          <h1 className="text-foreground text-xl font-semibold">Choose a workspace</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            You belong to multiple organisations. Select one to continue.
          </p>
        </div>

        {/* Error */}
        <AnimatePresence>
          {loadError && (
            <motion.p
              className="bg-destructive/10 border-destructive/30 text-destructive mb-4 rounded-md border px-3 py-2 text-sm text-center"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {loadError}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Org cards */}
        <div className="space-y-3">
          {orgs.map((org, i) => {
            const isSelecting = selecting === org.orgId;
            const isDisabled = selecting !== null;

            return (
              <motion.div
                key={org.orgId}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              >
                <Card
                  className={[
                    "border-border/60 bg-card/80 shadow-lg shadow-black/20 backdrop-blur-md",
                    "transition-colors",
                    isDisabled ? "opacity-60" : "hover:border-border cursor-pointer",
                  ].join(" ")}
                  onClick={() => !isDisabled && void handleSelect(org.orgId)}
                  role="button"
                  tabIndex={isDisabled ? -1 : 0}
                  onKeyDown={(e) => {
                    if (!isDisabled && (e.key === "Enter" || e.key === " ")) {
                      void handleSelect(org.orgId);
                    }
                  }}
                  aria-label={`Select ${org.orgName}`}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    {/* Org icon */}
                    <div className="bg-primary/10 border-border/50 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border">
                      <Building2 className="text-primary h-4 w-4" />
                    </div>

                    {/* Org details */}
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-sm font-medium">{org.orgName}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <RegionBadge region={org.region} />
                        <RoleBadge role={org.role} />
                        <PlanBadge plan={org.plan} />
                      </div>
                    </div>

                    {/* Action indicator */}
                    <div className="text-muted-foreground shrink-0">
                      {isSelecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Sign out link */}
        <p className="text-muted-foreground mt-6 text-center text-sm">
          Wrong account?{" "}
          <Button
            variant="link"
            className="text-foreground h-auto p-0 text-sm font-medium hover:underline"
            onClick={() => void supabase.auth.signOut()}
          >
            Sign out
          </Button>
        </p>
      </motion.div>
    </div>
  );
}
