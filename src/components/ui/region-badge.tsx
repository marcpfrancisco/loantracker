import { cn } from "@/lib/utils";
import { getFlagEmoji, getCountryName } from "@/lib/countries";

// Deterministic badge colour from country code — cycles through a set of
// visually distinct palettes so each country gets a stable colour.
const PALETTES = [
  "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "bg-violet-500/15 text-violet-400 border-violet-500/30",
  "bg-rose-500/15 text-rose-400 border-rose-500/30",
  "bg-sky-500/15 text-sky-400 border-sky-500/30",
  "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "bg-teal-500/15 text-teal-400 border-teal-500/30",
] as const;

function paletteFor(code: string): string {
  const n = code
    .toUpperCase()
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return PALETTES[n % PALETTES.length];
}

interface RegionBadgeProps {
  region: string;
  /** Show the text label alongside the flag. Default: true */
  showLabel?: boolean;
  className?: string;
}

export function RegionBadge({ region, showLabel = true, className }: RegionBadgeProps) {
  const flag = getFlagEmoji(region);
  const styles = paletteFor(region);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium",
        styles,
        className
      )}
    >
      <span aria-label={`${region} flag`}>{flag}</span>
      {showLabel && region}
    </span>
  );
}

/** Plain inline text — e.g. "🇵🇭 Philippines" or "🇦🇪 United Arab Emirates" */
export function RegionLabel({ region }: { region: string }) {
  return (
    <>
      {getFlagEmoji(region)} {getCountryName(region)}
    </>
  );
}
