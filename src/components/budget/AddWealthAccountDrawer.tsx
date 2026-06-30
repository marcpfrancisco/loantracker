import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WealthAccountKind } from "@/types/budget";
import { WEALTH_ACCOUNT_KIND_LABELS, WEALTH_ACCOUNT_KIND_OPTIONS } from "@/types/budget";

const inputClass =
  "border-border/60 bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30";

function isInvestmentKind(kind: WealthAccountKind): boolean {
  return ["mp2", "uitf", "reit", "bond", "stocks"].includes(kind);
}

export interface WealthAccountFormInput {
  name: string;
  account_kind: WealthAccountKind;
  institution?: string;
  openingCash?: number;
  openingMarketValue?: number | null;
}

interface AddWealthAccountDrawerProps {
  open: boolean;
  onClose: () => void;
  currency: string;
  isPending: boolean;
  onSubmit: (input: WealthAccountFormInput) => Promise<void>;
}

export function AddWealthAccountDrawer(props: AddWealthAccountDrawerProps) {
  return (
    <AnimatePresence>{props.open && <AddWealthAccountDrawerContent {...props} />}</AnimatePresence>
  );
}

function AddWealthAccountDrawerContent({
  onClose,
  currency,
  isPending,
  onSubmit,
}: AddWealthAccountDrawerProps) {
  const [name, setName] = useState("");
  const [accountKind, setAccountKind] = useState<WealthAccountKind>("savings");
  const [institution, setInstitution] = useState("");
  const [openingCash, setOpeningCash] = useState("");
  const [openingMarket, setOpeningMarket] = useState("");

  const showMarket = isInvestmentKind(accountKind);

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
        className="bg-background border-border/60 fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col rounded-t-2xl border shadow-2xl md:inset-x-auto md:top-0 md:right-0 md:bottom-0 md:max-h-none md:w-full md:max-w-md md:rounded-none md:rounded-l-2xl md:border-l"
      >
        <div className="border-border/60 flex shrink-0 items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-foreground font-heading text-base font-semibold">
              Add wealth account
            </h2>
            <p className="text-muted-foreground text-xs">
              {currency} · e.g. Mashreq Neo, GCash, MP2
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            void onSubmit({
              name: name.trim(),
              account_kind: accountKind,
              institution: institution.trim() || undefined,
              openingCash: openingCash.trim() === "" ? undefined : Number(openingCash) || 0,
              openingMarketValue: openingMarket.trim() === "" ? null : Number(openingMarket) || 0,
            }).then(() => onClose());
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-xs font-medium">Account name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="Mashreq Neo Savings, Cash, GCash…"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-xs font-medium">Type</label>
              <select
                value={accountKind}
                onChange={(e) => setAccountKind(e.target.value as WealthAccountKind)}
                className={inputClass}
              >
                {WEALTH_ACCOUNT_KIND_OPTIONS.map((kind) => (
                  <option key={kind} value={kind}>
                    {WEALTH_ACCOUNT_KIND_LABELS[kind]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-xs font-medium">
                Bank / provider (optional)
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className={inputClass}
                placeholder="Mashreq, Maribank, Pag-IBIG…"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-xs font-medium">
                Current balance ({currency}) — optional
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                className={inputClass}
                placeholder="Set now or later"
              />
              <p className="text-muted-foreground text-[10px]">
                Opening balance is not counted as monthly income.
              </p>
            </div>

            {showMarket && (
              <div className="flex flex-col gap-1.5">
                <label className="text-foreground text-xs font-medium">
                  Market value ({currency}) — optional
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingMarket}
                  onChange={(e) => setOpeningMarket(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
          </div>

          <div className="border-border/60 flex shrink-0 gap-3 border-t px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="border-border/60 text-muted-foreground flex-1 rounded-lg border py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className={cn(
                "bg-primary text-primary-foreground flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium disabled:opacity-50"
              )}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add account
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}

interface EditWealthAccountDrawerProps {
  open: boolean;
  onClose: () => void;
  currency: string;
  accountName: string;
  institution: string | null;
  isPending: boolean;
  isDeleting: boolean;
  onSave: (input: { name: string; institution: string | null }) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function EditWealthAccountDrawer({
  open,
  onClose,
  currency,
  accountName,
  institution,
  isPending,
  isDeleting,
  onSave,
  onDelete,
}: EditWealthAccountDrawerProps) {
  const [name, setName] = useState(accountName);
  const [inst, setInst] = useState(institution ?? "");

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
            className="bg-background border-border/60 fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border p-5 shadow-2xl md:inset-x-auto md:right-6 md:bottom-6 md:w-96 md:rounded-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-foreground font-heading text-base font-semibold">Edit account</h2>
              <button type="button" onClick={onClose} className="text-muted-foreground p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void onSave({ name: name.trim(), institution: inst.trim() || null }).then(() =>
                  onClose()
                );
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-foreground mb-1.5 block text-xs font-medium">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="text-foreground mb-1.5 block text-xs font-medium">
                  Bank / provider
                </label>
                <input
                  type="text"
                  value={inst}
                  onChange={(e) => setInst(e.target.value)}
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={isPending || !name.trim()}
                className="bg-primary text-primary-foreground flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium disabled:opacity-50"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </button>
            </form>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => void onDelete().then(() => onClose())}
              className="mt-4 flex w-full items-center justify-center gap-2 py-2 text-sm text-rose-400 hover:text-rose-300 disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Remove account
            </button>
            <p className="text-muted-foreground mt-1 text-center text-[10px]">
              {currency} · Cannot remove if linked to budget categories with entries
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
