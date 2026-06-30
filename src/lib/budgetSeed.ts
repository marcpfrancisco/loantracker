import type { CurrencyType } from "@/types/enums";
import type { BudgetEntryTypeHint, BudgetGroupKey } from "@/types/budget";

export interface SeedCategory {
  name: string;
  group_key: BudgetGroupKey;
  entry_type_hint: BudgetEntryTypeHint;
  sort_order: number;
}

const SHARED_CATEGORIES: SeedCategory[] = [
  { name: "Salary", group_key: "income", entry_type_hint: "income", sort_order: 10 },
  { name: "Side income", group_key: "income", entry_type_hint: "income", sort_order: 20 },
  { name: "Bonus", group_key: "income", entry_type_hint: "income", sort_order: 30 },
  { name: "Other income", group_key: "income", entry_type_hint: "income", sort_order: 40 },
  { name: "Rent / Housing", group_key: "essentials", entry_type_hint: "expense", sort_order: 50 },
  { name: "Groceries", group_key: "essentials", entry_type_hint: "expense", sort_order: 60 },
  { name: "Utilities", group_key: "essentials", entry_type_hint: "expense", sort_order: 70 },
  { name: "Transport", group_key: "essentials", entry_type_hint: "expense", sort_order: 80 },
  { name: "Insurance", group_key: "essentials", entry_type_hint: "expense", sort_order: 90 },
  { name: "Dining", group_key: "lifestyle", entry_type_hint: "expense", sort_order: 100 },
  { name: "Entertainment", group_key: "lifestyle", entry_type_hint: "expense", sort_order: 110 },
  { name: "Shopping", group_key: "lifestyle", entry_type_hint: "expense", sort_order: 120 },
  { name: "Subscriptions", group_key: "lifestyle", entry_type_hint: "expense", sort_order: 130 },
  { name: "Card payment", group_key: "transfers", entry_type_hint: "transfer", sort_order: 200 },
  {
    name: "Internal transfer",
    group_key: "transfers",
    entry_type_hint: "transfer",
    sort_order: 210,
  },
  { name: "Loan payment", group_key: "debt", entry_type_hint: "expense", sort_order: 220 },
];

const PHP_EXTRA: SeedCategory[] = [
  {
    name: "Remittance received",
    group_key: "transfers",
    entry_type_hint: "transfer",
    sort_order: 190,
  },
];

const AED_EXTRA: SeedCategory[] = [
  { name: "Remittance sent", group_key: "transfers", entry_type_hint: "transfer", sort_order: 185 },
];

/** Starter budget categories only — wealth accounts are added by the user. */
export function getSeedCategories(currency: CurrencyType): SeedCategory[] {
  const extra = currency === "PHP" ? PHP_EXTRA : currency === "AED" ? AED_EXTRA : [];
  return [...SHARED_CATEGORIES, ...extra].sort((a, b) => a.sort_order - b.sort_order);
}
