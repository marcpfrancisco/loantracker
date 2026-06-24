import type { LoanType } from "@/types/enums";
import { FALLBACK_LOAN_TYPE, getLoanTypeConfig } from "@/types/schema";

export function getLoanTypeLabel(sourceName: string, loanType: LoanType): string {
  return getLoanTypeConfig(sourceName, loanType)?.label ?? FALLBACK_LOAN_TYPE.label;
}

/** e.g. "Shopee: SLoan", "Shopee: SPayLater", "Tabby: Tabby" */
export function getLoanDisplayLabel(sourceName: string, loanType: LoanType): string {
  return `${sourceName}: ${getLoanTypeLabel(sourceName, loanType)}`;
}
