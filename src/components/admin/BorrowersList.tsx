import { useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Users, ChevronDown, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BorrowerSummary } from "@/hooks/useAdminBorrowers";
import { LoanStatementDrawer } from "./LoanStatementDrawer";
import { RegionBadge } from "@/components/ui/region-badge";

interface BorrowersListProps {
  borrowers: BorrowerSummary[];
  loading?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="bg-muted h-3.5 w-32 animate-pulse rounded" />
        <div className="bg-muted h-3 w-20 animate-pulse rounded" />
      </div>
      <div className="bg-muted h-3.5 w-12 animate-pulse rounded" />
    </div>
  );
}

export function BorrowersList({ borrowers, loading }: BorrowersListProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [statementBorrowerId, setStatementBorrowerId] = useState<string | null>(null);
  const [statementBorrowerName, setStatementBorrowerName] = useState("");

  return (
    <>
      <div className="bg-card border-border/60 overflow-hidden rounded-xl border">
        {/* Header — click to collapse */}
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="border-border/60 hover:bg-muted/30 flex w-full cursor-pointer items-center gap-2.5 border-b px-4 py-3.5 transition-colors"
        >
          <Users className="text-muted-foreground h-4 w-4 shrink-0" />
          <h2 className="text-foreground flex-1 text-left text-sm font-semibold">Borrowers</h2>

          {!loading && borrowers.length > 0 && (
            <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
              {borrowers.length}
            </span>
          )}

          <ChevronDown
            className={cn(
              "text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-200",
              isOpen ? "rotate-0" : "-rotate-90"
            )}
          />
        </button>

        {/* Collapsible body */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: "hidden" }}
            >
              {loading ? (
                <div className="divide-border/40 divide-y">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}
                </div>
              ) : borrowers.length === 0 ? (
                <div className="text-muted-foreground px-4 py-10 text-center text-sm">
                  No borrowers yet.
                </div>
              ) : (
                <div className="divide-border/40 divide-y">
                  {borrowers.map((b) => {
                    const isClickable = b.isConfirmed;
                    const tooltipLabel = !b.isConfirmed ? "Pending invitation" : undefined;

                    return (
                      <div
                        key={b.id}
                        className={cn(
                          "flex items-center gap-2 py-3 pr-3 pl-4",
                          !isClickable && "opacity-60"
                        )}
                        title={tooltipLabel}
                      >
                        {/* Main clickable area: avatar + name/region */}
                        <button
                          onClick={() => isClickable && void navigate(`/borrowers/${b.id}`)}
                          disabled={!isClickable}
                          className={cn(
                            "flex min-w-0 flex-1 items-center gap-3 text-left transition-colors",
                            isClickable ? "cursor-pointer" : "cursor-not-allowed"
                          )}
                        >
                          {/* Avatar */}
                          <div className="bg-primary/15 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                            {getInitials(b.full_name)}
                          </div>

                          {/* Name + region */}
                          <div className="min-w-0 flex-1">
                            <p className="text-foreground truncate text-sm font-medium">
                              {b.full_name}
                            </p>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <RegionBadge region={b.region} />
                              <span className="text-muted-foreground text-xs">
                                {new Date(b.created_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                        </button>

                        {/* Right column: status + statement button stacked */}
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          {!b.isConfirmed ? (
                            <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                              Pending
                            </span>
                          ) : (
                            <>
                              <div className="flex flex-col items-end gap-0.5">
                                {b.activeLoans > 0 && (
                                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                                    {b.activeLoans} active
                                  </span>
                                )}
                                <span className="text-muted-foreground text-xs">
                                  {b.totalLoans} loan{b.totalLoans !== 1 ? "s" : ""}
                                </span>
                              </div>

                              {b.totalLoans > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStatementBorrowerId(b.id);
                                    setStatementBorrowerName(b.full_name);
                                  }}
                                  className="border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary flex cursor-pointer items-center gap-1 rounded-md border px-2 py-0.5 text-xs transition-colors"
                                >
                                  <FileText className="h-3 w-3" />
                                  Statement
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed summary pill */}
        {!isOpen && !loading && borrowers.length > 0 && (
          <div className="px-4 py-2.5">
            <p className="text-muted-foreground text-xs">
              {borrowers.length} borrower{borrowers.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      <LoanStatementDrawer
        borrowerId={statementBorrowerId}
        borrowerName={statementBorrowerName}
        onClose={() => setStatementBorrowerId(null)}
      />
    </>
  );
}
