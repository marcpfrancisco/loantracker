import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Plus, Pencil, Trash2, Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAllCreditSources } from "@/hooks/useCreditSources";
import type { CreditSourceRow } from "@/hooks/useCreditSources";
import {
  useCreateCreditSource,
  useUpdateCreditSource,
  useToggleCreditSourceActive,
  useDeleteCreditSource,
} from "@/hooks/useCreditSourceMutations";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CountryPicker } from "@/components/ui/country-picker";
import { getFlagEmoji, getCountryName } from "@/lib/countries";
import type { CreditSourceType } from "@/types/enums";

// ── Constants ─────────────────────────────────────────────────────────────────

const NEW_TAB = "__new__";

const SOURCE_TYPES: { value: CreditSourceType; label: string }[] = [
  { value: "bnpl", label: "BNPL" },
  { value: "credit_card", label: "Credit Card" },
  { value: "e_wallet", label: "E-Wallet" },
  { value: "bank_transfer", label: "Bank Transfer" },
];

const TYPE_STYLES: Record<CreditSourceType, string> = {
  bnpl: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  credit_card: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  e_wallet: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  bank_transfer: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

function TypeBadge({ type }: { type: CreditSourceType }) {
  const label = SOURCE_TYPES.find((t) => t.value === type)?.label ?? type;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
        TYPE_STYLES[type]
      )}
    >
      {label}
    </span>
  );
}

// ── Shared default-fields section ─────────────────────────────────────────────

interface DefaultFieldsProps {
  interestRate: string;
  installments: string;
  dueDay: string;
  onInterestRateChange: (v: string) => void;
  onInstallmentsChange: (v: string) => void;
  onDueDayChange: (v: string) => void;
}

function DefaultFields({
  interestRate,
  installments,
  dueDay,
  onInterestRateChange,
  onInstallmentsChange,
  onDueDayChange,
}: DefaultFieldsProps) {
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
        Loan Defaults <span className="normal-case font-normal">(optional)</span>
      </p>
      <div className="grid grid-cols-3 gap-2">
        {/* Interest rate */}
        <div className="space-y-1">
          <p className="text-muted-foreground text-[10px]">Interest %</p>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={interestRate}
              onChange={(e) => onInterestRateChange(e.target.value)}
              placeholder="e.g. 3.5"
              className="bg-muted/50 border-border/60 focus:border-primary/60 placeholder:text-muted-foreground/40 w-full rounded-lg border py-1.5 pl-2.5 pr-5 text-xs transition-colors outline-none"
            />
            <span className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 text-[10px]">
              %
            </span>
          </div>
        </div>

        {/* Installments */}
        <div className="space-y-1">
          <p className="text-muted-foreground text-[10px]">Installments</p>
          <input
            type="number"
            min="1"
            max="360"
            step="1"
            value={installments}
            onChange={(e) => onInstallmentsChange(e.target.value)}
            placeholder="e.g. 12"
            className="bg-muted/50 border-border/60 focus:border-primary/60 placeholder:text-muted-foreground/40 w-full rounded-lg border px-2.5 py-1.5 text-xs transition-colors outline-none"
          />
        </div>

        {/* Due day */}
        <div className="space-y-1">
          <p className="text-muted-foreground text-[10px]">Due Day</p>
          <input
            type="number"
            min="1"
            max="28"
            step="1"
            value={dueDay}
            onChange={(e) => onDueDayChange(e.target.value)}
            placeholder="e.g. 15"
            className="bg-muted/50 border-border/60 focus:border-primary/60 placeholder:text-muted-foreground/40 w-full rounded-lg border px-2.5 py-1.5 text-xs transition-colors outline-none"
          />
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseOptionalFloat(v: string): number | null {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function parseOptionalInt(v: string): number | null {
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

function fmtRate(v: number | null): string {
  if (v === null || v === undefined) return "";
  // stored as decimal fraction; display as percentage
  return String(+(v * 100).toFixed(4));
}

function fmtInt(v: number | null): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

// ── Add form ──────────────────────────────────────────────────────────────────

interface AddFormProps {
  // The country to pre-select in the picker — always the lender's own region
  defaultRegion: string;
  onDone: (savedRegion?: string) => void;
}

function AddForm({ defaultRegion, onDone }: AddFormProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<CreditSourceType>("bnpl");
  const [region, setRegion] = useState(defaultRegion);
  const [interestRate, setInterestRate] = useState("");
  const [installments, setInstallments] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = useCreateCreditSource();

  async function handleSave() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({
        name: name.trim(),
        type,
        region,
        default_interest_rate: interestRate
          ? parseOptionalFloat(interestRate) !== null
            ? parseOptionalFloat(interestRate)! / 100
            : null
          : null,
        default_installments: parseOptionalInt(installments),
        default_due_day: parseOptionalInt(dueDay),
      });
      onDone(region);
    } catch {
      setError("Failed to create. Try again.");
    }
  }

  return (
    <div className="border-border/60 bg-muted/20 space-y-3 rounded-xl border p-3">
      <p className="text-foreground text-xs font-semibold">New credit source</p>

      {/* Country */}
      <div className="space-y-1">
        <p className="text-muted-foreground text-xs">Country</p>
        <CountryPicker value={region} onChange={setRegion} />
      </div>

      {/* Name */}
      <div className="space-y-1">
        <p className="text-muted-foreground text-xs">Name</p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Seabank, Visa"
          className={cn(
            "bg-muted/50 border-border/60 focus:border-primary/60 placeholder:text-muted-foreground/50 w-full rounded-lg border px-3 py-2 text-sm transition-colors outline-none",
            error && !name.trim() && "border-rose-500/60"
          )}
        />
      </div>

      {/* Type */}
      <div className="flex flex-wrap gap-1.5">
        {SOURCE_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
              type === t.value
                ? TYPE_STYLES[t.value]
                : "border-border/60 text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Default fields */}
      <DefaultFields
        interestRate={interestRate}
        installments={installments}
        dueDay={dueDay}
        onInterestRateChange={setInterestRate}
        onInstallmentsChange={setInstallments}
        onDueDayChange={setDueDay}
      />

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-rose-400">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => onDone()}
          disabled={create.isPending}
          className="border-border/60 text-muted-foreground hover:text-foreground rounded-lg border px-3 py-1.5 text-xs transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={create.isPending}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
        >
          {create.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          Save
        </button>
      </div>
    </div>
  );
}

// ── Source row ────────────────────────────────────────────────────────────────

interface SourceRowProps {
  source: CreditSourceRow;
}

function SourceRow({ source }: SourceRowProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(source.name);
  const [editType, setEditType] = useState<CreditSourceType>(source.type);
  const [editInterestRate, setEditInterestRate] = useState(fmtRate(source.default_interest_rate));
  const [editInstallments, setEditInstallments] = useState(fmtInt(source.default_installments));
  const [editDueDay, setEditDueDay] = useState(fmtInt(source.default_due_day));
  const [editError, setEditError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  const update = useUpdateCreditSource();
  const toggle = useToggleCreditSourceActive();
  const del = useDeleteCreditSource();

  function startEdit() {
    setEditName(source.name);
    setEditType(source.type);
    setEditInterestRate(fmtRate(source.default_interest_rate));
    setEditInstallments(fmtInt(source.default_installments));
    setEditDueDay(fmtInt(source.default_due_day));
    setEditError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setEditError(null);
  }

  async function saveEdit() {
    if (!editName.trim()) {
      setEditError("Name is required.");
      return;
    }
    setEditError(null);
    try {
      await update.mutateAsync({
        id: source.id,
        name: editName,
        type: editType,
        default_interest_rate: editInterestRate
          ? parseOptionalFloat(editInterestRate) !== null
            ? parseOptionalFloat(editInterestRate)! / 100
            : null
          : null,
        default_installments: parseOptionalInt(editInstallments),
        default_due_day: parseOptionalInt(editDueDay),
      });
      setEditing(false);
    } catch {
      setEditError("Failed to save. Try again.");
    }
  }

  if (editing) {
    return (
      <div className="border-border/60 bg-muted/20 space-y-2.5 rounded-xl border p-3">
        <input
          autoFocus
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className={cn(
            "bg-muted/50 border-border/60 focus:border-primary/60 placeholder:text-muted-foreground/50 w-full rounded-lg border px-3 py-1.5 text-sm transition-colors outline-none",
            editError && "border-rose-500/60"
          )}
        />
        <div className="flex flex-wrap gap-1.5">
          {SOURCE_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setEditType(t.value)}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                editType === t.value
                  ? TYPE_STYLES[t.value]
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <DefaultFields
          interestRate={editInterestRate}
          installments={editInstallments}
          dueDay={editDueDay}
          onInterestRateChange={setEditInterestRate}
          onInstallmentsChange={setEditInstallments}
          onDueDayChange={setEditDueDay}
        />

        {editError && (
          <p className="flex items-center gap-1.5 text-xs text-rose-400">
            <AlertCircle className="h-3 w-3" />
            {editError}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={cancelEdit}
            disabled={update.isPending}
            className="border-border/60 text-muted-foreground hover:text-foreground rounded-lg border px-3 py-1.5 text-xs transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void saveEdit()}
            disabled={update.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {update.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "border-border/60 flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
          !source.is_active && "opacity-50"
        )}
      >
        {/* Active toggle */}
        <button
          type="button"
          title={source.is_active ? "Deactivate" : "Activate"}
          disabled={toggle.isPending}
          onClick={() => toggle.mutate({ id: source.id, is_active: !source.is_active })}
          className={cn(
            "h-5 w-9 shrink-0 rounded-full border transition-colors disabled:opacity-50",
            source.is_active ? "bg-primary border-primary/60" : "bg-muted border-border/60"
          )}
        >
          <span
            className={cn(
              "block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
              source.is_active ? "translate-x-[18px]" : "translate-x-[3px]"
            )}
          />
        </button>

        {/* Name + type */}
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-medium">{source.name}</p>
          {/* Show defaults summary if any are set */}
          {(source.default_interest_rate !== null ||
            source.default_installments !== null ||
            source.default_due_day !== null) && (
            <p className="text-muted-foreground mt-0.5 truncate text-[10px]">
              {[
                source.default_interest_rate !== null &&
                  `${+(source.default_interest_rate * 100).toFixed(2)}% interest`,
                source.default_installments !== null &&
                  `${source.default_installments} installments`,
                source.default_due_day !== null && `due day ${source.default_due_day}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
        <TypeBadge type={source.type} />

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={startEdit}
            className="text-muted-foreground hover:text-foreground rounded p-1.5 transition-colors"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowDelete(true)}
            className="text-muted-foreground rounded p-1.5 transition-colors hover:text-rose-400"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        title="Delete credit source?"
        description={`"${source.name}" will be permanently deleted. Any loans using this source will keep their reference, but it will no longer appear in new loan forms.`}
        confirmLabel="Delete"
        isPending={del.isPending}
        onConfirm={() => del.mutate(source.id, { onSuccess: () => setShowDelete(false) })}
        onCancel={() => setShowDelete(false)}
      />
    </>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────────

interface CreditSourcesDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CreditSourcesDrawer({ open, onClose }: CreditSourcesDrawerProps) {
  const { profile } = useAuth();
  // Lender's own region is the baseline — never fall back to a hardcoded country
  const lenderRegion = profile?.region ?? "PH";

  const [activeTab, setActiveTab] = useState(lenderRegion);
  const { data: allSources = [], isLoading, error } = useAllCreditSources();

  // Country tabs = lender's own region + any other regions that already have sources.
  // No hardcoded defaults — a lender in AE never sees a Philippines tab unless they
  // explicitly added PH sources.
  const countryTabs = useMemo(() => {
    const regions = new Set<string>(allSources.map((s) => s.region));
    regions.add(lenderRegion); // always include the lender's primary region
    return [...regions].sort();
  }, [allSources, lenderRegion]);

  // Normalise activeTab: if the current tab is gone after a delete, fall back to lenderRegion
  const safeTab =
    countryTabs.includes(activeTab) || activeTab === NEW_TAB ? activeTab : lenderRegion;

  const sources = safeTab !== NEW_TAB ? allSources.filter((s) => s.region === safeTab) : [];

  function handleClose() {
    onClose();
  }

  function handleAddDone(savedRegion?: string) {
    if (savedRegion) {
      setActiveTab(savedRegion);
    } else {
      // Cancelled — return to lender's own region tab
      setActiveTab(lenderRegion);
    }
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
            className="bg-background border-border/60 fixed top-0 right-0 z-50 flex h-full w-full flex-col border-l shadow-2xl sm:w-[420px]"
          >
            {/* Header */}
            <div className="border-border/60 flex items-center gap-3 border-b px-5 py-4">
              <div className="flex-1">
                <h2 className="text-foreground font-semibold">Credit Sources</h2>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Manage lenders and credit sources per country.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg p-1.5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs — country tabs + "+ New" tab */}
            <div className="border-border/60 flex gap-1 overflow-x-auto border-b px-3 scrollbar-none">
              {countryTabs.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setActiveTab(r)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-xs font-medium whitespace-nowrap transition-colors",
                    safeTab === r
                      ? "border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground border-transparent"
                  )}
                >
                  <span>{getFlagEmoji(r)}</span>
                  <span>{getCountryName(r)}</span>
                </button>
              ))}

              {/* "+ New" tab — proper tab for adding a new credit source */}
              <button
                type="button"
                onClick={() => setActiveTab(NEW_TAB)}
                className={cn(
                  "flex shrink-0 items-center gap-1 border-b-2 px-3 py-3 text-xs font-medium whitespace-nowrap transition-colors",
                  safeTab === NEW_TAB
                    ? "border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground border-transparent"
                )}
              >
                <Plus className="h-3 w-3" />
                New
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
              {/* New source form (shown when "+ New" tab is active) */}
              {safeTab === NEW_TAB && (
                <AddForm defaultRegion={lenderRegion} onDone={handleAddDone} />
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Failed to load credit sources.
                </div>
              )}

              {/* Loading */}
              {isLoading && safeTab !== NEW_TAB && (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="border-border/60 flex items-center gap-3 rounded-xl border px-3 py-2.5"
                    >
                      <div className="bg-muted h-5 w-9 animate-pulse rounded-full" />
                      <div className="bg-muted h-4 flex-1 animate-pulse rounded" />
                      <div className="bg-muted h-4 w-14 animate-pulse rounded-full" />
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!isLoading && safeTab !== NEW_TAB && sources.length === 0 && (
                <div className="border-border/60 bg-card rounded-xl border px-4 py-10 text-center">
                  <p className="text-foreground text-sm font-medium">No sources yet</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Go to the{" "}
                    <button
                      type="button"
                      onClick={() => setActiveTab(NEW_TAB)}
                      className="text-primary underline underline-offset-2"
                    >
                      New tab
                    </button>{" "}
                    to add the first one for {getCountryName(safeTab)}.
                  </p>
                </div>
              )}

              {/* Source list */}
              {!isLoading &&
                safeTab !== NEW_TAB &&
                sources.map((source) => <SourceRow key={source.id} source={source} />)}
            </div>

            {/* Footer hint */}
            <div className="border-border/60 border-t px-5 py-3">
              <p className="text-muted-foreground text-xs">
                Inactive sources are hidden from loan forms but kept for historical records.
                Deleting a source is permanent.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
