// Named type aliases for Supabase enums.
// This file is hand-maintained so it survives `npm run gen:types` overwriting database.ts.
import type { Enums } from "@/types/database";

export type LoanStatus = Enums<"loan_status">;
export type LoanType = Enums<"loan_type">;
export type CreditSourceType = Enums<"credit_source_type">;
export type PaymentStatus = Enums<"payment_status">;
export type CurrencyType = Enums<"currency_type">;
export type RegionType = Enums<"region_type">;
export type ProofStatus = Enums<"proof_status">;
export type UserRole = Enums<"user_role">;
