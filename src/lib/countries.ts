import { countries, type TCountryCode } from "countries-list";

// ── Flag emoji ─────────────────────────────────────────────────────────────────
// Derives the flag emoji for any ISO 3166-1 alpha-2 code using Unicode
// Regional Indicator Symbol letters (U+1F1E6–U+1F1FF).
export function getFlagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

// ── Country name ───────────────────────────────────────────────────────────────
export function getCountryName(countryCode: string): string {
  return countries[countryCode as TCountryCode]?.name ?? countryCode;
}

// ── Default currency ───────────────────────────────────────────────────────────
// Returns the first listed ISO 4217 currency for a country code.
// Falls back to 'PHP' (PH) if the code is unrecognised.
export function getDefaultCurrency(countryCode: string): string {
  const list = countries[countryCode as TCountryCode]?.currency;
  return list?.[0] ?? "PHP";
}

// ── Sorted country options ─────────────────────────────────────────────────────
// Returns all countries as a flat sorted array suitable for a picker.
export interface CountryOption {
  code: string;       // ISO 3166-1 alpha-2  e.g. 'PH'
  name: string;       // English name         e.g. 'Philippines'
  flag: string;       // flag emoji           e.g. '🇵🇭'
  currency: string;   // first ISO 4217 code  e.g. 'PHP'
}

let _cachedOptions: CountryOption[] | null = null;

export function getCountryOptions(): CountryOption[] {
  if (_cachedOptions) return _cachedOptions;

  _cachedOptions = Object.entries(countries)
    .map(([code, data]) => ({
      code,
      name: data.name,
      flag: getFlagEmoji(code),
      currency: data.currency[0] ?? "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return _cachedOptions;
}

// ── Filter helper ──────────────────────────────────────────────────────────────
// Case-insensitive search across name, code, and currency.
export function filterCountries(options: CountryOption[], query: string): CountryOption[] {
  if (!query.trim()) return options;
  const q = query.toLowerCase();
  return options.filter(
    (o) =>
      o.name.toLowerCase().includes(q) ||
      o.code.toLowerCase().includes(q) ||
      o.currency.toLowerCase().includes(q)
  );
}
