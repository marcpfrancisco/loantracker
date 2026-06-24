/** Official UAE Dirham sign (U+20C3) — rendered via the dirham web font. @see https://dirham.js.org/ */
export const DIRHAM_SIGN = "\u20C3";

const CURRENCY_CONFIG: Record<string, { locale: string; fractionDigits: number }> = {
  PHP: { locale: "en-PH", fractionDigits: 0 },
  AED: { locale: "en-US", fractionDigits: 2 },
};

function formatAmountDigits(amount: number, fractionDigits: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** Format an amount with the correct currency symbol (₱ for PHP, ⃃ for AED). */
export function formatCurrency(amount: number, currency: string): string {
  if (currency === "AED") {
    const digits = formatAmountDigits(amount, CURRENCY_CONFIG.AED.fractionDigits);
    return `${DIRHAM_SIGN} ${digits}`;
  }

  const config = CURRENCY_CONFIG[currency];
  const locale = config?.locale ?? "en-US";
  const fractionDigits = config?.fractionDigits ?? 0;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}
