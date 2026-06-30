import { useRef, useState } from "react";
import { Download, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cardVariants } from "@/lib/animations";
import {
  downloadSettingsBackup,
  exportSettingsBackup,
  parseSettingsBackupFile,
  restoreSettingsBackup,
} from "@/lib/dataBackup";
import { useAuth } from "@/hooks/useAuth";
import { budgetCurrencyKeys } from "@/hooks/useBudgetCurrencies";
import { cardCurrencyKeys } from "@/hooks/useCardCurrencies";

interface DataBackupSectionProps {
  onRestored?: () => void;
}

export function DataBackupSection({ onRestored }: DataBackupSectionProps) {
  const { session, profile, activeOrgId, activeRole, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const isAdmin = activeRole === "admin";

  async function handleExport() {
    if (!session?.user?.id) return;
    setExporting(true);
    try {
      const payload = await exportSettingsBackup({
        userId: session.user.id,
        orgId: activeOrgId,
        isAdmin,
      });
      downloadSettingsBackup(payload);
      toast.success("Settings backup downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  async function handleRestore(file: File) {
    if (!session?.user?.id) return;
    setRestoring(true);
    try {
      const payload = await parseSettingsBackupFile(file);
      const result = await restoreSettingsBackup({
        userId: session.user.id,
        orgId: activeOrgId,
        isAdmin,
        payload,
      });

      await refreshProfile?.();
      onRestored?.();

      const parts = [
        result.profileUpdated && "profile",
        result.budgetCurrenciesUpdated > 0 &&
          `${result.budgetCurrenciesUpdated} budget ${result.budgetCurrenciesUpdated === 1 ? "currency" : "currencies"}`,
        result.cardCurrenciesUpdated > 0 &&
          `${result.cardCurrenciesUpdated} card ${result.cardCurrenciesUpdated === 1 ? "currency" : "currencies"}`,
        result.organizationUpdated && "organization",
        result.creditSourcesUpserted > 0 &&
          `${result.creditSourcesUpserted} credit ${result.creditSourcesUpserted === 1 ? "source" : "sources"}`,
      ].filter(Boolean);

      toast.success(`Restored: ${parts.join(", ") || "settings applied"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="bg-card border-border/60 overflow-hidden rounded-xl border"
    >
      <div className="border-border/60 border-b px-5 py-4">
        <h2 className="text-foreground text-sm font-semibold">Settings backup</h2>
      </div>
      <div className="space-y-4 px-5 py-5">
        <p className="text-muted-foreground text-xs leading-relaxed">
          Export a JSON snapshot of your important settings — profile, budget & card currencies
          {isAdmin ? ", organization settings, and credit source defaults" : ""}. Loans, budget
          entries, wealth balances, and expense tabs are not included.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={exporting || restoring}
            onClick={() => void handleExport()}
            className="border-border/60 text-foreground hover:bg-muted/50 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Export settings
          </button>

          <button
            type="button"
            disabled={exporting || restoring}
            onClick={() => fileInputRef.current?.click()}
            className="border-border/60 text-foreground hover:bg-muted/50 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50"
          >
            {restoring ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            Restore from file
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleRestore(file);
            }}
          />
        </div>

        {profile && (
          <p className="text-muted-foreground text-[10px]">
            Signed in as {profile.full_name}
            {isAdmin ? " · admin backup includes org + credit sources" : ""}
          </p>
        )}
      </div>
    </motion.div>
  );
}

/** Query keys to invalidate after a settings restore. */
export const settingsRestoreInvalidations = [
  budgetCurrencyKeys.all,
  cardCurrencyKeys.all,
  ["credit-sources"],
] as const;
