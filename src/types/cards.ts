import type { CurrencyType } from "@/types/enums";

export type CardKind = "credit" | "debit";

export type CardTxnType = "charge" | "payment" | "refund" | "fee";

export type CardStatementStatus = "open" | "closed" | "paid";

export interface CardAccount {
  id: string;
  user_id: string;
  org_id: string;
  name: string;
  issuer: string | null;
  card_kind: CardKind;
  currency: CurrencyType;
  last_four: string | null;
  credit_limit: number | null;
  outstanding_balance: number;
  statement_day: number | null;
  region: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const CARD_KIND_LABELS: Record<CardKind, string> = {
  credit: "Credit card",
  debit: "Debit card",
};

export const DEFAULT_CARD_CURRENCIES = ["PHP", "AED"] as const satisfies readonly CurrencyType[];

export interface CardAccountFormInput {
  name: string;
  issuer?: string;
  card_kind: CardKind;
  last_four?: string;
  credit_limit?: number | null;
  outstanding_balance?: number;
  statement_day?: number | null;
  notes?: string;
}

export interface CardStatement {
  id: string;
  user_id: string;
  org_id: string;
  card_account_id: string;
  period_start: string;
  period_end: string;
  statement_balance: number;
  min_payment: number | null;
  payment_due_date: string | null;
  status: CardStatementStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CardTransaction {
  id: string;
  user_id: string;
  org_id: string;
  card_account_id: string;
  statement_id: string | null;
  txn_type: CardTxnType;
  amount: number;
  txn_date: string;
  merchant: string | null;
  description: string | null;
  budget_entry_id: string | null;
  budget_category_id: string | null;
  notes: string | null;
  created_at: string;
  budget_categories?: { name: string } | null;
}

export interface CardStatementFormInput {
  period_start: string;
  period_end: string;
  statement_balance: number;
  min_payment?: number | null;
  payment_due_date?: string | null;
  notes?: string;
}

export interface CardTransactionFormInput {
  txn_type: CardTxnType;
  amount: number;
  txn_date: string;
  merchant?: string;
  description?: string;
  statement_id?: string | null;
  notes?: string;
}

export const CARD_TXN_TYPE_LABELS: Record<CardTxnType, string> = {
  charge: "Charge",
  payment: "Payment",
  refund: "Refund",
  fee: "Fee",
};

export const CARD_TXN_TYPE_OPTIONS: CardTxnType[] = ["charge", "payment", "refund", "fee"];
