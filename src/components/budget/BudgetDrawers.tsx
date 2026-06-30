import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Resolver } from "react-hook-form";
import { cn } from "@/lib/utils";
import type { BudgetCategory } from "@/types/budget";
import { BUDGET_GROUP_LABELS } from "@/types/budget";
import { getActiveGroupOrder, groupCategoriesByKey } from "@/lib/budgetRules";

const schema = z.object({
  category_id: z.string().min(1, "Select a category"),
  amount: z.coerce.number({ message: "Enter amount" }).positive("Must be positive"),
  entry_date: z.string().min(1, "Select a date"),
  description: z.string().optional(),
});

type FormData = {
  category_id: string;
  amount: number;
  entry_date: string;
  description?: string;
};

interface AddBudgetEntryDrawerProps {
  open: boolean;
  onClose: () => void;
  categories: BudgetCategory[];
  defaultCategoryId?: string;
  isPending: boolean;
  onSubmit: (data: FormData & { category: BudgetCategory }) => void;
}

const inputClass =
  "border-border/60 bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30";

export function AddBudgetEntryDrawer({
  open,
  onClose,
  categories,
  defaultCategoryId,
  isPending,
  onSubmit,
}: AddBudgetEntryDrawerProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: {
      category_id: defaultCategoryId ?? "",
      amount: undefined,
      entry_date: new Date().toISOString().slice(0, 10),
      description: "",
    },
  });

  const watchedCategoryId = watch("category_id");
  const selectedCategory = categories.find((c) => c.id === watchedCategoryId);

  useEffect(() => {
    if (open) {
      reset({
        category_id: defaultCategoryId ?? categories[0]?.id ?? "",
        amount: undefined,
        entry_date: new Date().toISOString().slice(0, 10),
        description: "",
      });
    }
  }, [open, defaultCategoryId, categories, reset]);

  const grouped = groupCategoriesByKey(categories);
  const groupOrder = getActiveGroupOrder(categories);

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
            className="bg-background border-border/60 fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col rounded-t-2xl border shadow-2xl md:inset-x-auto md:top-0 md:right-0 md:bottom-0 md:max-h-none md:w-full md:max-w-md md:rounded-none md:rounded-l-2xl md:border-l"
          >
            <div className="border-border/60 flex shrink-0 items-center justify-between border-b px-5 py-4">
              <h2 className="text-foreground font-heading text-base font-semibold">Add entry</h2>
              <button
                type="button"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground rounded-lg p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit((data) => {
                const category = categories.find((c) => c.id === data.category_id);
                if (!category) return;
                onSubmit({ ...data, category });
              })}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-foreground text-xs font-medium">Category</label>
                  <select
                    {...register("category_id")}
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
                  {selectedCategory && (
                    <p className="text-muted-foreground text-xs">
                      Type: {selectedCategory.entry_type_hint}
                      {selectedCategory.wealth_account_id && " · links to wealth account"}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-foreground text-xs font-medium">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("amount")}
                    className={cn(inputClass, errors.amount && "border-rose-500/50")}
                    placeholder="0.00"
                  />
                  {errors.amount && (
                    <p className="text-xs text-rose-400">{errors.amount.message}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-foreground text-xs font-medium">Date</label>
                  <input
                    type="date"
                    {...register("entry_date")}
                    className={cn(inputClass, errors.entry_date && "border-rose-500/50")}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-foreground text-xs font-medium">
                    Description (optional)
                  </label>
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
                  Save
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

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
