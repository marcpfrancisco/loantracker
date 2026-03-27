import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Resolver } from "react-hook-form";
import { cn } from "@/lib/utils";
import { useAdminBorrowers } from "@/hooks/useAdminBorrowers";
import { useCreditSources } from "@/hooks/useCreditSources";
import { useCreateLoan } from "@/hooks/useCreateLoan";
import type { LoanType, RegionType, CurrencyType } from "@/types/database";

// ── Schema ────────────────────────────────────────────────────────────────────

const addLoanSchema = z.object({
  borrower_id: z.string().min(1, "Select a borrower"),
  source_id: z.string().min(1, "Select a credit source"),
  loan_type: z.enum(["tabby", "sloan", "gloan", "spaylater", "credit_card", "custom"]),
  principal: z.coerce.number({ message: "Enter a valid amount" }).positive("Must be positive"),
  interest_rate: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number().min(0).max(100).nullable()
  ),
  service_fee: z.preprocess(
    (v) => (v === "" || v == null ? 0 : Number(v)),
    z.number().min(0)
  ),
  installments_total: z.coerce
    .number({ message: "Enter count" })
    .int()
    .min(1, "Min 1")
    .max(60, "Max 60"),
  started_at: z.string().min(1, "Select a date"),
  due_day_of_month: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number().int().min(1).max(31).nullable()
  ),
  notes: z.string().optional(),
});

// Explicit output type — z.preprocess fields lose their output type via inference
type FormData = {
  borrower_id: string;
  source_id: string;
  loan_type: LoanType;
  principal: number;
  interest_rate: number | null;
  service_fee: number;
  installments_total: number;
  started_at: string;
  due_day_of_month: number | null;
  notes?: string;
};

// ── Loan type templates ───────────────────────────────────────────────────────

interface Template {
  installments_total: number;
  interest_rate: number | null;
  service_fee: number;
  region: RegionType | null;
}

const TEMPLATES: Record<LoanType, Template> = {
  tabby:       { installments_total: 4,  interest_rate: 0,    service_fee: 0, region: "UAE" },
  sloan:       { installments_total: 3,  interest_rate: null, service_fee: 0, region: "PH"  },
  gloan:       { installments_total: 3,  interest_rate: null, service_fee: 0, region: "PH"  },
  spaylater:   { installments_total: 3,  interest_rate: null, service_fee: 0, region: "PH"  },
  credit_card: { installments_total: 12, interest_rate: null, service_fee: 0, region: null  },
  custom:      { installments_total: 1,  interest_rate: null, service_fee: 0, region: null  },
};

const LOAN_TYPE_OPTIONS: { value: LoanType; label: string }[] = [
  { value: "tabby",       label: "Tabby"       },
  { value: "sloan",       label: "SLoan"       },
  { value: "gloan",       label: "GLoan"       },
  { value: "spaylater",   label: "SPayLater"   },
  { value: "credit_card", label: "Credit Card" },
  { value: "custom",      label: "Custom"      },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function regionToCurrency(region: RegionType): CurrencyType {
  return region === "UAE" ? "AED" : "PHP";
}

function loanTypeAllowedForRegion(type: LoanType, region: RegionType | null): boolean {
  if (region === null) return true;
  const tpl = TEMPLATES[type];
  return tpl.region === null || tpl.region === region;
}

// ── Field components ──────────────────────────────────────────────────────────

function FieldWrapper({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-foreground text-xs font-medium">{label}</label>
      {children}
      {hint && !error && <p className="text-muted-foreground text-xs">{hint}</p>}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}

const inputClass =
  "bg-muted/50 border-border/60 focus:border-primary/60 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/50";

const selectClass =
  "bg-muted/50 border-border/60 focus:border-primary/60 w-full cursor-pointer rounded-lg border px-3 py-2 text-sm outline-none transition-colors";

// ── Drawer ────────────────────────────────────────────────────────────────────

interface AddLoanDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AddLoanDrawer({ open, onClose }: AddLoanDrawerProps) {
  const { data: borrowers = [] } = useAdminBorrowers();
  const { mutateAsync: createLoan, isPending } = useCreateLoan();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(addLoanSchema) as Resolver<FormData>,
    defaultValues: {
      borrower_id: "",
      source_id: "",
      loan_type: "custom",
      principal: "" as unknown as number,
      interest_rate: null,
      service_fee: 0,
      installments_total: 1,
      started_at: new Date().toISOString().split("T")[0],
      due_day_of_month: null,
      notes: "",
    },
  });

  const watchedBorrowerId = watch("borrower_id");
  const watchedLoanType = watch("loan_type");

  const selectedBorrower = borrowers.find((b) => b.id === watchedBorrowerId) ?? null;
  const borrowerRegion = selectedBorrower?.region ?? null;

  const { data: creditSources = [] } = useCreditSources(borrowerRegion);

  // Apply template when loan type changes
  useEffect(() => {
    const tpl = TEMPLATES[watchedLoanType];
    setValue("installments_total", tpl.installments_total, { shouldValidate: false });
    if (tpl.interest_rate !== null) {
      setValue("interest_rate", tpl.interest_rate, { shouldValidate: false });
    }
    setValue("service_fee", tpl.service_fee, { shouldValidate: false });
  }, [watchedLoanType, setValue]);

  // Reset source when borrower changes
  useEffect(() => {
    setValue("source_id", "", { shouldValidate: false });
  }, [watchedBorrowerId, setValue]);

  function handleClose() {
    reset();
    onClose();
  }

  async function onSubmit(data: FormData) {
    if (!borrowerRegion) return;

    await createLoan({
      borrower_id: data.borrower_id,
      source_id: data.source_id,
      loan_type: data.loan_type,
      region: borrowerRegion,
      currency: regionToCurrency(borrowerRegion),
      principal: data.principal,
      interest_rate: data.interest_rate,
      service_fee: data.service_fee ?? 0,
      installments_total: data.installments_total,
      started_at: data.started_at,
      due_day_of_month: data.due_day_of_month ?? null,
      notes: data.notes ?? null,
    });

    handleClose();
  }

  const isTabby = watchedLoanType === "tabby";
  const currencyLabel = borrowerRegion ? regionToCurrency(borrowerRegion) : "PHP / AED";

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

          {/* Drawer panel */}
          <motion.div
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
            className="bg-background border-border/60 fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l shadow-2xl sm:w-[480px]"
          >
            {/* Header */}
            <div className="border-border/60 flex shrink-0 items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-foreground font-semibold">Add Loan</h2>
                {borrowerRegion && (
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {borrowerRegion === "PH" ? "🇵🇭 Philippines · PHP" : "🇦🇪 UAE · AED"}
                  </p>
                )}
              </div>
              <button
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-lg p-1.5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => void handleSubmit(onSubmit)(e)}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">

                {/* ── Borrower & Source ─────────────────────────────── */}
                <section className="space-y-4">
                  <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    Borrower
                  </h3>

                  <FieldWrapper label="Borrower" error={errors.borrower_id?.message}>
                    <select {...register("borrower_id")} className={selectClass}>
                      <option value="">Select borrower…</option>
                      {borrowers.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.full_name} ({b.region})
                        </option>
                      ))}
                    </select>
                  </FieldWrapper>

                  <FieldWrapper
                    label="Credit Source"
                    error={errors.source_id?.message}
                    hint={!borrowerRegion ? "Select a borrower first" : undefined}
                  >
                    <select
                      {...register("source_id")}
                      disabled={!borrowerRegion}
                      className={cn(selectClass, !borrowerRegion && "opacity-50")}
                    >
                      <option value="">Select source…</option>
                      {creditSources.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </FieldWrapper>
                </section>

                {/* ── Loan Type ─────────────────────────────────────── */}
                <section className="space-y-4">
                  <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    Loan Type
                  </h3>

                  <div className="grid grid-cols-3 gap-2">
                    {LOAN_TYPE_OPTIONS.filter((opt) =>
                      loanTypeAllowedForRegion(opt.value, borrowerRegion)
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setValue("loan_type", opt.value, { shouldValidate: true })}
                        className={cn(
                          "cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                          watchedLoanType === opt.value
                            ? "bg-primary/15 border-primary/40 text-primary"
                            : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </section>

                {/* ── Loan Details ──────────────────────────────────── */}
                <section className="space-y-4">
                  <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    Loan Details
                  </h3>

                  <FieldWrapper
                    label={`Principal (${currencyLabel})`}
                    error={errors.principal?.message}
                  >
                    <input
                      {...register("principal")}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className={inputClass}
                    />
                  </FieldWrapper>

                  <div className="grid grid-cols-2 gap-3">
                    <FieldWrapper
                      label="Interest Rate (%)"
                      error={errors.interest_rate?.message}
                    >
                      <input
                        {...register("interest_rate")}
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder={isTabby ? "0" : "e.g. 3.5"}
                        readOnly={isTabby}
                        className={cn(inputClass, isTabby && "opacity-50")}
                      />
                    </FieldWrapper>

                    <FieldWrapper
                      label="Service Fee"
                      error={errors.service_fee?.message}
                    >
                      <input
                        {...register("service_fee")}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className={inputClass}
                      />
                    </FieldWrapper>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FieldWrapper
                      label="Installments"
                      error={errors.installments_total?.message}
                    >
                      <input
                        {...register("installments_total")}
                        type="number"
                        min="1"
                        max="60"
                        className={inputClass}
                      />
                    </FieldWrapper>

                    <FieldWrapper
                      label="Due Day of Month"
                      error={errors.due_day_of_month?.message}
                      hint="Optional — for credit cards"
                    >
                      <input
                        {...register("due_day_of_month")}
                        type="number"
                        min="1"
                        max="31"
                        placeholder="e.g. 15"
                        className={inputClass}
                      />
                    </FieldWrapper>
                  </div>

                  <FieldWrapper label="Start Date" error={errors.started_at?.message}>
                    <input {...register("started_at")} type="date" className={inputClass} />
                  </FieldWrapper>

                  <FieldWrapper label="Notes" error={errors.notes?.message}>
                    <textarea
                      {...register("notes")}
                      rows={2}
                      placeholder="Optional notes…"
                      className={cn(inputClass, "resize-none")}
                    />
                  </FieldWrapper>
                </section>
              </div>

              {/* Footer */}
              <div className="border-border/60 flex shrink-0 items-center justify-end gap-3 border-t px-5 py-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="border-border/60 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg border px-4 py-2 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !borrowerRegion}
                  className="bg-primary text-primary-foreground flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isPending ? "Creating…" : "Create Loan"}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
