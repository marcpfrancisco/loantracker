import type { LoanType } from "@/types/enums";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InstallmentParams {
  principal: number;
  interest_rate: number | null;
  service_fee: number;
  installments_total: number;
}

export interface InstallmentBreakdown {
  /** Repayable total (principal + interest, fees included only when amortized). */
  total: number;
  /** Amount for installments 1 … n-1. */
  baseAmount: number;
  /** Amount for the last installment — absorbs any rounding remainder. */
  lastAmount: number;
  /**
   * True when service_fee was intentionally excluded from `total`
   * (i.e. it is deducted before disbursement, not amortized into installments).
   */
  feeExcludedFromTotal: boolean;
}

export interface DetailedInstallmentBreakdown extends InstallmentBreakdown {
  totalInterest: number;
}

/**
 * A strategy function computes the repayable total and per-installment amounts
 * for one specific loan type.
 */
type InstallmentStrategy = (params: InstallmentParams) => InstallmentBreakdown;

// ── Shared utility ────────────────────────────────────────────────────────────

/**
 * Splits `total` into `count` installments.
 * The last installment absorbs any cent-level rounding remainder.
 *
 * Uses floor for base (never overcharges early) and round for last (cleans up).
 */
function splitEvenly(
  total: number,
  count: number
): Pick<InstallmentBreakdown, "baseAmount" | "lastAmount"> {
  const baseAmount = Math.floor((total / count) * 100) / 100;
  const lastAmount = Math.round((total - baseAmount * (count - 1)) * 100) / 100;
  return { baseAmount, lastAmount };
}

// ── Strategies ────────────────────────────────────────────────────────────────

/**
 * Shopee SLoan
 *
 * Formula:
 *   totalInterest = principal × monthly_rate × term
 *   total = principal + totalInterest
 *
 * Important:
 * - Admin fee / service_fee is NOT amortized into installments.
 * - It is treated as an upfront fee (typically deducted from disbursement).
 * - Therefore `service_fee` is intentionally excluded from `total`.
 *
 * Example:
 *   principal = 7000
 *   rate = 4.95
 *   term = 12
 *   totalInterest = 4157.91 (per app)
 *   total = 11157.91
 *   monthly ≈ 929.83
 */
export function computeSLoan(params: InstallmentParams): DetailedInstallmentBreakdown {
  const { principal, interest_rate, installments_total } = params;

  if (interest_rate === null) {
    throw new Error("SLoan requires a fixed interest_rate");
  }

  const rawInterest = principal * (interest_rate / 100) * installments_total;
  const totalInterest = Math.round(rawInterest * 100) / 100;

  // Admin fee is NOT amortized for SLoan.
  const total = Math.round((principal + totalInterest) * 100) / 100;

  return {
    total,
    totalInterest,
    feeExcludedFromTotal: true,
    ...splitEvenly(total, installments_total),
  };
}

/**
 * Maribank Credit
 *
 * Formula:  total = principal + (principal × monthly_rate × term)
 * Reason:   Maribank uses a monthly add-on rate applied over the full term.
 *           Stamp tax (service_fee) is deducted from the disbursed amount and
 *           is NOT amortized into monthly installments.
 *
 * Example (PHP 3,100 / 3 months / 2.95%):
 *   total = 3,100 + (3,100 × 0.0295 × 3) = 3,374.35
 *   monthly → 1,124.78 / 1,124.78 / 1,124.79
 */
function computeMaribank(params: InstallmentParams): InstallmentBreakdown {
  const { principal, interest_rate, installments_total } = params;
  const totalInterest =
    interest_rate !== null ? principal * (interest_rate / 100) * installments_total : 0;
  const total = principal + totalInterest;
  return { total, feeExcludedFromTotal: true, ...splitEvenly(total, installments_total) };
}

/**
 * GCash GLoan
 *
 * Formula:  total = principal + (principal × monthly_rate × term)
 * Reason:   GLoan uses a monthly add-on rate (default 2.59%, but varies per
 *           principal — admin must enter the actual rate shown in the GCash app).
 *           No service fee.
 *
 * Due date: same calendar day as the loan start date, always next month.
 *           Handled by due_day_of_month = null in the config, which causes
 *           generateInstallments to fall back to startDay automatically.
 *
 * Example (PHP 25,000 / 12 months / 2.59%):
 *   totalInterest = 25,000 × 0.0259 × 12 = 7,770.00
 *   total         = 32,770.00
 *   monthly       → 2,730.83 × 11 + 2,730.87 (last)
 */
function computeGLoan(params: InstallmentParams): InstallmentBreakdown {
  const { principal, interest_rate, installments_total } = params;
  const totalInterest =
    interest_rate !== null ? principal * (interest_rate / 100) * installments_total : 0;
  const total = Math.round((principal + totalInterest) * 100) / 100;
  return { total, feeExcludedFromTotal: false, ...splitEvenly(total, installments_total) };
}

/**
 * Lazada LazCredit
 *
 * Formula:  total = principal + (principal × monthly_rate × term)
 * Reason:   LazCredit uses a monthly add-on rate (default 4.08%, varies per
 *           principal — admin must enter the actual rate shown in the Lazada app).
 *           No service fee.
 *
 * Rounding: Lazada rounds each installment UP to the nearest whole peso (ceiling),
 *           so all installments are equal whole-number amounts.
 *           This means the stored total is baseAmount × term, not the raw computed total.
 *
 * Due date: same calendar day as the loan start date, always next month.
 *           due_day_of_month = null in the config — falls back to startDay.
 *
 * Example (PHP 12,000 / 12 months / 4.08%):
 *   totalInterest   = 12,000 × 0.0408 × 12 = 5,875.20
 *   rawTotal        = 17,875.20
 *   rawMonthly      = 17,875.20 / 12 = 1,489.60
 *   baseAmount      = ceil(1,489.60) = 1,490   ← matches Lazada app
 *   total           = 1,490 × 12 = 17,880
 */
function computeLazCredit(params: InstallmentParams): InstallmentBreakdown {
  const { principal, interest_rate, installments_total } = params;
  const totalInterest =
    interest_rate !== null ? principal * (interest_rate / 100) * installments_total : 0;
  const rawTotal = principal + totalInterest;

  // Ceiling to nearest whole peso — matches Lazada app behaviour.
  const baseAmount = Math.ceil(rawTotal / installments_total);
  const total = baseAmount * installments_total;

  return { total, feeExcludedFromTotal: false, baseAmount, lastAmount: baseAmount };
}

/**
 * Tabby Pay Later
 *
 * Formula:  total = principal (0% interest, no fees)
 * Reason:   Tabby splits the purchase price into 4 equal payments at 0% interest.
 *           The first payment is due immediately at checkout.
 *           Subsequent payments are monthly on the same calendar day.
 *
 * Note: Tabby may show a non-equal first payment in its app depending on
 *       merchant rounding. The `installment_overrides` in CreateLoanPayload
 *       let the admin enter the exact amounts shown in Tabby.
 *
 * Example (AED 1,000 / 4 payments):
 *   baseAmount = 250.00 × 3
 *   lastAmount = 250.00
 */
function computeTabby(params: InstallmentParams): InstallmentBreakdown {
  const { principal, installments_total } = params;
  return { total: principal, feeExcludedFromTotal: false, ...splitEvenly(principal, installments_total) };
}

/**
 * Default / flat-rate strategy
 *
 * Formula:  total = principal + (principal × rate) + service_fee
 * Reason:   Interest applied once (not per month), processing fee amortized.
 *           Used as a fallback for any loan type without a dedicated strategy.
 */
function computeDefault(params: InstallmentParams): InstallmentBreakdown {
  const { principal, interest_rate, service_fee, installments_total } = params;
  const interest = interest_rate !== null ? principal * (interest_rate / 100) : 0;
  const total = principal + interest + service_fee;
  return { total, feeExcludedFromTotal: false, ...splitEvenly(total, installments_total) };
}

// ── Registry ──────────────────────────────────────────────────────────────────
//
// To add a new credit source:
//   1. Write a `computeXxx` function above.
//   2. Register it here — no other file needs to change.

const INSTALLMENT_STRATEGIES: Partial<Record<LoanType, InstallmentStrategy>> = {
  maribank_credit: computeMaribank,
  sloan: computeSLoan,
  gloan: computeGLoan,
  lazcredit: computeLazCredit,
  tabby: computeTabby,
};

// ── Dispatcher ────────────────────────────────────────────────────────────────

/**
 * Returns the installment breakdown for the given loan type.
 * Falls back to `computeDefault` for any unregistered loan type.
 */
export function computeInstallmentAmounts(
  loanType: LoanType,
  params: InstallmentParams
): InstallmentBreakdown {
  const strategy = INSTALLMENT_STRATEGIES[loanType] ?? computeDefault;
  return strategy(params);
}
