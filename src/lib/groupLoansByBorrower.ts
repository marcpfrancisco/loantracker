import type { LoanListItem } from "@/hooks/useLoans";

export interface BorrowerGroup {
  id: string;
  name: string;
  loans: LoanListItem[];
}

export function isLoanOverdue(loan: LoanListItem): boolean {
  return (
    loan.status === "active" &&
    loan.nextDueDate !== null &&
    new Date(loan.nextDueDate + "T00:00:00") < new Date(new Date().toDateString())
  );
}

export function groupLoansByBorrower(loans: LoanListItem[]): BorrowerGroup[] {
  const map = new Map<string, BorrowerGroup>();

  for (const loan of loans) {
    const id = loan.borrower?.id ?? "__unknown";
    const name = loan.borrower?.full_name ?? "Unknown Borrower";
    if (!map.has(id)) map.set(id, { id, name, loans: [] });
    map.get(id)!.loans.push(loan);
  }

  return [...map.values()].sort((a, b) => {
    const aOverdue = a.loans.some(isLoanOverdue);
    const bOverdue = b.loans.some(isLoanOverdue);
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
