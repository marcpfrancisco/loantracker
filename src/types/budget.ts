import type { CurrencyType } from "@/types/enums";

export type BudgetGroupKey =
  | "income"
  | "essentials"
  | "lifestyle"
  | "savings"
  | "investments"
  | "transfers"
  | "debt";

export type BudgetEntryType = "income" | "expense" | "allocation" | "transfer";

export type BudgetEntryTypeHint = BudgetEntryType;

export type WealthAccountKind =
  | "savings"
  | "salary"
  | "cash"
  | "e_wallet"
  | "emergency"
  | "mp2"
  | "uitf"
  | "reit"
  | "bond"
  | "stocks"
  | "other";

export type WealthTxnType =
  | "deposit"
  | "withdrawal"
  | "contribution"
  | "interest"
  | "dividend"
  | "value_adjustment";

export interface BudgetPeriod {
  id: string;
  user_id: string;
  org_id: string;
  currency: CurrencyType;
  period_month: string;
  status: "open" | "closed";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetCategory {
  id: string;
  user_id: string;
  org_id: string;
  name: string;
  group_key: BudgetGroupKey;
  entry_type_hint: BudgetEntryTypeHint;
  currency: CurrencyType;
  sort_order: number;
  wealth_account_id: string | null;
  created_at: string;
}

export interface BudgetTarget {
  id: string;
  period_id: string;
  category_id: string;
  amount_limit: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetEntry {
  id: string;
  user_id: string;
  org_id: string;
  period_id: string;
  category_id: string;
  entry_type: BudgetEntryType;
  amount: number;
  entry_date: string;
  description: string | null;
  notes: string | null;
  wealth_account_id: string | null;
  created_at: string;
  updated_at: string;
  budget_categories?: Pick<BudgetCategory, "name" | "group_key"> | null;
}

export interface WealthAccount {
  id: string;
  user_id: string;
  org_id: string;
  name: string;
  currency: CurrencyType;
  account_kind: WealthAccountKind;
  cash_balance: number;
  market_value: number | null;
  institution: string | null;
  region: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategorySummary {
  category_id: string;
  name: string;
  group_key: BudgetGroupKey;
  entry_type_hint: BudgetEntryTypeHint;
  target: number;
  actual: number;
  remaining: number;
  percent_used: number;
  wealth_account_id: string | null;
}

export interface PeriodSummary {
  income_total: number;
  essentials_spent: number;
  lifestyle_spent: number;
  savings_allocated: number;
  investments_allocated: number;
  transfers_total: number;
  debt_total: number;
  net_cash_flow: number;
  unallocated_income: number;
}

export interface BudgetSummary {
  period: PeriodSummary;
  categories: CategorySummary[];
}

export const BUDGET_GROUP_ORDER: BudgetGroupKey[] = [
  "income",
  "essentials",
  "lifestyle",
  "savings",
  "investments",
  "transfers",
  "debt",
];

export const BUDGET_GROUP_LABELS: Record<BudgetGroupKey, string> = {
  income: "Income",
  essentials: "Essentials",
  lifestyle: "Lifestyle",
  savings: "Savings",
  investments: "Investments",
  transfers: "Transfers",
  debt: "Debt",
};

export const WEALTH_ACCOUNT_KIND_LABELS: Record<WealthAccountKind, string> = {
  savings: "Savings",
  salary: "Salary account",
  cash: "Cash on hand",
  e_wallet: "E-wallet",
  emergency: "Emergency fund",
  mp2: "MP2",
  uitf: "UITF",
  reit: "REIT",
  bond: "Bonds",
  stocks: "Stocks",
  other: "Other",
};

/** Suggested kinds shown first in the add-account picker. */
export const WEALTH_ACCOUNT_KIND_OPTIONS: WealthAccountKind[] = [
  "savings",
  "salary",
  "cash",
  "e_wallet",
  "emergency",
  "mp2",
  "uitf",
  "reit",
  "bond",
  "stocks",
  "other",
];

/** Currencies shown in the budget currency switcher for Phase 1. */
export const BUDGET_CURRENCIES = ["PHP", "AED"] as const satisfies readonly CurrencyType[];
