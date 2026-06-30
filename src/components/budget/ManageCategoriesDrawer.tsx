import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  defaultEntryTypeForGroup,
  defaultWealthKindForGroup,
  groupCategoriesByKey,
} from "@/lib/budgetRules";
import {
  BUDGET_GROUP_LABELS,
  BUDGET_GROUP_ORDER,
  WEALTH_ACCOUNT_KIND_LABELS,
  WEALTH_ACCOUNT_KIND_OPTIONS,
  type BudgetCategory,
  type BudgetEntryTypeHint,
  type BudgetGroupKey,
  type WealthAccount,
  type WealthAccountKind,
} from "@/types/budget";
import { buildCategoryFormDefaults, type CategoryFormInput } from "@/hooks/useCategoryMutations";

const inputClass =
  "border-border/60 bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30";

interface ManageCategoriesDrawerProps {
  open: boolean;
  onClose: () => void;
  currency: string;
  categories: BudgetCategory[];
  wealthAccounts: WealthAccount[];
  isPending: boolean;
  deletingId: string | null;
  onCreate: (input: CategoryFormInput) => Promise<void>;
  onUpdate: (categoryId: string, input: CategoryFormInput) => Promise<void>;
  onDelete: (categoryId: string) => void;
}

export function ManageCategoriesDrawer({
  open,
  onClose,
  currency,
  categories,
  wealthAccounts,
  isPending,
  deletingId,
  onCreate,
  onUpdate,
  onDelete,
}: ManageCategoriesDrawerProps) {
  const [mode, setMode] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<BudgetCategory | null>(null);
  const [form, setForm] = useState<CategoryFormInput>(buildCategoryFormDefaults());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode("list");
      setEditing(null);
      setForm(buildCategoryFormDefaults());
      setDeleteConfirmId(null);
    }
  }, [open]);

  const grouped = groupCategoriesByKey(categories);

  function openCreate(groupKey?: BudgetGroupKey) {
    setEditing(null);
    setForm(buildCategoryFormDefaults(groupKey ?? "essentials"));
    setMode("form");
  }

  function openEdit(category: BudgetCategory) {
    setEditing(category);
    setForm({
      name: category.name,
      group_key: category.group_key,
      entry_type_hint: category.entry_type_hint,
      wealth_account_id: category.wealth_account_id,
      create_wealth_account: false,
      wealth_account_kind: defaultWealthKindForGroup(category.group_key),
    });
    setMode("form");
  }

  function handleGroupChange(groupKey: BudgetGroupKey) {
    setForm((prev) => ({
      ...prev,
      group_key: groupKey,
      entry_type_hint: defaultEntryTypeForGroup(groupKey),
      wealth_account_kind: defaultWealthKindForGroup(groupKey),
      wealth_account_id: null,
      create_wealth_account: false,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    void (async () => {
      try {
        if (editing) {
          await onUpdate(editing.id, form);
        } else {
          await onCreate(form);
        }
        setMode("list");
        setEditing(null);
        setForm(buildCategoryFormDefaults(form.group_key));
      } catch {
        /* toast handled in mutation hooks */
      }
    })();
  }

  const showWealthFields = form.entry_type_hint === "allocation";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="bg-background border-border/60 fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col rounded-t-2xl border shadow-2xl md:inset-x-auto md:top-0 md:right-0 md:bottom-0 md:max-h-none md:w-full md:max-w-lg md:rounded-none md:rounded-l-2xl md:border-l"
          >
            <div className="border-border/60 flex shrink-0 items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-foreground font-heading text-base font-semibold">
                  {mode === "list"
                    ? "Manage categories"
                    : editing
                      ? "Edit category"
                      : "Add category"}
                </h2>
                <p className="text-muted-foreground text-xs">{currency} budget</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground rounded-lg p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {mode === "list" ? (
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <button
                  type="button"
                  onClick={() => openCreate()}
                  className="border-border/60 hover:bg-muted/40 mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-sm font-medium"
                >
                  <Plus className="h-4 w-4" />
                  Add category
                </button>

                <div className="space-y-4">
                  {BUDGET_GROUP_ORDER.map((groupKey) => {
                    const items = grouped[groupKey];
                    return (
                      <div key={groupKey}>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-foreground text-xs font-semibold tracking-wide uppercase">
                            {BUDGET_GROUP_LABELS[groupKey]}
                          </p>
                          <button
                            type="button"
                            onClick={() => openCreate(groupKey)}
                            className="text-primary text-xs hover:underline"
                          >
                            + Add
                          </button>
                        </div>
                        {items.length === 0 ? (
                          <p className="text-muted-foreground text-xs italic">No categories</p>
                        ) : (
                          <ul className="border-border/60 divide-border/40 divide-y rounded-lg border">
                            {items.map((cat) => (
                              <li key={cat.id} className="flex items-center gap-2 px-3 py-2.5">
                                <div className="min-w-0 flex-1">
                                  <p className="text-foreground truncate text-sm">{cat.name}</p>
                                  <p className="text-muted-foreground text-[10px]">
                                    {cat.entry_type_hint}
                                    {cat.wealth_account_id && " · linked account"}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => openEdit(cat)}
                                  className="text-muted-foreground hover:text-foreground rounded p-1.5"
                                  aria-label={`Edit ${cat.name}`}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(cat.id)}
                                  disabled={deletingId === cat.id}
                                  className="text-muted-foreground rounded p-1.5 hover:text-rose-400 disabled:opacity-50"
                                  aria-label={`Delete ${cat.name}`}
                                >
                                  {deletingId === cat.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-foreground text-xs font-medium">Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      className={inputClass}
                      placeholder="e.g. Pet care, Crypto, Travel fund"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-foreground text-xs font-medium">Group</label>
                    <select
                      value={form.group_key}
                      onChange={(e) => handleGroupChange(e.target.value as BudgetGroupKey)}
                      className={inputClass}
                    >
                      {BUDGET_GROUP_ORDER.map((g) => (
                        <option key={g} value={g}>
                          {BUDGET_GROUP_LABELS[g]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-foreground text-xs font-medium">Entry type</label>
                    <select
                      value={form.entry_type_hint}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          entry_type_hint: e.target.value as BudgetEntryTypeHint,
                          wealth_account_id:
                            e.target.value === "allocation" ? p.wealth_account_id : null,
                          create_wealth_account:
                            e.target.value === "allocation" ? p.create_wealth_account : false,
                        }))
                      }
                      className={inputClass}
                    >
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                      <option value="allocation">Allocation (savings / investment)</option>
                      <option value="transfer">Transfer</option>
                    </select>
                    <p className="text-muted-foreground text-[10px]">
                      Auto-suggested from group; change if needed.
                    </p>
                  </div>

                  {showWealthFields && (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-foreground text-xs font-medium">
                          Link to wealth account (optional)
                        </label>
                        <select
                          value={form.wealth_account_id ?? ""}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              wealth_account_id: e.target.value || null,
                              create_wealth_account: false,
                            }))
                          }
                          className={inputClass}
                          disabled={form.create_wealth_account}
                        >
                          <option value="">None</option>
                          {wealthAccounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {!form.wealth_account_id && (
                        <label className="flex items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={form.create_wealth_account ?? false}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                create_wealth_account: e.target.checked,
                              }))
                            }
                            className="mt-0.5"
                          />
                          <span>
                            <span className="text-foreground font-medium">
                              Create new wealth account
                            </span>
                            <span className="text-muted-foreground block text-xs">
                              Uses the category name; balances update when you log allocations.
                            </span>
                          </span>
                        </label>
                      )}

                      {form.create_wealth_account && !form.wealth_account_id && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-foreground text-xs font-medium">
                            Account type
                          </label>
                          <select
                            value={form.wealth_account_kind ?? "other"}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                wealth_account_kind: e.target.value as WealthAccountKind,
                              }))
                            }
                            className={inputClass}
                          >
                            {WEALTH_ACCOUNT_KIND_OPTIONS.map((kind) => (
                              <option key={kind} value={kind}>
                                {WEALTH_ACCOUNT_KIND_LABELS[kind]}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="border-border/60 flex shrink-0 gap-3 border-t px-5 py-4">
                  <button
                    type="button"
                    onClick={() => setMode("list")}
                    className="border-border/60 text-muted-foreground hover:text-foreground flex-1 rounded-lg border py-2 text-sm"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !form.name.trim()}
                    className="bg-primary text-primary-foreground flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium disabled:opacity-50"
                  >
                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editing ? "Save changes" : "Add category"}
                  </button>
                </div>
              </form>
            )}

            {deleteConfirmId && (
              <div className="border-border/60 bg-muted/30 absolute inset-x-4 bottom-4 rounded-xl border p-4 shadow-lg">
                <p className="text-foreground text-sm font-medium">Delete this category?</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Only allowed when no budget entries use it.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(null)}
                    className="border-border/60 flex-1 rounded-lg border py-2 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(deleteConfirmId);
                      setDeleteConfirmId(null);
                    }}
                    className="flex-1 rounded-lg bg-rose-500 py-2 text-sm font-medium text-white"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
