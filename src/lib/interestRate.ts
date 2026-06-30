/** Matches `loans.interest_rate` column: numeric(8,5), stored as monthly % (e.g. 4.95 = 4.95%). */
export const INTEREST_RATE_MAX_DECIMALS = 5;

/** HTML number input step for interest rate fields. */
export const INTEREST_RATE_INPUT_STEP = "0.00001";

/** Normalize a monthly interest rate percentage before persisting to Postgres. */
export function roundInterestRatePercent(rate: number | null): number | null {
  if (rate === null) return null;
  const factor = 10 ** INTEREST_RATE_MAX_DECIMALS;
  return Math.round(rate * factor) / factor;
}

/** Display-friendly rate string — trims trailing zeros (4.95000 → "4.95"). */
export function formatInterestRatePercent(rate: number | null): string | null {
  if (rate === null) return null;
  const rounded = roundInterestRatePercent(rate);
  if (rounded === null) return null;
  return parseFloat(rounded.toFixed(INTEREST_RATE_MAX_DECIMALS)).toString();
}
