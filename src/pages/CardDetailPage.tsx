import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, CreditCard, Pencil, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatCurrency";
import { useAuth } from "@/hooks/useAuth";
import { useCardAccount, useCardStatements, useCardTransactions } from "@/hooks/useCardDetail";
import { useCardLedgerMutations } from "@/hooks/useCardLedgerMutations";
import { CardStatementsPanel } from "@/components/cards/CardStatementsPanel";
import { CardTransactionList } from "@/components/cards/CardTransactionList";
import {
  AddCardTransactionDrawer,
  UpdateCardBalanceDrawer,
} from "@/components/cards/CardTransactionDrawers";
import { EditCardDrawer } from "@/components/cards/CardDrawers";
import { AddLoanDrawer } from "@/components/loans/AddLoanDrawer";
import { useCardMutations } from "@/hooks/useCardMutations";
import { RefreshButton } from "@/components/ui/refresh-button";
import { CARD_KIND_LABELS } from "@/types/cards";
import type { CardLoanConversionPrefill, CardTransaction } from "@/types/cards";
import type { CurrencyType } from "@/types/enums";

export default function CardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [addTxnOpen, setAddTxnOpen] = useState(false);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [convertPrefill, setConvertPrefill] = useState<CardLoanConversionPrefill | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);

  const isAdmin = profile?.role === "admin";

  const {
    data: card,
    isLoading: cardLoading,
    isFetching,
    refetch,
    error: cardError,
  } = useCardAccount(id);

  const { data: transactions = [], refetch: refetchTxns } = useCardTransactions(id);
  const { data: statements = [], refetch: refetchStmts } = useCardStatements(id);

  const currency = (card?.currency ?? "AED") as CurrencyType;

  const {
    addTransaction,
    deleteTransaction,
    setBalance,
    createStatement,
    markStatementPaid,
    deleteStatement,
  } = useCardLedgerMutations(id ?? "", currency, profile?.id);

  const { updateCard, deleteCard } = useCardMutations(currency, profile?.id);

  const refreshAll = () => {
    void refetch();
    void refetchTxns();
    void refetchStmts();
  };

  function handleConvertTransaction(txn: CardTransaction) {
    if (!card) return;
    setConvertPrefill({
      cardTransactionId: txn.id,
      cardAccountId: card.id,
      cardName: card.name,
      amount: Number(txn.amount),
      txnDate: txn.txn_date,
      merchant: txn.merchant,
      description: txn.description,
      currency: card.currency as CurrencyType,
      region:
        card.region ?? (card.currency === "PHP" ? "PH" : card.currency === "AED" ? "AE" : "AE"),
      statementDay: card.statement_day,
      issuer: card.issuer,
    });
    setConvertOpen(true);
  }

  if (cardLoading) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="bg-muted h-8 w-48 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (cardError || !card) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <Link
          to="/cards"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to cards
        </Link>
        <p className="text-sm text-rose-400">Card not found or could not be loaded.</p>
      </div>
    );
  }

  const owed = Number(card.outstanding_balance);
  const limit = card.credit_limit != null ? Number(card.credit_limit) : null;
  const utilization = limit && limit > 0 ? Math.min(100, Math.round((owed / limit) * 100)) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 pb-24">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            to="/cards"
            className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Cards
          </Link>
          <div className="flex items-center gap-2">
            <CreditCard className="text-primary h-5 w-5" />
            <h1 className="text-foreground font-heading text-xl font-semibold">{card.name}</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {card.issuer ? `${card.issuer} · ` : ""}
            {CARD_KIND_LABELS[card.card_kind]}
            {card.last_four ? ` · •••• ${card.last_four}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="text-muted-foreground hover:text-foreground rounded-lg p-2"
            aria-label="Edit card"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <RefreshButton onRefresh={refreshAll} isRefetching={isFetching} />
        </div>
      </div>

      <div className="border-border/60 bg-card rounded-xl border p-4">
        <p className="text-muted-foreground text-xs">Balance owed · {currency}</p>
        <p
          className={cn(
            "text-2xl font-semibold tabular-nums",
            owed > 0 ? "text-rose-400" : "text-muted-foreground"
          )}
        >
          {owed > 0 ? formatCurrency(owed, currency) : "Paid off"}
        </p>
        {utilization != null && (
          <div className="mt-3">
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  utilization >= 80 ? "bg-rose-500" : "bg-primary/70"
                )}
                style={{ width: `${utilization}%` }}
              />
            </div>
            <p className="text-muted-foreground mt-1 text-[10px]">
              {utilization}% of {formatCurrency(limit!, currency)} limit
            </p>
          </div>
        )}
        {card.statement_day != null && (
          <p className="text-muted-foreground mt-2 text-xs">Statement day {card.statement_day}</p>
        )}
        <button
          type="button"
          onClick={() => setBalanceOpen(true)}
          className="text-muted-foreground hover:text-primary mt-3 text-xs hover:underline"
        >
          Set balance manually
        </button>
      </div>

      {card.card_kind === "credit" && (
        <CardStatementsPanel
          statements={statements}
          currency={currency}
          isPending={createStatement.isPending}
          isPaying={markStatementPaid.isPending}
          onCreate={async (input) => {
            await createStatement.mutateAsync(input);
          }}
          onMarkPaid={async (statementId, amount) => {
            await markStatementPaid.mutateAsync({ statementId, amount });
          }}
          onDelete={async (statementId) => {
            await deleteStatement.mutateAsync(statementId);
          }}
        />
      )}

      <section className="border-border/60 bg-card rounded-xl border p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-foreground text-sm font-semibold">Transaction history</h2>
            <p className="text-muted-foreground text-xs">
              Ledger-backed balance · budget-linked rows cannot be deleted here
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddTxnOpen(true)}
            className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
        <CardTransactionList
          transactions={transactions}
          currency={currency}
          showConvertActions={isAdmin && card.card_kind === "credit"}
          onConvert={handleConvertTransaction}
          onDelete={(txnId) => deleteTransaction.mutate(txnId)}
          isDeleting={deleteTransaction.isPending}
        />
      </section>

      <button
        type="button"
        onClick={() => setAddTxnOpen(true)}
        className="bg-primary text-primary-foreground fixed right-6 bottom-20 z-30 flex h-14 w-14 items-center justify-center rounded-full shadow-lg md:bottom-8"
        aria-label="Add transaction"
      >
        <Plus className="h-6 w-6" />
      </button>

      <AddCardTransactionDrawer
        open={addTxnOpen}
        onClose={() => setAddTxnOpen(false)}
        currency={currency}
        isPending={addTransaction.isPending}
        onSubmit={async (input) => {
          await addTransaction.mutateAsync(input);
        }}
      />

      <UpdateCardBalanceDrawer
        open={balanceOpen}
        onClose={() => setBalanceOpen(false)}
        cardName={card.name}
        currency={currency}
        currentBalance={owed}
        isPending={setBalance.isPending}
        onSubmit={async (targetBalance) => {
          await setBalance.mutateAsync({
            currentBalance: owed,
            targetBalance,
            description: "Balance adjustment",
          });
        }}
      />

      <EditCardDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        currency={currency}
        card={card}
        isPending={updateCard.isPending}
        isDeleting={deleteCard.isPending}
        onSave={async (input) => {
          await updateCard.mutateAsync({ cardId: card.id, ...input });
        }}
        onDelete={async () => {
          await deleteCard.mutateAsync(card.id);
          navigate("/cards");
        }}
      />

      {isAdmin && (
        <AddLoanDrawer
          open={convertOpen}
          onClose={() => {
            setConvertOpen(false);
            setConvertPrefill(null);
            refreshAll();
          }}
          cardConversion={convertPrefill}
        />
      )}
    </div>
  );
}
