import type { LoanType } from "@/types/database";

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
    interest_rate !== null
      ? principal * (interest_rate / 100) * installments_total
      : 0;
  const total = principal + totalInterest;
  return { total, ...splitEvenly(total, installments_total) };
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
  const interest =
    interest_rate !== null ? principal * (interest_rate / 100) : 0;
  const total = principal + interest + service_fee;
  return { total, ...splitEvenly(total, installments_total) };
}

// ── Registry ──────────────────────────────────────────────────────────────────
//
// To add a new credit source:
//   1. Write a `computeXxx` function above.
//   2. Register it here — no other file needs to change.

const INSTALLMENT_STRATEGIES: Partial<Record<LoanType, InstallmentStrategy>> = {
  maribank_credit: computeMaribank,
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
