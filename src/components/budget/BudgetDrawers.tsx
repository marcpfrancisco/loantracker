import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Loader2,
  PiggyBank,
  Wallet,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Resolver } from "react-hook-form";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatCurrency";
import {
  cardAccountFieldLabel,
  getActiveGroupOrder,
  groupCategoriesByKey,
  inferEntryType,
  showsCardPicker,
  wealthAccountFieldLabel,
  wealthAndCardExclusive,
} from "@/lib/budgetRules";
import type { BudgetCategory, BudgetEntryType, WealthAccount } from "@/types/budget";
import { BUDGET_GROUP_LABELS, WEALTH_ACCOUNT_KIND_LABELS } from "@/types/budget";
import type { CardAccount } from "@/types/cards";
import { CARD_KIND_LABELS } from "@/types/cards";

const schema = z.object({
  category_id: z.string().min(1, "Select a category"),
  amount: z.coerce.number({ message: "Enter amount" }).positive("Must be positive"),
  entry_date: z.string().min(1, "Select a date"),
  description: z.string().optional(),
  wealth_account_id: z.string().optional(),
  card_account_id: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export type AddBudgetEntryFormData = Omit<FormData, "wealth_account_id" | "card_account_id"> & {
  category: BudgetCategory;
  wealth_account_id: string | null;
  card_account_id: string | null;
};

type ExpensePaymentSource = "none" | "wealth" | "card";

interface AddBudgetEntryDrawerProps {
  open: boolean;
  onClose: () => void;
  categories: BudgetCategory[];
  wealthAccounts: WealthAccount[];
  cardAccounts: CardAccount[];
  currency: string;
  defaultCategoryId?: string;
  isPending: boolean;
  onSubmit: (data: AddBudgetEntryFormData) => void;
}

const inputClass =
  "border-border/60 bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30";

const ENTRY_TYPE_STYLES: Record<
  BudgetEntryType,
  { label: string; className: string; Icon: typeof Wallet }
> = {
  income: {
    label: "Income",
    className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    Icon: ArrowDownLeft,
  },
  expense: {
    label: "Expense",
    className: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    Icon: ArrowUpRight,
  },
  allocation: {
    label: "Allocation",
    className: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    Icon: PiggyBank,
  },
  transfer: {
    label: "Transfer",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    Icon: Wallet,
  },
};

function defaultWealthAccountId(
  category: BudgetCategory | undefined,
  accounts: WealthAccount[]
): string {
  if (category?.wealth_account_id) return category.wealth_account_id;
  return accounts[0]?.id ?? "";
}

export function AddBudgetEntryDrawer(props: AddBudgetEntryDrawerProps) {
  return (
    <AnimatePresence>
      {props.open && (
        <AddBudgetEntryDrawerContent
          key={`${props.defaultCategoryId ?? "new"}-${props.categories.length}`}
          {...props}
        />
      )}
    </AnimatePresence>
  );
}

function AddBudgetEntryDrawerContent({
  onClose,
  categories,
  wealthAccounts,
  cardAccounts,
  currency,
  defaultCategoryId,
  isPending,
  onSubmit,
}: AddBudgetEntryDrawerProps) {
  const initialCategory = categories.find((c) => c.id === defaultCategoryId) ?? categories[0];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: {
      category_id: initialCategory?.id ?? "",
      amount: undefined,
      entry_date: new Date().toISOString().slice(0, 10),
      description: "",
      wealth_account_id: defaultWealthAccountId(initialCategory, wealthAccounts),
      card_account_id: "",
    },
  });

  const [expensePayment, setExpensePayment] = useState<ExpensePaymentSource>("none");

  const watchedCategoryId = watch("category_id");
  const watchedAmount = watch("amount");
  const watchedAccountId = watch("wealth_account_id");
  const watchedCardId = watch("card_account_id");
  const selectedCategory = categories.find((c) => c.id === watchedCategoryId);
  const entryType = selectedCategory ? inferEntryType(selectedCategory) : null;
  const typeStyle = entryType ? ENTRY_TYPE_STYLES[entryType] : null;
  const selectedAccount = wealthAccounts.find((a) => a.id === watchedAccountId);
  const selectedCard = cardAccounts.find((c) => c.id === watchedCardId);
  const creditCards = cardAccounts.filter((c) => c.card_kind === "credit");
  const showCardSection = showsCardPicker(entryType);
  const exclusivePayment = wealthAndCardExclusive(entryType);

  const grouped = groupCategoriesByKey(categories);
  const groupOrder = getActiveGroupOrder(categories);

  const syncsAccount = Boolean(watchedAccountId);
  const syncsCard = Boolean(watchedCardId);

  function handleCategoryChange(categoryId: string) {
    setValue("category_id", categoryId);
    const cat = categories.find((c) => c.id === categoryId);
    setValue("wealth_account_id", defaultWealthAccountId(cat, wealthAccounts));
    setValue("card_account_id", "");
    setExpensePayment("none");
  }

  function handleExpensePaymentChange(source: ExpensePaymentSource) {
    setExpensePayment(source);
    if (source === "none") {
      setValue("wealth_account_id", "");
      setValue("card_account_id", "");
    } else if (source === "wealth") {
      setValue("card_account_id", "");
      if (!watchedAccountId) {
        setValue("wealth_account_id", defaultWealthAccountId(selectedCategory, wealthAccounts));
      }
    } else {
      setValue("wealth_account_id", "");
      if (!watchedCardId && creditCards[0]) {
        setValue("card_account_id", creditCards[0].id);
      }
    }
  }

  return (
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
        className="bg-background border-border/60 fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col rounded-t-2xl border shadow-2xl md:inset-x-auto md:top-0 md:right-0 md:bottom-0 md:max-h-none md:w-full md:max-w-md md:rounded-none md:rounded-l-2xl md:border-l"
      >
        <div className="border-border/60 flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4">
          <div>
            <h2 className="text-foreground font-heading text-base font-semibold">Add entry</h2>
            <p className="text-muted-foreground text-xs">
              {currency}
              {syncsAccount || syncsCard
                ? ` · updates budget${syncsAccount ? ", account" : ""}${syncsCard ? ", card" : ""}`
                : " · budget only"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground shrink-0 p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit((data) => {
            const category = categories.find((c) => c.id === data.category_id);
            if (!category) return;
            const { wealth_account_id: accountId, card_account_id: cardId, ...rest } = data;
            onSubmit({
              ...rest,
              category,
              wealth_account_id: accountId?.trim() || null,
              card_account_id: cardId?.trim() || null,
            });
          })}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {typeStyle && entryType && (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium",
                  typeStyle.className
                )}
              >
                <typeStyle.Icon className="h-3.5 w-3.5 shrink-0" />
                {typeStyle.label}
                {watchedAmount && Number(watchedAmount) > 0 && (
                  <span className="ml-auto tabular-nums opacity-90">
                    {formatCurrency(Number(watchedAmount), currency)}
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-xs font-medium">Category</label>
              <select
                value={watchedCategoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className={cn(inputClass, errors.category_id && "border-rose-500/50")}
              >
                {groupOrder.map((groupKey) => {
                  const cats = grouped[groupKey];
                  if (cats.length === 0) return null;
                  return (
                    <optgroup key={groupKey} label={BUDGET_GROUP_LABELS[groupKey]}>
                      {cats.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              {errors.category_id && (
                <p className="text-xs text-rose-400">{errors.category_id.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-xs font-medium">Amount ({currency})</label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register("amount")}
                className={cn(inputClass, errors.amount && "border-rose-500/50")}
                placeholder="0.00"
              />
              {errors.amount && <p className="text-xs text-rose-400">{errors.amount.message}</p>}
            </div>

            {exclusivePayment ? (
              <div className="border-border/60 space-y-3 rounded-xl border p-3">
                <label className="text-foreground text-xs font-medium">
                  How did you pay?
                  <span className="text-muted-foreground font-normal"> · optional</span>
                </label>
                <div className="flex flex-col gap-2">
                  {(
                    [
                      { value: "none", label: "Budget only — don't sync balances" },
                      { value: "wealth", label: "Bank / cash account" },
                      { value: "card", label: "Credit card" },
                    ] as const
                  ).map(({ value, label }) => (
                    <label
                      key={value}
                      className={cn(
                        "border-border/60 flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs",
                        expensePayment === value && "border-primary/40 bg-primary/5"
                      )}
                    >
                      <input
                        type="radio"
                        name="expense_payment"
                        checked={expensePayment === value}
                        onChange={() => handleExpensePaymentChange(value)}
                        className="accent-primary"
                      />
                      {label}
                    </label>
                  ))}
                </div>

                {expensePayment === "wealth" && (
                  <>
                    {wealthAccounts.length === 0 ? (
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        No {currency} wealth accounts yet. Add one under Wealth accounts first.
                      </p>
                    ) : (
                      <select {...register("wealth_account_id")} className={inputClass}>
                        {wealthAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                            {account.institution ? ` · ${account.institution}` : ""} (
                            {WEALTH_ACCOUNT_KIND_LABELS[account.account_kind]})
                          </option>
                        ))}
                      </select>
                    )}
                    {selectedAccount && (
                      <p className="text-muted-foreground text-[10px] leading-relaxed">
                        Deducts {formatCurrency(Number(watchedAmount) || 0, currency)} from{" "}
                        {selectedAccount.name}.
                      </p>
                    )}
                  </>
                )}

                {expensePayment === "card" && (
                  <>
                    {creditCards.length === 0 ? (
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        No {currency} credit cards yet. Add one on the Cards page first.
                      </p>
                    ) : (
                      <select {...register("card_account_id")} className={inputClass}>
                        {creditCards.map((card) => (
                          <option key={card.id} value={card.id}>
                            {card.name}
                            {card.issuer ? ` · ${card.issuer}` : ""}
                            {card.last_four ? ` ···${card.last_four}` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                    {selectedCard && (
                      <p className="text-muted-foreground text-[10px] leading-relaxed">
                        Adds {formatCurrency(Number(watchedAmount) || 0, currency)} to{" "}
                        {selectedCard.name} balance owed.
                      </p>
                    )}
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="border-border/60 space-y-2 rounded-xl border p-3">
                  <label className="text-foreground text-xs font-medium">
                    {entryType ? wealthAccountFieldLabel(entryType) : "Wealth account"}
                    <span className="text-muted-foreground font-normal"> · optional</span>
                  </label>

                  {wealthAccounts.length === 0 ? (
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      No {currency} wealth accounts yet. Add one under Wealth accounts to sync
                      balances when you log entries.
                    </p>
                  ) : (
                    <>
                      <select {...register("wealth_account_id")} className={inputClass}>
                        <option value="">Budget only — don&apos;t update an account</option>
                        {wealthAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                            {account.institution ? ` · ${account.institution}` : ""} (
                            {WEALTH_ACCOUNT_KIND_LABELS[account.account_kind]})
                          </option>
                        ))}
                      </select>
                      {selectedAccount && entryType && (
                        <p className="text-muted-foreground text-[10px] leading-relaxed">
                          {entryType === "income" && (
                            <>
                              Adds {formatCurrency(Number(watchedAmount) || 0, currency)} to{" "}
                              {selectedAccount.name}.
                            </>
                          )}
                          {entryType === "allocation" && (
                            <>
                              Records a contribution of{" "}
                              {formatCurrency(Number(watchedAmount) || 0, currency)} to{" "}
                              {selectedAccount.name}.
                            </>
                          )}
                          {entryType === "transfer" && (
                            <>
                              Deducts {formatCurrency(Number(watchedAmount) || 0, currency)} from{" "}
                              {selectedAccount.name} for this payment.
                            </>
                          )}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {showCardSection && (
                  <div className="border-border/60 space-y-2 rounded-xl border p-3">
                    <label className="text-foreground flex items-center gap-1.5 text-xs font-medium">
                      <CreditCard className="h-3.5 w-3.5" />
                      {entryType ? cardAccountFieldLabel(entryType) : "Card"}
                      <span className="text-muted-foreground font-normal"> · optional</span>
                    </label>

                    {creditCards.length === 0 ? (
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        No {currency} credit cards yet. Add one on the Cards page to pay down
                        balances from transfers.
                      </p>
                    ) : (
                      <>
                        <select {...register("card_account_id")} className={inputClass}>
                          <option value="">Don&apos;t update a card</option>
                          {creditCards.map((card) => (
                            <option key={card.id} value={card.id}>
                              {card.name}
                              {card.issuer ? ` · ${card.issuer}` : ""}
                              {card.last_four ? ` ···${card.last_four}` : ""} (
                              {CARD_KIND_LABELS[card.card_kind]})
                            </option>
                          ))}
                        </select>
                        {selectedCard && entryType === "transfer" && (
                          <p className="text-muted-foreground text-[10px] leading-relaxed">
                            Reduces {formatCurrency(Number(watchedAmount) || 0, currency)} owed on{" "}
                            {selectedCard.name}.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-xs font-medium">Date</label>
              <input
                type="date"
                {...register("entry_date")}
                className={cn(inputClass, errors.entry_date && "border-rose-500/50")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-xs font-medium">Description (optional)</label>
              <input
                type="text"
                {...register("description")}
                className={inputClass}
                placeholder="e.g. Grocery run, salary deposit"
              />
            </div>
          </div>

          <div className="border-border/60 flex shrink-0 gap-3 border-t px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="border-border/60 text-muted-foreground hover:text-foreground flex-1 rounded-lg border py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="bg-primary text-primary-foreground flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save entry
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}

// ── Edit target drawer ───────────────────────────────────────────────────────

interface EditBudgetTargetDrawerProps {
  open: boolean;
  onClose: () => void;
  categoryName: string;
  currency: string;
  currentTarget: number;
  isPending: boolean;
  onSubmit: (amountLimit: number) => void;
}

export function EditBudgetTargetDrawer({
  open,
  onClose,
  categoryName,
  currency,
  currentTarget,
  isPending,
  onSubmit,
}: EditBudgetTargetDrawerProps) {
  type TargetFormData = { amount_limit: number };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TargetFormData>({
    resolver: zodResolver(
      z.object({
        amount_limit: z.coerce.number({ message: "Enter amount" }).min(0),
      })
    ) as Resolver<TargetFormData>,
    defaultValues: { amount_limit: currentTarget },
  });

  useEffect(() => {
    if (open) reset({ amount_limit: currentTarget });
  }, [open, currentTarget, reset]);

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
            className="bg-background border-border/60 fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border p-5 shadow-2xl md:inset-x-auto md:top-auto md:right-6 md:bottom-6 md:w-96 md:rounded-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-foreground font-heading text-base font-semibold">Set target</h2>
              <button type="button" onClick={onClose} className="text-muted-foreground p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-muted-foreground mb-4 text-sm">{categoryName}</p>
            <form
              onSubmit={handleSubmit((data) => onSubmit(data.amount_limit))}
              className="space-y-4"
            >
              <div>
                <label className="text-foreground mb-1.5 block text-xs font-medium">
                  Monthly target ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("amount_limit")}
                  className={cn(inputClass, errors.amount_limit && "border-rose-500/50")}
                />
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="bg-primary text-primary-foreground flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium disabled:opacity-50"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save target
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
