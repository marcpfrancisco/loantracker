import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { User, Loader2, Save, Hash, X } from "lucide-react";
import { PlanBadge } from "@/components/ui/plan-badge";
import { CountryPicker } from "@/components/ui/country-picker";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { cardVariants } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { RegionType } from "@/types/enums";
import { getFlagEmoji, getCountryName, getDefaultCurrency } from "@/lib/countries";

// ── Schema ────────────────────────────────────────────────────────────────────

const orgSettingsSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  region: z.string().min(2, "Select a country"),
});

type OrgSettingsFormData = z.infer<typeof orgSettingsSchema>;

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrgData {
  id: string;
  name: string;
  slug: string;
  region: RegionType;
  plan: string;
  active_regions: string[] | null;
}

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

function OrgSettingsSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <div className="bg-muted h-6 w-40 animate-pulse rounded" />
      <div className="bg-card border-border/60 overflow-hidden rounded-xl border">
        <div className="border-border/60 border-b px-5 py-4">
          <div className="bg-muted h-4 w-28 animate-pulse rounded" />
        </div>
        <div className="space-y-4 px-5 py-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="bg-muted h-3 w-20 animate-pulse rounded" />
              <div className="bg-muted h-9 w-full animate-pulse rounded-lg" />
            </div>
          ))}
          <div className="bg-muted h-9 w-28 animate-pulse rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ── Region chip ───────────────────────────────────────────────────────────────

function RegionChip({
  code,
  isPrimary,
  onRemove,
}: {
  code: string;
  isPrimary: boolean;
  onRemove?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs",
        isPrimary
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border/60 bg-muted/50 text-foreground"
      )}
    >
      <span>{getFlagEmoji(code)}</span>
      <span className="font-medium">{getCountryName(code)}</span>
      <span className={cn("text-[11px]", isPrimary ? "text-primary/70" : "text-muted-foreground")}>
        {getDefaultCurrency(code)}
      </span>
      {isPrimary && (
        <span className="text-primary/60 ml-0.5 text-[10px]">primary</span>
      )}
      {!isPrimary && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-foreground ml-0.5 cursor-pointer transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const inputClass =
  "bg-muted/50 border-border/60 focus:border-primary/60 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed";

export default function OrgSettingsPage() {
  const { activeOrgId, profile } = useAuth();
  const [org, setOrg] = useState<OrgData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Active regions managed outside RHF (array state)
  const [localActiveRegions, setLocalActiveRegions] = useState<string[]>([]);
  const [regionsDirty, setRegionsDirty] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<OrgSettingsFormData>({
    resolver: zodResolver(orgSettingsSchema),
  });

  const watchedRegion = watch("region");

  // ── Fetch org ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!activeOrgId) return;

    supabase
      .from("organizations")
      .select("id, name, slug, region, plan, active_regions")
      .eq("id", activeOrgId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setLoadError("Could not load organisation settings.");
          return;
        }
        const orgData: OrgData = {
          id: data.id,
          name: data.name,
          slug: data.slug,
          region: data.region as RegionType,
          plan: data.plan,
          active_regions: data.active_regions,
        };
        setOrg(orgData);
        const initialRegions = data.active_regions ?? [data.region];
        setLocalActiveRegions(initialRegions);
        reset({ name: profile?.full_name ?? orgData.name, region: orgData.region });
      });
  }, [activeOrgId, profile?.full_name, reset]);

  // When primary region changes, auto-add it to active_regions if missing
  useEffect(() => {
    if (!watchedRegion) return;
    setLocalActiveRegions((prev) => {
      if (prev.includes(watchedRegion)) return prev;
      setRegionsDirty(true);
      return [...prev, watchedRegion];
    });
  }, [watchedRegion]);

  // ── Region list helpers ─────────────────────────────────────────────────────

  function addRegion(code: string) {
    if (localActiveRegions.includes(code)) return;
    setLocalActiveRegions((prev) => [...prev, code]);
    setRegionsDirty(true);
  }

  function removeRegion(code: string) {
    // Primary region cannot be removed
    if (code === watchedRegion) return;
    setLocalActiveRegions((prev) => prev.filter((r) => r !== code));
    setRegionsDirty(true);
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  const onSubmit = async (values: OrgSettingsFormData) => {
    if (!activeOrgId || !profile) return;

    // Always ensure primary region is in the active_regions list
    const finalRegions = localActiveRegions.includes(values.region)
      ? localActiveRegions
      : [values.region, ...localActiveRegions];

    const [orgResult, profileResult] = await Promise.all([
      supabase
        .from("organizations")
        .update({ name: values.name, region: values.region, active_regions: finalRegions })
        .eq("id", activeOrgId),
      supabase
        .from("profiles")
        .update({ full_name: values.name })
        .eq("id", profile.id),
    ]);

    if (orgResult.error || profileResult.error) {
      toast.error("Failed to save. Please try again.");
      return;
    }

    setOrg((prev) =>
      prev
        ? { ...prev, name: values.name, region: values.region as RegionType, active_regions: finalRegions }
        : prev
    );
    setLocalActiveRegions(finalRegions);
    setRegionsDirty(false);
    reset(values);
    toast.success("Settings saved.");
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="text-destructive text-sm">{loadError}</p>
      </div>
    );
  }

  if (!org) return <OrgSettingsSkeleton />;

  const canSave = isDirty || regionsDirty;

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <h1 className="text-foreground text-lg font-semibold">Organisation Settings</h1>

      {/* ── General ─────────────────────────────────────────────────── */}
      <Section title="General">
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate className="space-y-4">

          {/* Lender name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="org-name" className="text-foreground text-xs font-medium">
              Your Name
            </label>
            <input
              id="org-name"
              type="text"
              placeholder="e.g. Juan dela Cruz"
              aria-invalid={!!errors.name}
              className={inputClass}
              {...register("name")}
            />
            {errors.name ? (
              <p className="text-destructive text-xs">{errors.name.message}</p>
            ) : (
              <p className="text-muted-foreground flex items-center gap-1 text-xs">
                <User className="h-3 w-3 shrink-0" />
                Shown to borrowers as their lender name. Synced with your profile.
              </p>
            )}
          </div>

          {/* Primary Country */}
          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-xs font-medium">
              Primary Country
            </label>
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
            {errors.region ? (
              <p className="text-destructive text-xs">{errors.region.message}</p>
            ) : (
              <p className="text-muted-foreground text-xs">
                Default currency for new loans. Always included in active regions.
              </p>
            )}
          </div>

          {/* Active Regions */}
          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-xs font-medium">Active Regions</label>
            {/* Chips row — only shown when there are active regions */}
            {localActiveRegions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {localActiveRegions.map((code) => (
                  <RegionChip
                    key={code}
                    code={code}
                    isPrimary={code === watchedRegion}
                    onRemove={code !== watchedRegion ? () => removeRegion(code) : undefined}
                  />
                ))}
              </div>
            )}
            {/* Add region — full-width picker; value="" always shows placeholder */}
            <CountryPicker
              value=""
              onChange={addRegion}
              placeholder="+ Add another region…"
              showCurrency={true}
            />
            <p className="text-muted-foreground text-xs">
              Determines which currencies are available when creating loans.
              The primary country cannot be removed.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !canSave}
            className="bg-primary text-primary-foreground mt-1 flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSubmitting ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </Section>

      {/* ── Workspace info (read-only) ───────────────────────────────── */}
      <Section title="Workspace Info">
        <div className="space-y-4">

          {/* Slug */}
          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-xs font-medium">Workspace Slug</label>
            <div className="bg-muted/50 border-border/60 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <Hash className="text-muted-foreground h-4 w-4 shrink-0" />
              <span className="text-muted-foreground font-mono text-xs">{org.slug}</span>
            </div>
            <p className="text-muted-foreground text-xs">
              Auto-generated identifier — cannot be changed.
            </p>
          </div>

          {/* Plan */}
          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-xs font-medium">Plan</label>
            <div className="bg-muted/50 border-border/60 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <PlanBadge plan={org.plan} />
            </div>
            <p className="text-muted-foreground text-xs">
              {org.plan === "owner"
                ? "Owner account — unlimited access, no restrictions."
                : org.plan === "pro"
                  ? "Unlimited borrowers and loans."
                  : "Free plan: up to 5 borrowers and 20 active loans."}
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}
