// Named type aliases for Supabase enums.
// This file is hand-maintained so it survives `npm run gen:types` overwriting database.ts.
//
// NOTE: RegionType and CurrencyType were previously Postgres enums ('PH'|'UAE' and
// 'PHP'|'AED'). Migration 010 converted those columns to plain `text` so any ISO
// 3166-1 alpha-2 country code or ISO 4217 currency code is now valid.
// Run `npm run gen:types` after applying migration 010 to regenerate database.ts.
import type { Enums } from "@/types/database";

export type LoanStatus = Enums<"loan_status">;
export type LoanType = Enums<"loan_type">;
export type CreditSourceType = Enums<"credit_source_type">;
export type PaymentStatus = Enums<"payment_status">;
export type ProofStatus = Enums<"proof_status">;
export type UserRole = Enums<"user_role">;

// Free-form after migration 010 — any ISO 3166-1 alpha-2 code (e.g. 'PH', 'AE', 'US')
export type RegionType = string;

// Free-form after migration 010 — any ISO 4217 code (e.g. 'PHP', 'AED', 'USD')
export type CurrencyType = string;
