import { cn } from "@/lib/utils";

const REGION_CONFIG = {
  PH: { flag: "🇵🇭", label: "PH", styles: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  UAE: { flag: "🇦🇪", label: "UAE", styles: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
} as const;

interface RegionBadgeProps {
  region: string;
  /** Show the text label alongside the flag. Default: true */
  showLabel?: boolean;
  className?: string;
}

export function RegionBadge({ region, showLabel = true, className }: RegionBadgeProps) {
  const cfg = REGION_CONFIG[region as keyof typeof REGION_CONFIG] ?? REGION_CONFIG.PH;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium",
        cfg.styles,
        className
      )}
    >
      <span aria-label={`${region} flag`}>{cfg.flag}</span>
      {showLabel && cfg.label}
    </span>
  );
}

/** Plain inline text — e.g. "🇵🇭 Philippines" or "🇦🇪 UAE" */
export function RegionLabel({ region }: { region: string }) {
  const FULL: Record<string, string> = { PH: "Philippines", UAE: "UAE" };
  const cfg = REGION_CONFIG[region as keyof typeof REGION_CONFIG] ?? REGION_CONFIG.PH;
  return (
    <>
      {cfg.flag} {FULL[region] ?? region}
    </>
  );
}
