import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Coins, CreditCard, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { cardVariants } from "@/lib/animations";
import { formatCurrency } from "@/lib/formatCurrency";
import { getDefaultCurrency } from "@/lib/countries";
import { useAuth } from "@/hooks/useAuth";
import { useCardCurrencies, useCardCurrencyMutations } from "@/hooks/useCardCurrencies";
import { useCardAccounts } from "@/hooks/useCardAccounts";
import { useCardMutations } from "@/hooks/useCardMutations";
import { CardAccountsPanel } from "@/components/cards/CardAccountsPanel";
import { ManageCardCurrenciesDrawer } from "@/components/cards/ManageCardCurrenciesDrawer";
import {
  AddCardDrawer,
  EditCardDrawer,
  UpdateCardBalanceDrawer,
} from "@/components/cards/CardDrawers";
import { RefreshButton } from "@/components/ui/refresh-button";
import type { CurrencyType } from "@/types/enums";

export default function CardsPage() {
  const { profile } = useAuth();
  const defaultCurrency = (
    profile?.region ? getDefaultCurrency(profile.region) : "AED"
  ) as CurrencyType;

  const [currency, setCurrency] = useState<CurrencyType>(defaultCurrency);
  const [addOpen, setAddOpen] = useState(false);
  const [currenciesOpen, setCurrenciesOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [balanceCardId, setBalanceCardId] = useState<string | null>(null);

  const { data: cardCurrencyRows = [], isLoading: currenciesLoading } = useCardCurrencies(
    profile?.id,
    profile?.region
  );
  const cardCurrencies = useMemo(
    () => cardCurrencyRows.map((r) => r.currency as CurrencyType),
    [cardCurrencyRows]
  );
  const { addCurrency, removeCurrency } = useCardCurrencyMutations(profile?.id);

  const resolvedCurrency = useMemo((): CurrencyType => {
    if (cardCurrencies.length === 0) return currency;
    if (cardCurrencies.includes(currency)) return currency;
    return cardCurrencies.includes(defaultCurrency) ? defaultCurrency : cardCurrencies[0];
  }, [cardCurrencies, currency, defaultCurrency]);

  const { data: cards = [], isFetching, refetch, error } = useCardAccounts(resolvedCurrency);
  const { createCard, updateCard, updateBalance, deleteCard } = useCardMutations(
    resolvedCurrency,
    profile?.id
  );

  const editCard = editId ? cards.find((c) => c.id === editId) : undefined;
  const balanceCard = balanceCardId ? cards.find((c) => c.id === balanceCardId) : undefined;

  const totalOwed = cards.reduce((s, c) => s + Number(c.outstanding_balance), 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <CreditCard className="text-primary h-5 w-5" />
            <h1 className="text-foreground font-heading text-xl font-semibold">Cards</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Credit & debit cards — what you owe, not what you own
          </p>
        </div>
        <RefreshButton onRefresh={() => void refetch()} isRefetching={isFetching} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {currenciesLoading ? (
          <div className="bg-muted h-8 w-24 animate-pulse rounded-full" />
        ) : (
          cardCurrencies.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                resolvedCurrency === c
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              )}
            >
              {c}
            </button>
          ))
        )}
        <button
          type="button"
          onClick={() => setCurrenciesOpen(true)}
          className="border-border/60 text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium"
          title="Manage card currencies"
        >
          <Coins className="h-3.5 w-3.5" />
          Currencies
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          <p className="font-medium">Could not load cards</p>
          <p className="mt-1 text-xs opacity-90">
            {(error as Error).message.includes("card_accounts") ||
            (error as Error).message.includes("card_currencies")
              ? "Run migrations 019_card_accounts.sql and 020_card_currencies.sql in Supabase, then refresh."
              : (error as Error).message}
          </p>
        </div>
      )}

      {!error && cards.length > 0 && (
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="border-border/60 bg-card rounded-xl border p-4"
        >
          <p className="text-muted-foreground text-xs">Total owed · {resolvedCurrency}</p>
          <p className="text-2xl font-semibold text-rose-400 tabular-nums">
            {formatCurrency(totalOwed, resolvedCurrency)}
          </p>
        </motion.div>
      )}

      <CardAccountsPanel
        cards={cards}
        currency={resolvedCurrency}
        onAdd={() => setAddOpen(true)}
        onEdit={(id) => setEditId(id)}
        onUpdateBalance={(id) => setBalanceCardId(id)}
      />

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="bg-primary text-primary-foreground fixed right-6 bottom-20 z-30 flex h-14 w-14 items-center justify-center rounded-full shadow-lg md:bottom-8"
        aria-label="Add card"
      >
        <Plus className="h-6 w-6" />
      </button>

      <AddCardDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        currency={resolvedCurrency}
        isPending={createCard.isPending}
        onSubmit={async (input) => {
          await createCard.mutateAsync({
            ...input,
            region:
              resolvedCurrency === "PHP"
                ? "PH"
                : resolvedCurrency === "AED"
                  ? "AE"
                  : profile?.region,
          });
        }}
      />

      {editCard && (
        <EditCardDrawer
          open={Boolean(editId)}
          onClose={() => setEditId(null)}
          currency={resolvedCurrency}
          card={editCard}
          isPending={updateCard.isPending}
          isDeleting={deleteCard.isPending}
          onSave={async (input) => {
            await updateCard.mutateAsync({ cardId: editCard.id, ...input });
          }}
          onDelete={async () => {
            await deleteCard.mutateAsync(editCard.id);
          }}
        />
      )}

      {balanceCard && (
        <UpdateCardBalanceDrawer
          open={Boolean(balanceCardId)}
          onClose={() => setBalanceCardId(null)}
          cardName={balanceCard.name}
          currency={resolvedCurrency}
          currentBalance={Number(balanceCard.outstanding_balance)}
          isPending={updateBalance.isPending}
          onSubmit={async (balance) => {
            await updateBalance.mutateAsync({ cardId: balanceCard.id, balance });
          }}
        />
      )}

      <ManageCardCurrenciesDrawer
        open={currenciesOpen}
        onClose={() => setCurrenciesOpen(false)}
        currencies={cardCurrencyRows}
        activeCurrency={resolvedCurrency}
        isAdding={addCurrency.isPending}
        isRemoving={removeCurrency.isPending}
        onAdd={async (code) => {
          await addCurrency.mutateAsync(code);
        }}
        onRemove={async (code) => {
          await removeCurrency.mutateAsync(code);
          if (code === resolvedCurrency && cardCurrencies.length > 1) {
            const next = cardCurrencies.find((c) => c !== code);
            if (next) setCurrency(next);
          }
        }}
      />
    </div>
  );
}
