import { computeInstallmentAmounts } from "@/lib/installmentStrategies";
import type { LoanTypeConfig } from "@/types/schema";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LoanBreakdownSummaryProps {
  loanTypeConfig: LoanTypeConfig;
  principal: number;
  interestRate: number | null;
  serviceFee: number;
  installmentsTotal: number;
  currency: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Derives the interest label from the fee display mode.
 * Loan types with `upfront_deduction` fees tend to use an add-on monthly rate;
 * everything else is shown as a flat rate.
 */
function interestLabel(
  loanTypeConfig: LoanTypeConfig,
  interestRate: number,
  installmentsTotal: number
): string {
  const mode = loanTypeConfig.feeDisplayMode;
  if (mode?.kind === "upfront_deduction") {
    return `${interestRate}% × ${installmentsTotal} mo. (add-on)`;
  }
  return `${interestRate}% flat`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LoanBreakdownSummary({
  loanTypeConfig,
  principal,
  interestRate,
  serviceFee,
  installmentsTotal,
  currency,
}: LoanBreakdownSummaryProps) {
  if (!principal || principal <= 0 || !installmentsTotal || installmentsTotal <= 0) return null;

  const breakdown = computeInstallmentAmounts(loanTypeConfig.loan_type, {
    principal,
    interest_rate: interestRate,
    service_fee: serviceFee,
    installments_total: installmentsTotal,
  });

  const { total, baseAmount, lastAmount, feeExcludedFromTotal } = breakdown;

  const totalInterest = total - principal;
  const lastIsDifferent = Math.abs(baseAmount - lastAmount) >= 0.01;
  const baseCount = lastIsDifferent ? installmentsTotal - 1 : installmentsTotal;

  // Determine fee display behaviour from the config (never from loan_type name).
  const feeMode = loanTypeConfig.feeDisplayMode ?? { kind: "amortized" };
  const showUpfrontDeduction =
    feeMode.kind === "upfront_deduction" && feeExcludedFromTotal && serviceFee > 0;
  const showAmortizedFee = feeMode.kind === "amortized" && !feeExcludedFromTotal && serviceFee > 0;

  return (
    <section className="space-y-3">
      <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
        Loan Breakdown
      </h3>

      <div className="bg-muted/30 border-border/40 space-y-2 rounded-xl border px-4 py-3 text-sm">
        {/* ── Principal + Interest ── */}
        <Row label="Principal" value={fmt(principal, currency)} />

        {totalInterest > 0 && interestRate !== null && (
          <Row
            label={`Interest (${interestLabel(loanTypeConfig, interestRate, installmentsTotal)})`}
            value={fmt(totalInterest, currency)}
            subtle
          />
        )}

        {/* Service fee — only when amortized into installments */}
        {showAmortizedFee && (
          <Row label="Service Fee" value={fmt(serviceFee, currency)} subtle />
        )}

        <Divider />

        {/* ── Total repayable ── */}
        <Row label="Total Repayable" value={fmt(total, currency)} bold />

        <Divider />

        {/* ── Installment schedule ── */}
        {lastIsDifferent ? (
          <>
            <Row label={`${baseCount} × monthly payment`} value={fmt(baseAmount, currency)} />
            <Row label="Final payment" value={fmt(lastAmount, currency)} subtle />
          </>
        ) : (
          <Row label={`${installmentsTotal} × monthly payment`} value={fmt(baseAmount, currency)} />
        )}

        {/* ── Upfront deduction block (Stamp Tax, Admin Fee, etc.) ── */}
        {showUpfrontDeduction && (
          <>
            <Divider />
            <div className="flex items-start justify-between gap-4 pt-0.5">
              <span className="text-xs leading-snug text-amber-400/80">
                {(feeMode as { kind: "upfront_deduction"; label: string }).label}
                <span className="text-muted-foreground ml-1 font-normal">
                  (deducted before disbursement)
                </span>
              </span>
              <span className="shrink-0 text-xs text-amber-400/80 tabular-nums">
                − {fmt(serviceFee, currency)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
              <span className="text-xs font-semibold text-emerald-400">
                Borrower Actually Receives
              </span>
              <span className="text-sm font-bold text-emerald-400 tabular-nums">
                {fmt(principal - serviceFee, currency)}
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Row({
  label,
  value,
  subtle = false,
  bold = false,
}: {
  label: string;
  value: string;
  subtle?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={
          subtle
            ? "text-muted-foreground text-xs"
            : bold
              ? "text-foreground text-sm font-semibold"
              : "text-foreground/80 text-xs"
        }
      >
        {label}
      </span>
      <span
        className={
          subtle
            ? "text-muted-foreground text-xs tabular-nums"
            : bold
              ? "text-foreground text-sm font-semibold tabular-nums"
              : "text-foreground/90 text-xs tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <hr className="border-border/30" />;
}
