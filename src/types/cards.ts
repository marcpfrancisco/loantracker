import type { CurrencyType } from "@/types/enums";

export type CardKind = "credit" | "debit";

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
