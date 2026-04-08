import { useEffect, useMemo, useState } from "react";
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
import {
  useAllLoanTypeDefaults,
  useUpsertLoanTypeDefaults,
  useReplaceSourceLoanTypeDefaults,
} from "@/hooks/useLoanTypeDefaults";
import type { LoanTypeDefault } from "@/hooks/useLoanTypeDefaults";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CountryPicker } from "@/components/ui/country-picker";
import { getFlagEmoji, getCountryName } from "@/lib/countries";
import { getSourceConfig } from "@/types/schema";
import type { LoanTypeConfig } from "@/types/schema";
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
  label?: string;
  interestRate: string;
  installments: string;
  dueDay: string;
  onInterestRateChange: (v: string) => void;
  onInstallmentsChange: (v: string) => void;
  onDueDayChange: (v: string) => void;
}

function DefaultFields({
  label = "Loan Defaults",
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
        {label} <span className="normal-case font-normal">(optional)</span>
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

// ── LoanTypeDefaultsEditor ────────────────────────────────────────────────────
// Per-loan-type editable defaults for schema-known sources.

export interface LtDefaultRow {
  loan_type: string;
  interest_rate: string; // display as percentage string, e.g. "4.95"
  installments: string;
  due_day: string;
}

interface LoanTypeDefaultsEditorProps {
  loanTypes: LoanTypeConfig[];
  value: LtDefaultRow[];
  onChange: (rows: LtDefaultRow[]) => void;
}

function LoanTypeDefaultsEditor({ loanTypes, value, onChange }: LoanTypeDefaultsEditorProps) {
  function updateRow(index: number, patch: Partial<LtDefaultRow>) {
    const next = value.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
        Per-Type Defaults <span className="normal-case font-normal">(optional)</span>
      </p>
      {loanTypes.map((lt, i) => {
        const row = value[i];
        if (!row) return null;
        return (
          <div key={lt.loan_type} className="space-y-1.5">
            <p className="text-foreground text-[11px] font-semibold">{lt.label}</p>
            <div className="grid grid-cols-3 gap-2">
              {/* Interest % */}
              <div className="space-y-1">
                <p className="text-muted-foreground text-[10px]">Interest %</p>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={row.interest_rate}
                    onChange={(e) => updateRow(i, { interest_rate: e.target.value })}
                    placeholder={
                      lt.interest_rate !== null ? String(lt.interest_rate) : "e.g. 3.5"
                    }
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
                  value={row.installments}
                  onChange={(e) => updateRow(i, { installments: e.target.value })}
                  placeholder={String(lt.installments_total)}
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
                  value={row.due_day}
                  onChange={(e) => updateRow(i, { due_day: e.target.value })}
                  placeholder={
                    lt.due_day_of_month !== null ? String(lt.due_day_of_month) : "e.g. 15"
                  }
                  className="bg-muted/50 border-border/60 focus:border-primary/60 placeholder:text-muted-foreground/40 w-full rounded-lg border px-2.5 py-1.5 text-xs transition-colors outline-none"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── CustomLoanTypeEditor ──────────────────────────────────────────────────────
// User-defined per-loan-type defaults for custom (non-schema) sources.

interface CustomLoanTypeEditorProps {
  value: LtDefaultRow[];
  onChange: (rows: LtDefaultRow[]) => void;
}

function CustomLoanTypeEditor({ value, onChange }: CustomLoanTypeEditorProps) {
  function addRow() {
    onChange([...value, { loan_type: "", interest_rate: "", installments: "", due_day: "" }]);
  }

  function removeRow(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function updateRow(index: number, patch: Partial<LtDefaultRow>) {
    onChange(value.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
          Per Loan Type <span className="normal-case font-normal">(optional)</span>
        </p>
        <button
          type="button"
          onClick={addRow}
          className="text-primary hover:text-primary/80 flex items-center gap-1 text-[10px] font-medium transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add type
        </button>
      </div>

      {value.length === 0 && (
        <p className="text-muted-foreground/60 text-[10px]">
          No loan types defined. Click "Add type" to set per-type defaults.
        </p>
      )}

      {value.map((row, i) => (
        <div key={i} className="bg-muted/30 space-y-1.5 rounded-lg p-2">
          {/* Loan type name + remove */}
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={row.loan_type}
              onChange={(e) => updateRow(i, { loan_type: e.target.value })}
              placeholder="e.g. SPayLater, Installment"
              className="bg-muted/50 border-border/60 focus:border-primary/60 placeholder:text-muted-foreground/40 min-w-0 flex-1 rounded-lg border px-2.5 py-1.5 text-xs transition-colors outline-none"
            />
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="text-muted-foreground hover:text-rose-400 rounded p-1 transition-colors"
              title="Remove"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Defaults */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <p className="text-muted-foreground text-[10px]">Interest %</p>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={row.interest_rate}
                  onChange={(e) => updateRow(i, { interest_rate: e.target.value })}
                  placeholder="e.g. 3.5"
                  className="bg-muted/50 border-border/60 focus:border-primary/60 placeholder:text-muted-foreground/40 w-full rounded-lg border py-1.5 pl-2.5 pr-5 text-xs transition-colors outline-none"
                />
                <span className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 text-[10px]">
                  %
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-[10px]">Installments</p>
              <input
                type="number"
                min="1"
                max="360"
                step="1"
                value={row.installments}
                onChange={(e) => updateRow(i, { installments: e.target.value })}
                placeholder="e.g. 12"
                className="bg-muted/50 border-border/60 focus:border-primary/60 placeholder:text-muted-foreground/40 w-full rounded-lg border px-2.5 py-1.5 text-xs transition-colors outline-none"
              />
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-[10px]">Due Day</p>
              <input
                type="number"
                min="1"
                max="28"
                step="1"
                value={row.due_day}
                onChange={(e) => updateRow(i, { due_day: e.target.value })}
                placeholder="e.g. 15"
                className="bg-muted/50 border-border/60 focus:border-primary/60 placeholder:text-muted-foreground/40 w-full rounded-lg border px-2.5 py-1.5 text-xs transition-colors outline-none"
              />
            </div>
          </div>
        </div>
      ))}
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

/**
 * Builds initial `LtDefaultRow[]` for the editor.
 * Priority per field: DB row → schema.ts value → empty string.
 */
function buildLtDefaultRows(
  loanTypes: LoanTypeConfig[],
  dbRows: LoanTypeDefault[]
): LtDefaultRow[] {
  return loanTypes.map((lt) => {
    const db = dbRows.find((r) => r.loan_type === lt.loan_type);
    return {
      loan_type: lt.loan_type,
      interest_rate: db?.interest_rate != null
        ? fmtRate(db.interest_rate)
        : lt.interest_rate !== null
          ? String(lt.interest_rate)
          : "",
      installments: db?.installments != null
        ? fmtInt(db.installments)
        : lt.installments_total
          ? String(lt.installments_total)
          : "",
      due_day: db?.due_day != null
        ? fmtInt(db.due_day)
        : lt.due_day_of_month != null
          ? String(lt.due_day_of_month)
          : "",
    };
  });
}

// ── Schema fallback defaults (for custom sources only) ────────────────────────

interface SourceEditDefaults {
  interestRate: string;
  installments: string;
  dueDay: string;
}

function getEditDefaults(source: CreditSourceRow): SourceEditDefaults {
  return {
    interestRate: source.default_interest_rate !== null ? fmtRate(source.default_interest_rate) : "",
    installments: source.default_installments !== null ? fmtInt(source.default_installments) : "",
    dueDay: source.default_due_day !== null ? fmtInt(source.default_due_day) : "",
  };
}

/**
 * Formats a per-loan-type summary line for view mode.
 * Shows DB override if present, otherwise falls back to schema.ts.
 */
function formatLtSummary(
  loanTypes: LoanTypeConfig[],
  dbRows: LoanTypeDefault[]
): string {
  return loanTypes
    .map((lt) => {
      const db = dbRows.find((r) => r.loan_type === lt.loan_type);
      const rate = db?.interest_rate != null
        ? `${+(db.interest_rate * 100).toFixed(2)}%`
        : lt.interest_rate !== null
          ? `${lt.interest_rate}%`
          : null;
      const inst = db?.installments != null
        ? `${db.installments} mo`
        : `${lt.installments_total} mo`;
      return [lt.label, rate, inst].filter(Boolean).join(" · ");
    })
    .join("  /  ");
}

// ── Add form ──────────────────────────────────────────────────────────────────

interface AddFormProps {
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
  const [ltDefaults, setLtDefaults] = useState<LtDefaultRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const create = useCreateCreditSource();
  const upsert = useUpsertLoanTypeDefaults();

  // When the name matches a known schema source, switch to per-loan-type editor
  const schemaConfig = getSourceConfig(name.trim());
  const isKnownSource = schemaConfig !== null && schemaConfig.loan_types.length > 0;

  // Re-initialise ltDefaults rows whenever the matched schema source changes
  useEffect(() => {
    if (schemaConfig) {
      setLtDefaults(buildLtDefaultRows(schemaConfig.loan_types, []));
    } else {
      setLtDefaults([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaConfig?.name]);

  const isSaving = create.isPending || upsert.isPending;

  async function handleSave() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setError(null);
    try {
      const created = await create.mutateAsync({
        name: name.trim(),
        type,
        region,
        default_interest_rate: !isKnownSource && interestRate
          ? parseOptionalFloat(interestRate) !== null
            ? parseOptionalFloat(interestRate)! / 100
            : null
          : null,
        default_installments: !isKnownSource ? parseOptionalInt(installments) : null,
        default_due_day: !isKnownSource ? parseOptionalInt(dueDay) : null,
      });

      // Upsert per-loan-type defaults (known: all rows; custom: filter out unnamed rows)
      const ltRowsToSave = isKnownSource
        ? ltDefaults
        : ltDefaults.filter((r) => r.loan_type.trim() !== "");
      if (created && ltRowsToSave.length > 0) {
        await upsert.mutateAsync(
          ltRowsToSave.map((row) => ({
            credit_source_id: created.id,
            loan_type: row.loan_type.trim(),
            interest_rate:
              row.interest_rate !== ""
                ? (parseOptionalFloat(row.interest_rate) ?? null) !== null
                  ? parseOptionalFloat(row.interest_rate)! / 100
                  : null
                : null,
            installments: parseOptionalInt(row.installments),
            due_day: parseOptionalInt(row.due_day),
          }))
        );
      }

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
        {isKnownSource && (
          <p className="text-primary text-[10px]">
            Schema-known source — per-type defaults loaded.
          </p>
        )}
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

      {/* Defaults: per-type editor for known sources; source-level + custom types for others */}
      {isKnownSource ? (
        <LoanTypeDefaultsEditor
          loanTypes={schemaConfig.loan_types}
          value={ltDefaults}
          onChange={setLtDefaults}
        />
      ) : (
        <>
          <DefaultFields
            interestRate={interestRate}
            installments={installments}
            dueDay={dueDay}
            onInterestRateChange={setInterestRate}
            onInstallmentsChange={setInstallments}
            onDueDayChange={setDueDay}
          />
          <CustomLoanTypeEditor value={ltDefaults} onChange={setLtDefaults} />
        </>
      )}

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
          disabled={isSaving}
          className="border-border/60 text-muted-foreground hover:text-foreground rounded-lg border px-3 py-1.5 text-xs transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
        >
          {isSaving ? (
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
  /** All loan-type default rows for this specific source (pre-filtered by source.id). */
  loanTypeDefaults: LoanTypeDefault[];
}

function SourceRow({ source, loanTypeDefaults }: SourceRowProps) {
  const schemaConfig = getSourceConfig(source.name);
  const isKnownSource = schemaConfig !== null && schemaConfig.loan_types.length > 0;

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(source.name);
  const [editType, setEditType] = useState<CreditSourceType>(source.type);
  const defaults = getEditDefaults(source);
  const [editInterestRate, setEditInterestRate] = useState(defaults.interestRate);
  const [editInstallments, setEditInstallments] = useState(defaults.installments);
  const [editDueDay, setEditDueDay] = useState(defaults.dueDay);
  const [editedLtDefaults, setEditedLtDefaults] = useState<LtDefaultRow[]>(() =>
    isKnownSource
      ? buildLtDefaultRows(schemaConfig.loan_types, loanTypeDefaults)
      : []
  );
  const [customLtRows, setCustomLtRows] = useState<LtDefaultRow[]>(() =>
    !isKnownSource
      ? loanTypeDefaults.map((d) => ({
          loan_type: d.loan_type,
          interest_rate: d.interest_rate != null ? fmtRate(d.interest_rate) : "",
          installments: d.installments != null ? fmtInt(d.installments) : "",
          due_day: d.due_day != null ? fmtInt(d.due_day) : "",
        }))
      : []
  );
  const [editError, setEditError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  const update = useUpdateCreditSource();
  const upsert = useUpsertLoanTypeDefaults();
  const replace = useReplaceSourceLoanTypeDefaults();
  const toggle = useToggleCreditSourceActive();
  const del = useDeleteCreditSource();

  function startEdit() {
    const d = getEditDefaults(source);
    setEditName(source.name);
    setEditType(source.type);
    setEditInterestRate(d.interestRate);
    setEditInstallments(d.installments);
    setEditDueDay(d.dueDay);
    setEditError(null);
    if (isKnownSource) {
      setEditedLtDefaults(buildLtDefaultRows(schemaConfig.loan_types, loanTypeDefaults));
    } else {
      setCustomLtRows(
        loanTypeDefaults.map((d) => ({
          loan_type: d.loan_type,
          interest_rate: d.interest_rate != null ? fmtRate(d.interest_rate) : "",
          installments: d.installments != null ? fmtInt(d.installments) : "",
          due_day: d.due_day != null ? fmtInt(d.due_day) : "",
        }))
      );
    }
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
      // 1. Update name / type / source-level defaults (only for custom sources)
      await update.mutateAsync({
        id: source.id,
        name: editName,
        type: editType,
        default_interest_rate: !isKnownSource && editInterestRate
          ? parseOptionalFloat(editInterestRate) !== null
            ? parseOptionalFloat(editInterestRate)! / 100
            : null
          : source.default_interest_rate,
        default_installments: !isKnownSource
          ? parseOptionalInt(editInstallments)
          : source.default_installments,
        default_due_day: !isKnownSource
          ? parseOptionalInt(editDueDay)
          : source.default_due_day,
      });

      // 2. Save per-loan-type defaults
      if (isKnownSource) {
        // Known sources: upsert all (loan types are fixed, nothing to remove)
        if (editedLtDefaults.length > 0) {
          await upsert.mutateAsync(
            editedLtDefaults.map((row) => ({
              credit_source_id: source.id,
              loan_type: row.loan_type,
              interest_rate:
                row.interest_rate !== ""
                  ? (parseOptionalFloat(row.interest_rate) ?? null) !== null
                    ? parseOptionalFloat(row.interest_rate)! / 100
                    : null
                  : null,
              installments: parseOptionalInt(row.installments),
              due_day: parseOptionalInt(row.due_day),
            }))
          );
        }
      } else {
        // Custom sources: replace all (user may have removed rows)
        const validRows = customLtRows.filter((r) => r.loan_type.trim() !== "");
        await replace.mutateAsync({
          sourceId: source.id,
          rows: validRows.map((row) => ({
            credit_source_id: source.id,
            loan_type: row.loan_type.trim(),
            interest_rate:
              row.interest_rate !== ""
                ? (parseOptionalFloat(row.interest_rate) ?? null) !== null
                  ? parseOptionalFloat(row.interest_rate)! / 100
                  : null
                : null,
            installments: parseOptionalInt(row.installments),
            due_day: parseOptionalInt(row.due_day),
          })),
        });
      }

      setEditing(false);
    } catch {
      setEditError("Failed to save. Try again.");
    }
  }

  const isSaving = update.isPending || upsert.isPending || replace.isPending;

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

        {/* Per-loan-type defaults */}
        {isKnownSource ? (
          <LoanTypeDefaultsEditor
            loanTypes={schemaConfig.loan_types}
            value={editedLtDefaults}
            onChange={setEditedLtDefaults}
          />
        ) : (
          <>
            <DefaultFields
              label="Loan Defaults"
              interestRate={editInterestRate}
              installments={editInstallments}
              dueDay={editDueDay}
              onInterestRateChange={setEditInterestRate}
              onInstallmentsChange={setEditInstallments}
              onDueDayChange={setEditDueDay}
            />
            <CustomLoanTypeEditor value={customLtRows} onChange={setCustomLtRows} />
          </>
        )}

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
            disabled={isSaving}
            className="border-border/60 text-muted-foreground hover:text-foreground rounded-lg border px-3 py-1.5 text-xs transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void saveEdit()}
            disabled={isSaving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {isSaving ? (
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
          {/* Summary line: per-type defaults for known sources, DB defaults for custom */}
          {isKnownSource ? (
            <p className="text-muted-foreground mt-0.5 truncate text-[10px]">
              {formatLtSummary(schemaConfig.loan_types, loanTypeDefaults)}
            </p>
          ) : loanTypeDefaults.length > 0 ? (
            <p className="text-muted-foreground mt-0.5 truncate text-[10px]">
              {loanTypeDefaults
                .map((d) => {
                  const rate = d.interest_rate != null ? `${+(d.interest_rate * 100).toFixed(2)}%` : null;
                  const inst = d.installments != null ? `${d.installments} mo` : null;
                  return [d.loan_type, rate, inst].filter(Boolean).join(" · ");
                })
                .join("  /  ")}
            </p>
          ) : (
            (() => {
              const parts = [
                source.default_interest_rate !== null &&
                  `${+(source.default_interest_rate * 100).toFixed(2)}%`,
                source.default_installments !== null && `${source.default_installments} mo`,
                source.default_due_day !== null && `day ${source.default_due_day}`,
              ].filter(Boolean);
              return parts.length > 0 ? (
                <p className="text-muted-foreground mt-0.5 truncate text-[10px]">
                  {parts.join(" · ")}
                </p>
              ) : null;
            })()
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
  const lenderRegion = profile?.region ?? "PH";

  const [activeTab, setActiveTab] = useState(lenderRegion);
  const { data: allSources = [], isLoading, error } = useAllCreditSources();
  const { data: allLoanTypeDefaults = [] } = useAllLoanTypeDefaults();

  const countryTabs = useMemo(() => {
    const regions = new Set<string>(allSources.map((s) => s.region));
    regions.add(lenderRegion);
    return [...regions].sort();
  }, [allSources, lenderRegion]);

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

            {/* Tabs */}
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
              {safeTab === NEW_TAB && (
                <AddForm defaultRegion={lenderRegion} onDone={handleAddDone} />
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Failed to load credit sources.
                </div>
              )}

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

              {!isLoading &&
                safeTab !== NEW_TAB &&
                sources.map((source) => (
                  <SourceRow
                    key={source.id}
                    source={source}
                    loanTypeDefaults={allLoanTypeDefaults.filter(
                      (d) => d.credit_source_id === source.id
                    )}
                  />
                ))}
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
