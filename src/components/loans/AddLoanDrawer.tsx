import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2, CalendarDays } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Resolver } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAdminBorrowers } from "@/hooks/useAdminBorrowers";
import { useCreditSources } from "@/hooks/useCreditSources";
import { useCreateLoan } from "@/hooks/useCreateLoan";
import { getLoanTypesForSource, getLoanTypeConfig } from "@/types/schema";
import type { LoanType, RegionType, CurrencyType } from "@/types/database";

// ── Schema ────────────────────────────────────────────────────────────────────

const addLoanSchema = z.object({
  borrower_id: z.string().min(1, "Select a borrower"),
  source_id: z.string().min(1, "Select a credit source"),
  loan_type: z.enum([
    "tabby",
    "sloan",
    "gloan",
    "spaylater",
    "credit_card",
    "custom",
    "lazcredit",
    "maribank_credit",
  ]),
  principal: z.coerce.number({ message: "Enter a valid amount" }).positive("Must be positive"),
  interest_rate: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number().min(0).max(100).nullable()
  ),
  service_fee: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().min(0)),
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function regionToCurrency(region: RegionType): CurrencyType {
  return region === "UAE" ? "AED" : "PHP";
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
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
  const { data: allBorrowers = [] } = useAdminBorrowers();
  const borrowers = allBorrowers.filter((b) => b.isConfirmed);
  const { mutateAsync: createLoan, isPending } = useCreateLoan();
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);

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
  const watchedSourceId = watch("source_id");
  const watchedLoanType = watch("loan_type");
  const watchedInstallments = watch("installments_total");
  const watchedDueDay = watch("due_day_of_month");

  const selectedBorrower = borrowers.find((b) => b.id === watchedBorrowerId) ?? null;
  const borrowerRegion = selectedBorrower?.region ?? null;

  const {
    data: creditSources = [],
    isLoading: sourcesLoading,
    error: sourcesError,
  } = useCreditSources(borrowerRegion);

  const selectedSource = creditSources.find((s) => s.id === watchedSourceId) ?? null;
  const availableLoanTypes = selectedSource ? getLoanTypesForSource(selectedSource.name) : [];
  const activeConfig = selectedSource
    ? getLoanTypeConfig(selectedSource.name, watchedLoanType)
    : null;
  const availableDurations = activeConfig?.available_durations ?? [];
  const hasStampTax = !!activeConfig?.stamp_tax_tiers;

  // Reset source when borrower changes
  useEffect(() => {
    setValue("source_id", "", { shouldValidate: false });
  }, [watchedBorrowerId, setValue]);

  // Auto-select first loan type when source changes
  useEffect(() => {
    const source = creditSources.find((s) => s.id === watchedSourceId);
    if (!source) return;
    const types = getLoanTypesForSource(source.name);
    if (types.length > 0) {
      setValue("loan_type", types[0].loan_type, { shouldValidate: false });
    }
  }, [watchedSourceId, creditSources, setValue]);

  // Apply template fields when loan type or source changes
  useEffect(() => {
    if (!selectedSource) return;
    const config = getLoanTypeConfig(selectedSource.name, watchedLoanType);
    if (!config) return;

    setValue("installments_total", config.installments_total, { shouldValidate: false });
    setValue("interest_rate", config.interest_rate ?? null, { shouldValidate: false });
    setValue("service_fee", config.service_fee, { shouldValidate: false });
    setValue("due_day_of_month", config.due_day_of_month ?? null, { shouldValidate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedLoanType, watchedSourceId, setValue]);

  // Recompute stamp tax when installments_total changes (e.g. Maribank)
  useEffect(() => {
    if (!selectedSource) return;
    const config = getLoanTypeConfig(selectedSource.name, watchedLoanType);
    if (!config?.stamp_tax_tiers) return;

    const months = Number(watchedInstallments);
    const tier = config.stamp_tax_tiers.find((t) => t.months === months);
    if (tier) {
      setValue("service_fee", tier.amount, { shouldValidate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedInstallments, setValue]);

  const watchedStartedAt = watch("started_at");

  function handleClose() {
    reset();
    setDueDateOpen(false);
    setStartDateOpen(false);
    onClose();
  }

  function handleDaySelect(date: Date | undefined) {
    setValue("due_day_of_month", date ? date.getDate() : null, { shouldValidate: true });
    setDueDateOpen(false);
  }

  function handleStartDateSelect(date: Date | undefined) {
    if (date) {
      // Format as YYYY-MM-DD in local time (avoid UTC offset shifting the day)
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      setValue("started_at", `${y}-${m}-${d}`, { shouldValidate: true });
    }
    setStartDateOpen(false);
  }

  // Calendar selected date — represent the chosen day in the current month
  const calendarSelected = watchedDueDay
    ? new Date(new Date().getFullYear(), new Date().getMonth(), watchedDueDay)
    : undefined;

  // Start date calendar — parse YYYY-MM-DD in local time
  const startDateSelected = watchedStartedAt
    ? (() => {
        const [y, mo, d] = watchedStartedAt.split("-").map(Number);
        return new Date(y, mo - 1, d);
      })()
    : undefined;

  function formatStartDate(dateStr: string): string {
    const [y, mo, d] = dateStr.split("-").map(Number);
    return new Date(y, mo - 1, d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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

  const currencyLabel = borrowerRegion ? regionToCurrency(borrowerRegion) : "PHP / AED";
  const showLoanTypeSelector = selectedSource && availableLoanTypes.length > 1;

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
                {/* ── Borrower + Credit Source ───────────────────────── */}
                <section className="space-y-4">
                  <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
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
                    error={
                      sourcesError ? "Failed to load credit sources" : errors.source_id?.message
                    }
                    hint={!borrowerRegion ? "Select a borrower first" : undefined}
                  >
                    <select
                      {...register("source_id")}
                      disabled={!borrowerRegion || sourcesLoading}
                      className={cn(
                        selectClass,
                        (!borrowerRegion || sourcesLoading) && "opacity-50"
                      )}
                    >
                      <option value="">{sourcesLoading ? "Loading…" : "Select source…"}</option>
                      {creditSources.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </FieldWrapper>
                </section>

                {/* ── Loan Type (only when source has multiple types) ── */}
                {showLoanTypeSelector && (
                  <section className="space-y-4">
                    <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                      Loan Type
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {availableLoanTypes.map((opt) => (
                        <button
                          key={opt.loan_type}
                          type="button"
                          onClick={() =>
                            setValue("loan_type", opt.loan_type, { shouldValidate: true })
                          }
                          className={cn(
                            "cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                            watchedLoanType === opt.loan_type
                              ? "bg-primary/15 border-primary/40 text-primary"
                              : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {/* ── Loan Details ───────────────────────────────────── */}
                <section className="space-y-4">
                  <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
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
                      hint="Monthly add-on rate"
                    >
                      <input
                        {...register("interest_rate")}
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="e.g. 2.95"
                        className={inputClass}
                      />
                    </FieldWrapper>

                    <FieldWrapper
                      label="Service Fee"
                      error={errors.service_fee?.message}
                      hint={hasStampTax ? "Auto from stamp tax" : undefined}
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
                    {/* Installments — select from available durations */}
                    <FieldWrapper
                      label="Installments"
                      error={errors.installments_total?.message}
                      hint={hasStampTax ? "Updates stamp tax" : undefined}
                    >
                      <select
                        {...register("installments_total")}
                        disabled={availableDurations.length === 0}
                        className={cn(selectClass, availableDurations.length === 0 && "opacity-50")}
                      >
                        {availableDurations.length === 0 ? (
                          <option value="">—</option>
                        ) : (
                          availableDurations.map((d) => (
                            <option key={d} value={d}>
                              {d}{" "}
                              {d === 4 && selectedSource?.name === "Tabby" ? "payments" : "months"}
                            </option>
                          ))
                        )}
                      </select>
                    </FieldWrapper>

                    {/* Due Day — calendar popover */}
                    <FieldWrapper label="Due Day of Month" error={errors.due_day_of_month?.message}>
                      {/* Hidden input keeps RHF in sync */}
                      <input type="hidden" {...register("due_day_of_month")} />

                      <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                        <PopoverTrigger
                          className={cn(
                            inputClass,
                            "flex cursor-pointer items-center justify-between text-left",
                            !watchedDueDay && "text-muted-foreground/50"
                          )}
                        >
                          <span>
                            {watchedDueDay
                              ? `${ordinal(watchedDueDay)} of the month`
                              : "Pick a day…"}
                          </span>
                          <CalendarDays className="text-muted-foreground h-4 w-4 shrink-0" />
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto p-0"
                          align="start"
                          side="bottom"
                          sideOffset={4}
                        >
                          <Calendar
                            mode="single"
                            selected={calendarSelected}
                            onSelect={handleDaySelect}
                            initialFocus
                          />
                          {watchedDueDay && (
                            <div className="border-border/60 border-t px-3 py-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setValue("due_day_of_month", null, { shouldValidate: true });
                                  setDueDateOpen(false);
                                }}
                                className="text-muted-foreground hover:text-foreground cursor-pointer text-xs transition-colors"
                              >
                                Clear
                              </button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                    </FieldWrapper>
                  </div>

                  <FieldWrapper label="Start Date" error={errors.started_at?.message}>
                    {/* Hidden input keeps RHF in sync */}
                    <input type="hidden" {...register("started_at")} />

                    <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                      <PopoverTrigger
                        className={cn(
                          inputClass,
                          "flex cursor-pointer items-center justify-between text-left",
                          !watchedStartedAt && "text-muted-foreground/50"
                        )}
                      >
                        <span>
                          {watchedStartedAt ? formatStartDate(watchedStartedAt) : "Pick a date…"}
                        </span>
                        <CalendarDays className="text-muted-foreground h-4 w-4 shrink-0" />
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0"
                        align="start"
                        side="bottom"
                        sideOffset={4}
                      >
                        <Calendar
                          mode="single"
                          selected={startDateSelected}
                          onSelect={handleStartDateSelect}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
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
