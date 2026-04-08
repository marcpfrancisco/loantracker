import type { CreditSourceType, LoanType, RegionType } from "@/types/enums";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Stamp tax varies by loan duration for certain products (e.g. Maribank).
 * When present, service_fee is overridden automatically as installments change.
 */
export interface StampTaxTier {
  months: number;
  amount: number; // in the loan's currency
}

/**
 * Describes how the service_fee is displayed in the loan breakdown UI.
 *
 * - `amortized`         → fee is rolled into installments (shown as "Service Fee" row above total).
 * - `upfront_deduction` → fee is deducted from the disbursed amount before the borrower receives it
 *                         (shown below the installment schedule with a custom label + green receipt row).
 *
 * When absent, the component falls back to `amortized` if service_fee > 0.
 */
export type FeeDisplayMode = { kind: "amortized" } | { kind: "upfront_deduction"; label: string };

export type FirstDueStrategy =
  | "same_month_if_possible"
  | "always_next_month"
  | "fixed_days_after_disbursement" // e.g. +30 days
  | "billing_cycle_based"
  | "immediate_first_then_monthly"; // first payment due same day as purchase (e.g. Tabby)

export interface LoanTypeConfig {
  /** Must match the loan_type enum value in the database */
  loan_type: LoanType;
  /** Display label shown in the UI */
  label: string;
  /** Default installment count (should equal available_durations[0]) */
  installments_total: number;
  /**
   * Selectable loan duration options (months).
   * Drives the Installments dropdown in AddLoanDrawer.
   */
  available_durations: number[];
  /** Monthly add-on rate as a percentage, e.g. 2.95 = 2.95%. null = unknown/variable */
  interest_rate: number | null;
  /** Fixed service fee / processing fee in the loan's currency. 0 = no fee. */
  service_fee: number;
  /** Day of month payment is due, null if not applicable */
  due_day_of_month: number | null;
  /**
   * When present, service_fee is auto-computed from this table
   * based on the selected installments_total.
   */
  stamp_tax_tiers?: StampTaxTier[];
  /**
   * Determines how the service_fee is rendered in LoanBreakdownSummary.
   * Defaults to `amortized` when omitted.
   */
  feeDisplayMode?: FeeDisplayMode;

  /** NEW: controls how first installment date is computed */
  first_due_strategy: FirstDueStrategy;
}

export interface CreditSourceConfig {
  /** Exact name as stored in the credit_sources table */
  name: string;
  type: CreditSourceType;
  region: RegionType;
  loan_types: LoanTypeConfig[];
}

// ── Configs ───────────────────────────────────────────────────────────────────

export const CREDIT_SOURCE_CONFIGS: CreditSourceConfig[] = [
  // ── Philippines ─────────────────────────────────────────────────────────────

  {
    name: "Shopee",
    type: "bnpl",
    region: "PH",
    loan_types: [
      {
        loan_type: "spaylater",
        label: "SPayLater",
        installments_total: 3,
        available_durations: [3],
        interest_rate: null,
        service_fee: 0,
        due_day_of_month: null,
        first_due_strategy: "always_next_month",
      },
      {
        loan_type: "sloan",
        label: "SLoan",
        installments_total: 4,
        available_durations: [3, 6, 9, 12],
        interest_rate: 4.95,
        service_fee: 0,
        due_day_of_month: 29,
        // SLoan admin fee is deducted from disbursement, never rolled in.
        feeDisplayMode: { kind: "upfront_deduction", label: "Admin Fee" },
        first_due_strategy: "always_next_month",
      },
    ],
  },

  {
    name: "GCash",
    type: "bnpl",
    region: "PH",
    loan_types: [
      {
        /**
         * GCash GLoan — monthly add-on rate (varies per principal, default 2.59%).
         * Due date = same calendar day as disbursement, always next month.
         * due_day_of_month is null so the system inherits the start-date day.
         */
        loan_type: "gloan",
        label: "GLoan",
        installments_total: 3,
        available_durations: [3, 6, 9, 12],
        interest_rate: 2.59,
        service_fee: 0,
        due_day_of_month: null,
        first_due_strategy: "always_next_month",
      },
    ],
  },

  {
    name: "Lazada",
    type: "bnpl",
    region: "PH",
    loan_types: [
      {
        loan_type: "lazcredit",
        label: "LazCredit",
        installments_total: 3,
        available_durations: [3, 6, 9, 12],
        interest_rate: 4.08,
        service_fee: 0,
        due_day_of_month: null,
        first_due_strategy: "always_next_month",
      },
    ],
  },

  {
    /**
     * Maribank — PH digital bank offering personal cash loans
     * Monthly add-on rate: 2.95%
     * Stamp tax: varies by principal — admin must enter the actual amount
     *            shown in the Maribank app per loan (not a fixed value).
     * Default due date: 30th of the month
     */
    name: "Maribank",
    type: "bnpl",
    region: "PH",
    loan_types: [
      {
        loan_type: "maribank_credit",
        label: "Maribank Credit",
        installments_total: 3,
        available_durations: [3, 6, 12],
        interest_rate: 2.95,
        service_fee: 0,
        due_day_of_month: 30,
        // Stamp tax is deducted from disbursement, never rolled in.
        feeDisplayMode: { kind: "upfront_deduction", label: "Stamp Tax" },
        first_due_strategy: "same_month_if_possible",
      },
    ],
  },

  // ── UAE ─────────────────────────────────────────────────────────────────────

  {
    name: "Tabby",
    type: "bnpl",
    region: "AE",
    loan_types: [
      {
        /**
         * Tabby Pay Later — 4 equal splits, 0% interest, no fees.
         * First payment is due immediately on the purchase date.
         * Subsequent payments fall on the same calendar day each month.
         * Amounts are editable in the form because Tabby's app may show
         * a non-equal first split depending on merchant rounding.
         */
        loan_type: "tabby",
        label: "Tabby",
        installments_total: 4,
        available_durations: [4],
        interest_rate: 0,
        service_fee: 0,
        due_day_of_month: null,
        first_due_strategy: "immediate_first_then_monthly",
      },
    ],
  },

  {
    /** Rates TBD — placeholder until admin provides breakdown */
    name: "Emirates NBD",
    type: "credit_card",
    region: "AE",
    loan_types: [
      {
        loan_type: "credit_card",
        label: "Credit Card",
        installments_total: 12,
        available_durations: [3, 6, 9, 12],
        interest_rate: null,
        service_fee: 0,
        due_day_of_month: null,
        first_due_strategy: "always_next_month",
      },
    ],
  },

  {
    /** Rates TBD */
    name: "Mashreq",
    type: "credit_card",
    region: "AE",
    loan_types: [
      {
        loan_type: "credit_card",
        label: "Credit Card",
        installments_total: 12,
        available_durations: [3, 6, 9, 12],
        interest_rate: null,
        service_fee: 0,
        due_day_of_month: null,
        first_due_strategy: "always_next_month",
      },
    ],
  },

  {
    /** Rates TBD */
    name: "ADCB",
    type: "credit_card",
    region: "AE",
    loan_types: [
      {
        loan_type: "credit_card",
        label: "Credit Card",
        installments_total: 12,
        available_durations: [3, 6, 9, 12],
        interest_rate: null,
        service_fee: 0,
        due_day_of_month: null,
        first_due_strategy: "always_next_month",
      },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Fallback for credit sources not yet in the config */
export const FALLBACK_LOAN_TYPE: LoanTypeConfig = {
  loan_type: "custom",
  label: "Custom",
  installments_total: 1,
  available_durations: [1, 2, 3, 6, 9, 12, 18, 24],
  interest_rate: null,
  service_fee: 0,
  due_day_of_month: null,
  first_due_strategy: "always_next_month",
};

export function getSourceConfig(sourceName: string): CreditSourceConfig | null {
  return CREDIT_SOURCE_CONFIGS.find((c) => c.name === sourceName) ?? null;
}

export function getLoanTypesForSource(sourceName: string): LoanTypeConfig[] {
  return getSourceConfig(sourceName)?.loan_types ?? [FALLBACK_LOAN_TYPE];
}

export function getLoanTypeConfig(sourceName: string, loanType: LoanType): LoanTypeConfig | null {
  return getSourceConfig(sourceName)?.loan_types.find((lt) => lt.loan_type === loanType) ?? null;
}
