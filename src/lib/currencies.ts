import { countries } from "countries-list";

export interface CurrencyOption {
  code: string;
  label: string;
}

let cachedCurrencyOptions: CurrencyOption[] | null = null;

/** Unique ISO 4217 codes from bundled country data, sorted. */
export function getCurrencyOptions(): CurrencyOption[] {
  if (cachedCurrencyOptions) return cachedCurrencyOptions;

  const codes = new Set<string>();
  for (const data of Object.values(countries)) {
    for (const code of data.currency) {
      if (code) codes.add(code);
    }
  }

  cachedCurrencyOptions = [...codes]
    .sort((a, b) => a.localeCompare(b))
    .map((code) => ({ code, label: code }));

  return cachedCurrencyOptions;
}

export function filterCurrencyOptions(options: CurrencyOption[], query: string): CurrencyOption[] {
  if (!query.trim()) return options;
  const q = query.toUpperCase();
  return options.filter((o) => o.code.includes(q));
}

export function isValidCurrencyCode(code: string): boolean {
  return /^[A-Z]{3}$/.test(code.trim().toUpperCase());
}

export function normalizeCurrencyCode(code: string): string {
  return code.trim().toUpperCase();
}
