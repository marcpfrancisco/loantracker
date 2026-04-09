import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2, CalendarDays, AlertTriangle, Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Resolver } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUpdateLoan } from "@/hooks/useUpdateLoan";
import { getLoanTypeConfig, FALLBACK_LOAN_TYPE } from "@/types/schema";
import { LoanBreakdownSummary } from "@/components/loans/LoanBreakdownSummary";
import type { LoanDetail } from "@/hooks/useLoanDetail";

// ── Schema ────────────────────────────────────────────────────────────────────

const editLoanSchema = z.object({
  principal: z.coerce.number({ message: "Enter a valid amount" }).positive("Must be positive"),
  interest_rate: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number().min(0).max(100).nullable()
  ),
  service_fee: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().min(0)),
  due_day_of_month: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number().int().min(1).max(31).nullable()
  ),
  notes: z.string().optional(),
});

type FormData = {
  principal: number;
  interest_rate: number | null;
  service_fee: number;
  due_day_of_month: number | null;
  notes?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Drawer ────────────────────────────────────────────────────────────────────

interface EditLoanDrawerProps {
  open: boolean;
  onClose: () => void;
  loan: LoanDetail;
  /** Whether the current user's org is on the owner plan */
  isOwnerPlan: boolean;
}

export function EditLoanDrawer({ open, onClose, loan, isOwnerPlan }: EditLoanDrawerProps) {
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const { mutateAsync: updateLoan, isPending } = useUpdateLoan(loan.id);

  const hasPayments = loan.installments.some((i) => i.status === "paid");
  const canEdit = !hasPayments || isOwnerPlan;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(editLoanSchema) as Resolver<FormData>,
    defaultValues: {
      principal: loan.principal,
      interest_rate: loan.interest_rate,
      service_fee: loan.service_fee,
      due_day_of_month: loan.due_day_of_month ?? null,
      notes: loan.notes ?? "",
    },
  });

  // Reset form when loan changes or drawer opens
  useEffect(() => {
    if (open) {
      reset({
        principal: loan.principal,
        interest_rate: loan.interest_rate,
        service_fee: loan.service_fee,
        due_day_of_month: loan.due_day_of_month ?? null,
        notes: loan.notes ?? "",
      });
    }
  }, [open, loan, reset]);

  const watchedPrincipal = watch("principal");
  const watchedInterestRate = watch("interest_rate");
  const watchedServiceFee = watch("service_fee");
  const watchedDueDay = watch("due_day_of_month");

  const loanTypeConfig =
    getLoanTypeConfig(loan.credit_source.name, loan.loan_type) ?? FALLBACK_LOAN_TYPE;

  const feeFieldLabel =
    loanTypeConfig.feeDisplayMode?.kind === "upfront_deduction"
      ? loanTypeConfig.feeDisplayMode.label
      : "Service Fee";

  const calendarSelected = watchedDueDay
    ? new Date(new Date().getFullYear(), new Date().getMonth(), watchedDueDay)
    : undefined;

  function handleDaySelect(date: Date | undefined) {
    setValue("due_day_of_month", date ? date.getDate() : null, { shouldValidate: true });
    setDueDateOpen(false);
  }

  function handleClose() {
    reset();
    setDueDateOpen(false);
    onClose();
  }

  async function onSubmit(data: FormData) {
    await updateLoan({
      loanId: loan.id,
      principal: data.principal,
      interest_rate: data.interest_rate,
      service_fee: data.service_fee,
      due_day_of_month: data.due_day_of_month,
      notes: data.notes ?? null,
      loan_type: loan.loan_type,
      installments_total: loan.installments_total,
      originalDueDay: loan.due_day_of_month ?? null,
      installments: loan.installments,
    });
    handleClose();
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

          {/* Drawer panel */}
          <motion.div
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
            className="bg-background border-border/60 fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l shadow-2xl sm:w-120"
          >
            {/* Header */}
            <div className="border-border/60 flex shrink-0 items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-foreground font-semibold">Edit Loan</h2>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {loan.credit_source.name} · {loan.currency}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-lg p-1.5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Owner-override warning */}
            {hasPayments && isOwnerPlan && (
              <div className="border-b border-amber-500/20 bg-amber-500/10 px-5 py-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <div>
                    <p className="text-xs font-medium text-amber-400">Payments already recorded</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {loan.installments.filter((i) => i.status === "paid").length} paid installment(s) will not be recalculated. Only unpaid installments are affected.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Locked state — non-owner with payments */}
            {hasPayments && !isOwnerPlan ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-full">
                  <Lock className="text-muted-foreground h-6 w-6" />
                </div>
                <div>
                  <p className="text-foreground font-semibold">Editing locked</p>
                  <p className="text-muted-foreground mt-1.5 text-sm">
                    This loan has recorded payments. Editing loan details after a payment has been
                    made requires an Owner plan.
                  </p>
                </div>
              </div>
            ) : (
              /* Form */
              <form
                onSubmit={(e) => void handleSubmit(onSubmit)(e)}
                className="flex flex-1 flex-col overflow-hidden"
              >
                <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                  {/* Read-only info */}
                  <div className="bg-muted/30 border-border/40 grid grid-cols-2 gap-3 rounded-lg border px-4 py-3">
                    <div>
                      <p className="text-muted-foreground text-[10px]">Loan Type</p>
                      <p className="text-foreground text-xs font-medium capitalize">
                        {loan.loan_type.replace("_", " ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[10px]">Installments</p>
                      <p className="text-foreground text-xs font-medium">
                        {loan.installments_total} months
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[10px]">Currency</p>
                      <p className="text-foreground text-xs font-medium">{loan.currency}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[10px]">Started</p>
                      <p className="text-foreground text-xs font-medium">
                        {new Date(loan.started_at + "T00:00:00").toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Editable fields */}
                  <section className="space-y-4">
                    <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                      Loan Details
                    </h3>

                    <FieldWrapper
                      label={`Principal (${loan.currency})`}
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
                        label={feeFieldLabel}
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

                    {/* Due Day */}
                    <FieldWrapper
                      label="Due Day of Month"
                      error={errors.due_day_of_month?.message}
                      hint={
                        loan.installments.some((i) => i.status !== "paid")
                          ? "Changing this will update all upcoming installment dates"
                          : undefined
                      }
                    >
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

                    <FieldWrapper label="Notes" error={errors.notes?.message}>
                      <textarea
                        {...register("notes")}
                        rows={2}
                        placeholder="Optional notes…"
                        className={cn(inputClass, "resize-none")}
                      />
                    </FieldWrapper>
                  </section>

                  {/* Live breakdown */}
                  <LoanBreakdownSummary
                    loanTypeConfig={loanTypeConfig}
                    principal={Number(watchedPrincipal) || 0}
                    interestRate={watchedInterestRate}
                    serviceFee={Number(watchedServiceFee) || 0}
                    installmentsTotal={loan.installments_total}
                    currency={loan.currency}
                  />
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
                    disabled={isPending || !canEdit}
                    className="bg-primary text-primary-foreground flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
                  >
                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isPending ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
