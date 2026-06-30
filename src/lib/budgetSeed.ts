import type { CurrencyType } from "@/types/enums";
import type { BudgetEntryTypeHint, BudgetGroupKey, WealthAccountKind } from "@/types/budget";

export interface SeedWealthAccount {
  name: string;
  account_kind: WealthAccountKind;
  region?: string;
}

export interface SeedCategory {
  name: string;
  group_key: BudgetGroupKey;
  entry_type_hint: BudgetEntryTypeHint;
  sort_order: number;
  /** Match by account name to link after wealth accounts are created */
  wealth_account_name?: string;
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
  {
    name: "Emergency fund",
    group_key: "savings",
    entry_type_hint: "allocation",
    sort_order: 140,
    wealth_account_name: "Emergency fund",
  },
  {
    name: "General savings",
    group_key: "savings",
    entry_type_hint: "allocation",
    sort_order: 150,
    wealth_account_name: "General savings",
  },
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
  {
    name: "MP2",
    group_key: "investments",
    entry_type_hint: "allocation",
    sort_order: 160,
    wealth_account_name: "MP2",
  },
  {
    name: "UITF",
    group_key: "investments",
    entry_type_hint: "allocation",
    sort_order: 170,
    wealth_account_name: "UITF",
  },
  {
    name: "REIT",
    group_key: "investments",
    entry_type_hint: "allocation",
    sort_order: 175,
    wealth_account_name: "REIT",
  },
  {
    name: "Bonds",
    group_key: "investments",
    entry_type_hint: "allocation",
    sort_order: 180,
    wealth_account_name: "Bonds",
  },
];

const AED_EXTRA: SeedCategory[] = [
  { name: "Remittance sent", group_key: "transfers", entry_type_hint: "transfer", sort_order: 185 },
];

const PHP_WEALTH: SeedWealthAccount[] = [
  { name: "Emergency fund", account_kind: "emergency", region: "PH" },
  { name: "General savings", account_kind: "savings", region: "PH" },
  { name: "MP2", account_kind: "mp2", region: "PH" },
  { name: "UITF", account_kind: "uitf", region: "PH" },
  { name: "REIT", account_kind: "reit", region: "PH" },
  { name: "Bonds", account_kind: "bond", region: "PH" },
];

const AED_WEALTH: SeedWealthAccount[] = [
  { name: "Emergency fund", account_kind: "emergency", region: "AE" },
  { name: "General savings", account_kind: "savings", region: "AE" },
];

export function getSeedWealthAccounts(currency: CurrencyType): SeedWealthAccount[] {
  const base = [
    { name: "Emergency fund", account_kind: "emergency" as const },
    { name: "General savings", account_kind: "savings" as const },
  ];
  if (currency === "PHP") return PHP_WEALTH;
  if (currency === "AED") return AED_WEALTH;
  return base.map((a) => ({ ...a, region: undefined }));
}

export function getSeedCategories(currency: CurrencyType): SeedCategory[] {
  const extra = currency === "PHP" ? PHP_EXTRA : currency === "AED" ? AED_EXTRA : [];
  return [...SHARED_CATEGORIES, ...extra].sort((a, b) => a.sort_order - b.sort_order);
}
