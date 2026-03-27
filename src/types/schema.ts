import type { CreditSourceType, LoanType, RegionType } from "@/types/database";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Stamp tax varies by loan duration for certain products (e.g. Maribank).
 * When present, service_fee is overridden automatically as installments change.
 */
export interface StampTaxTier {
  months: number;
  amount: number; // in the loan's currency
}

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
      },
      {
        loan_type: "sloan",
        label: "SLoan",
        installments_total: 3,
        available_durations: [3],
        interest_rate: null,
        service_fee: 0,
        due_day_of_month: null,
      },
    ],
  },

  {
    name: "GCash",
    type: "bnpl",
    region: "PH",
    loan_types: [
      {
        loan_type: "gloan",
        label: "GLoan",
        installments_total: 3,
        available_durations: [3],
        interest_rate: null,
        service_fee: 0,
        due_day_of_month: null,
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
        available_durations: [3],
        interest_rate: null,
        service_fee: 0,
        due_day_of_month: null,
      },
    ],
  },

  {
    /**
     * Maribank — PH digital bank offering personal cash loans
     * Monthly add-on rate: 2.95%
     * Processing fee: PHP 0.00
     * Stamp tax by duration:
     *   3 months  → PHP  77.07
     *   6 months  → PHP 152.49
     *   12 months → PHP 299.25
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
        service_fee: 77.07, // default: 3-month stamp tax
        due_day_of_month: 30,
        stamp_tax_tiers: [
          { months: 3,  amount:  77.07 },
          { months: 6,  amount: 152.49 },
          { months: 12, amount: 299.25 },
        ],
      },
    ],
  },

  // ── UAE ─────────────────────────────────────────────────────────────────────

  {
    name: "Tabby",
    type: "bnpl",
    region: "UAE",
    loan_types: [
      {
        loan_type: "tabby",
        label: "Tabby",
        installments_total: 4,
        available_durations: [4],
        interest_rate: 0,
        service_fee: 0,
        due_day_of_month: null,
      },
    ],
  },

  {
    /** Rates TBD — placeholder until admin provides breakdown */
    name: "Emirates NBD",
    type: "credit_card",
    region: "UAE",
    loan_types: [
      {
        loan_type: "credit_card",
        label: "Credit Card",
        installments_total: 12,
        available_durations: [3, 6, 9, 12],
        interest_rate: null,
        service_fee: 0,
        due_day_of_month: null,
      },
    ],
  },

  {
    /** Rates TBD */
    name: "Mashreq",
    type: "credit_card",
    region: "UAE",
    loan_types: [
      {
        loan_type: "credit_card",
        label: "Credit Card",
        installments_total: 12,
        available_durations: [3, 6, 9, 12],
        interest_rate: null,
        service_fee: 0,
        due_day_of_month: null,
      },
    ],
  },

  {
    /** Rates TBD */
    name: "ADCB",
    type: "credit_card",
    region: "UAE",
    loan_types: [
      {
        loan_type: "credit_card",
        label: "Credit Card",
        installments_total: 12,
        available_durations: [3, 6, 9, 12],
        interest_rate: null,
        service_fee: 0,
        due_day_of_month: null,
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
