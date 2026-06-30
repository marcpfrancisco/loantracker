import { roundMoney } from "@/lib/expensePeriodRules";
import type {
  BudgetCategory,
  BudgetEntry,
  BudgetEntryType,
  BudgetEntryTypeHint,
  BudgetGroupKey,
  BudgetSummary,
  BudgetTarget,
  CategorySummary,
  PeriodSummary,
  WealthAccountKind,
} from "@/types/budget";
import { BUDGET_GROUP_ORDER } from "@/types/budget";

export function toFirstOfMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export function currentMonthStr(): string {
  return toFirstOfMonth(new Date());
}

export function normalizeMonthKey(period: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(period);
  return match ? match[1] : period.slice(0, 10);
}

export function shiftMonth(monthKey: string, delta: number): string {
  const d = new Date(monthKey + "T12:00:00");
  d.setMonth(d.getMonth() + delta);
  return toFirstOfMonth(d);
}

export function formatMonthLabel(monthKey: string): string {
  return new Date(monthKey + "T12:00:00").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function formatMonthShort(monthKey: string): string {
  return new Date(monthKey + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

function sumByGroup(
  entries: BudgetEntry[],
  categories: Map<string, BudgetCategory>,
  group: BudgetGroupKey
): number {
  return roundMoney(
    entries.reduce((sum, entry) => {
      const cat = categories.get(entry.category_id);
      if (!cat || cat.group_key !== group) return sum;
      return sum + Number(entry.amount);
    }, 0)
  );
}

export function computeBudgetSummary(
  categories: BudgetCategory[],
  targets: BudgetTarget[],
  entries: BudgetEntry[]
): BudgetSummary {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const targetMap = new Map(targets.map((t) => [t.category_id, Number(t.amount_limit)]));

  const categorySummaries: CategorySummary[] = categories.map((cat) => {
    const actual = roundMoney(
      entries.filter((e) => e.category_id === cat.id).reduce((s, e) => s + Number(e.amount), 0)
    );
    const target = roundMoney(targetMap.get(cat.id) ?? 0);
    const remaining =
      cat.group_key === "income"
        ? roundMoney(Math.max(0, actual - target))
        : roundMoney(Math.max(0, target - actual));
    const percent_used =
      target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : actual > 0 ? 100 : 0;

    return {
      category_id: cat.id,
      name: cat.name,
      group_key: cat.group_key,
      entry_type_hint: cat.entry_type_hint,
      target,
      actual,
      remaining,
      percent_used,
      wealth_account_id: cat.wealth_account_id,
    };
  });

  const income_total = sumByGroup(entries, categoryMap, "income");
  const essentials_spent = sumByGroup(entries, categoryMap, "essentials");
  const lifestyle_spent = sumByGroup(entries, categoryMap, "lifestyle");
  const savings_allocated = sumByGroup(entries, categoryMap, "savings");
  const investments_allocated = sumByGroup(entries, categoryMap, "investments");
  const transfers_total = sumByGroup(entries, categoryMap, "transfers");
  const debt_total = sumByGroup(entries, categoryMap, "debt");

  const outflows = roundMoney(
    essentials_spent + lifestyle_spent + savings_allocated + investments_allocated + debt_total
  );
  const net_cash_flow = roundMoney(income_total - outflows);
  const unallocated_income = roundMoney(
    Math.max(
      0,
      income_total -
        savings_allocated -
        investments_allocated -
        essentials_spent -
        lifestyle_spent -
        debt_total
    )
  );

  const period: PeriodSummary = {
    income_total,
    essentials_spent,
    lifestyle_spent,
    savings_allocated,
    investments_allocated,
    transfers_total,
    debt_total,
    net_cash_flow,
    unallocated_income,
  };

  return { period, categories: categorySummaries };
}

export function inferEntryType(category: Pick<BudgetCategory, "entry_type_hint">): BudgetEntryType {
  return category.entry_type_hint;
}

export function isBurnGroup(group: BudgetGroupKey): boolean {
  return group === "essentials" || group === "lifestyle";
}

export function isGoalGroup(group: BudgetGroupKey): boolean {
  return group === "savings" || group === "investments";
}

/** Default entry type when creating a category in a given group. */
export function defaultEntryTypeForGroup(group: BudgetGroupKey): BudgetEntryTypeHint {
  switch (group) {
    case "income":
      return "income";
    case "transfers":
      return "transfer";
    case "savings":
    case "investments":
      return "allocation";
    default:
      return "expense";
  }
}

/** Default wealth account kind when auto-creating a linked account. */
export function defaultWealthKindForGroup(group: BudgetGroupKey): WealthAccountKind {
  if (group === "investments") return "other";
  if (group === "savings") return "savings";
  return "other";
}

/** Groups that currently have at least one category, in display order. */
export function getActiveGroupOrder(categories: BudgetCategory[]): BudgetGroupKey[] {
  const present = new Set(categories.map((c) => c.group_key));
  return BUDGET_GROUP_ORDER.filter((g) => present.has(g));
}

/** Next sort_order for a new category (appends after existing in same group). */
export function nextCategorySortOrder(
  categories: Pick<BudgetCategory, "group_key" | "sort_order">[],
  groupKey: BudgetGroupKey
): number {
  const inGroup = categories.filter((c) => c.group_key === groupKey);
  if (inGroup.length === 0) {
    const groupIndex = BUDGET_GROUP_ORDER.indexOf(groupKey);
    return (groupIndex + 1) * 10;
  }
  return Math.max(...inGroup.map((c) => c.sort_order)) + 10;
}

export function groupCategoriesByKey(
  categories: BudgetCategory[]
): Record<BudgetGroupKey, BudgetCategory[]> {
  const grouped = {} as Record<BudgetGroupKey, BudgetCategory[]>;
  for (const key of BUDGET_GROUP_ORDER) {
    grouped[key] = [];
  }
  for (const cat of categories) {
    grouped[cat.group_key].push(cat);
  }
  return grouped;
}
