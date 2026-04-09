# System Architecture

## 1. Multi-Region Data Isolation

The app uses a "Shared Database, Isolated Rows" pattern.

- **PHP Context:** Handles 5-6 digit numbers, 0 decimal places usually (or 2 for precise interest).
- **AED Context:** Handles 3-5 digit numbers, 2 decimal places.

## 2. The Data Flow

1. **Supabase Auth:** Users log in. JWT contains the `uid`.
2. **Postgres RLS:** Automatically restricts `SELECT/UPDATE/DELETE` to the `borrower_id`.
3. **React Query / Custom Hooks:** All data fetching is centralized in `src/hooks/useLoans.ts`.
4. **Offline Sync:** Service Workers cache the `/loans` API response for offline viewing.

## 3. Financial Ledger Logic

- **Ledger Table:** We use a double-entry inspired ledger. Every loan is a "Debit" to the borrower, every payment is a "Credit."
- **Verification Loop:** Payments remain `status: pending` until the Admin (Person 1) approves the receipt upload.

## 4. UI & Logic Patterns

- **Hybrid Input Flow:** The Loan Creation form uses "Templates" (Tabby, SLoan, etc.) to pre-fill fields like interest and installment counts, but MUST allow manual overrides for every field before saving.
- **Role-Based Views:** - **Owner (Admin):** Global dashboard, multi-currency toggles, verification queue, and all borrower data.
  - **Borrower (Client):** Isolated view of their own debt, payment timeline, and receipt upload.
- **Data Persistence:** Store final calculated values (Fixed Amounts) in the database, not the formulas, to ensure an immutable audit trail.
