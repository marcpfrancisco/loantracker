import { Link } from "react-router";
import { motion } from "framer-motion";
import { ChevronRight, CreditCard, Receipt, Wallet } from "lucide-react";
import { cardVariants } from "@/lib/animations";
import { cn } from "@/lib/utils";

const financeModules = [
  {
    to: "/budget",
    icon: Wallet,
    title: "Budget",
    description: "Monthly plan, categories, wealth accounts & cash flow",
    accent: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    to: "/cards",
    icon: CreditCard,
    title: "Cards",
    description: "Credit & debit cards — track balances and limits",
    accent: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  },
  {
    to: "/tabs",
    icon: Receipt,
    title: "Expense tabs",
    description: "Shared expense tracking with borrowers",
    accent: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  },
] as const;

export default function FinanceHubPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-foreground font-heading text-xl font-semibold">Personal finance</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Budget, cards, and expense tabs in one place
        </p>
      </div>

      <div className="space-y-3">
        {financeModules.map((item) => (
          <motion.div key={item.to} variants={cardVariants} initial="hidden" animate="visible">
            <Link
              to={item.to}
              className="border-border/60 bg-card hover:border-primary/30 group flex items-center gap-4 rounded-xl border p-4 transition-colors"
            >
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
                  item.accent
                )}
              >
                <item.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-foreground font-medium">{item.title}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">{item.description}</p>
              </div>
              <ChevronRight className="text-muted-foreground group-hover:text-primary h-5 w-5 shrink-0 transition-colors" />
            </Link>
          </motion.div>
        ))}
      </div>

      <p className="text-muted-foreground text-center text-[10px] leading-relaxed">
        Assets (savings, cash, e-wallets) live under Budget → Wealth accounts. Cards track what you
        owe separately.
      </p>
    </div>
  );
}
