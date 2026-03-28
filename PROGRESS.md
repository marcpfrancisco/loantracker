# Global Loan Tracker — Progress & Roadmap

> Last updated: 2026-03-28

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + Vite, TypeScript (strict) |
| Styling | Tailwind CSS v4, shadcn/ui (Base UI primitives) |
| Animation | Framer Motion (motion.dev) |
| Backend / BaaS | Supabase (Auth, PostgreSQL, RLS, Storage) |
| Deployment | Vercel (PWA via vite-plugin-pwa) |
| Icons | Lucide React |
| Forms | react-hook-form + Zod |
| Data fetching | TanStack Query v5 |

---

## What Has Been Built

### Authentication & Onboarding
- [x] Email/password login with Supabase Auth
- [x] Forgot password flow (email → reset link)
- [x] Reset password page (handles both `recovery` and `invite` token types)
- [x] Admin invites borrowers via email — invite link constructs a direct `/reset-password?token_hash=…&type=invite` URL, bypassing Brevo click tracking and Supabase's internal redirect loop
- [x] Guest-only route guards (`requireGuest`) and auth guards (`requireAuth`, `requireAdmin`)
- [x] Root `/` loader forwards Supabase auth params to `/reset-password` so recovery links that hit the site root don't lose their token

### Layout & Navigation
- [x] Responsive layout: desktop sidebar + mobile top bar + mobile bottom nav
- [x] Animated active-route indicator in sidebar (Framer Motion `layoutId`)
- [x] Dark/light theme toggle (persisted via `ThemeContext`)
- [x] Global loading bar (thin green line at top, synced with all React Query fetches via `useIsFetching()`)
- [x] Scroll-to-top on every route navigation (resets `<main>` scroll container)
- [x] Per-page refresh buttons with spin animation (`RefreshButton` component)
- [x] Navigation items: Dashboard, Loans, Tabs, Admin, Profile

### Dashboard
- [x] Active loan cards with outstanding balance, progress bar, next due date
- [x] Upcoming payments section (next 30 days)
- [x] Admin sees all borrowers' loans; borrower sees only their own
- [x] Skeleton loaders synced with the global loading bar

### Loans Module
- [x] Loan list with region/currency filter, search, and status filter
- [x] Add Loan drawer: credit source selector, loan type config, installment breakdown preview
- [x] Loan detail page: installment table, status badges, loan metadata
- [x] Installment status management (unpaid → pending → paid)
- [x] Payment proof upload (borrower submits receipt; admin reviews/approves/rejects)
- [x] Loan status management: active → completed / defaulted / cancelled
- [x] Multi-currency support: PHP (Philippines) and AED (UAE), never mixed in totals
- [x] Supported loan types: Maribank Credit, S-Loan, G-Loan, SPayLater, LazCredit, Tabby, Credit Card, Custom
- [x] Loan breakdown summary component (shows principal, fees, total repayable)

### Admin Module
- [x] Admin dashboard with stat cards: total borrowers, active loans, total outstanding (PHP + AED split)
- [x] Borrower list — collapsible, shows region flag badge, active/total loans, pending invite chip
- [x] Invite Borrower drawer (sends Supabase auth invite email via Brevo SMTP)
- [x] Borrower Detail page (`/borrowers/:id`): profile card, expense tab shortcut, loans list
- [x] Loan Statement drawer — slides in from the right, per-loan installment breakdown, PHP/AED summary totals
- [x] Export loan statement as **PDF** (browser print window, styled HTML) or **CSV** (flat download)

### Expense Tabs Module
- [x] Database schema: `expense_tabs` → `expense_periods` → `expense_items` + `expense_payments`
  - One tab per borrower (`UNIQUE(borrower_id)`)
  - One period row per month per tab (`UNIQUE(tab_id, period)`)
  - Full RLS: admin has all access; borrower has SELECT-only via JOIN chain
- [x] "Add to Expense Tab" button on Borrower Detail page → Create Tab modal (title + currency)
- [x] Expense Tabs list page (`/tabs`): admin sees all tabs; borrower is redirected straight to their own tab
- [x] Expense Tab Detail page (`/tabs/:id`):
  - Totals card (outstanding / paid / total charged)
  - Month pills — horizontal scroll, newest-first, color-coded (paid / partial / unpaid)
  - **Past month picker** — shadcn Popover with year navigation + 3×4 month grid; picks any past month as a virtual period without a DB write until first item is added
  - Per-month item list with description, amount, split hint (`÷2` or `his share`), borrower owes
  - Per-month payment rows (emerald, shows date + notes)
  - Month totals footer (charged / paid / outstanding)
  - QuickAdd bar (sticky bottom, admin only): description + amount + split toggle (`÷2` / `his`)
  - Lock / Unlock per month (prevents new items; locked months still accept payments)
  - Record Payment modal: "Pay in full" shortcut, custom amount, date, notes
  - Delete item / delete payment (admin only, with confirmation)
  - Borrower read-only view (no add/delete/lock controls)
- [x] Export expense tab as **PDF** (per-month breakdown with items + payments + outstanding) or **CSV** (items section + payments section + summary)

### Profile Page
- [x] Display name, region (with flag), role
- [x] Avatar upload (Supabase Storage) + DiceBear avatar selector (multiple styles + variants)
- [x] Change password form

### UI / Design System
- [x] `RegionBadge` — shared pill component: 🇵🇭 PH (blue) / 🇦🇪 UAE (amber)
- [x] `RegionLabel` — shared inline text: "🇵🇭 Philippines" / "🇦🇪 UAE"
- [x] `RefreshButton` — reusable icon button with spin state
- [x] `GlobalLoadingBar` — thin animated bar, synced with React Query
- [x] shadcn/ui components in use: Button, Input, Label, Calendar, Popover, Card, Sonner (toast), PasswordInput
- [x] Framer Motion used throughout: card entrance animations, sidebar active indicator, drawer slides, month content transitions

### Deployment & Infrastructure
- [x] `vercel.json` — sets `outputDirectory: dist`, SPA rewrites (`/* → /index.html`)
- [x] Cache-Control headers: `no-cache` for `index.html`, `immutable` 1-year for `/assets/*`
- [x] Vercel Analytics (`@vercel/analytics`) integrated
- [x] PWA manifest configured (vite-plugin-pwa), icons at 192×192 and 512×512
- [x] Supabase migration `001_initial_schema.sql` — core tables with RLS
- [x] Supabase migration `002_expense_tabs.sql` — expense module tables with RLS

---

## Known Limitations / Current State

- The `Database` type in `src/types/database.ts` is **manually maintained**. It must be updated whenever a new migration is applied. The correct long-term fix is to run `npx supabase gen types typescript` after each migration and commit the output.
- No push notifications for upcoming due dates.
- No FX conversion utility — PHP and AED totals are always kept separate.
- Payment proof storage is in Supabase Storage but there is no CDN or expiry policy configured.
- The expense tab module has no "delete period" action — removing all items from a month leaves an empty period row in the DB.
- Borrower confirmation status is detected via an RPC (`get_user_confirmation_statuses`) that queries `auth.users` — this requires a Supabase service-role function and may need a periodic refresh.

---

## Future Recommendations

### High Priority

#### 1. Auto-generate Supabase TypeScript types
Run `npx supabase gen types typescript --project-id <id> > src/types/database.ts` as a pre-build step or CI action. The manual approach drifts quickly as the schema evolves.

#### 2. Push / in-app notifications for due dates
Notify borrowers (and admin) when a payment is due in N days. Options:
- **Supabase Edge Functions** + **pg_cron** to scan due installments daily and trigger notifications
- **Expo Push** if a React Native app is added later
- Web Push API with a service worker (already have a PWA)

#### 3. Overdue installment detection
Automatically flag installments as overdue when `due_date < today` and `status != 'paid'`. This can be a Postgres view or a computed column. Surface it as a red badge on Dashboard and Loans pages.

#### 4. FX conversion utility
Add a `Money` utility class and a stored exchange rate (admin-configurable) so the Dashboard can optionally show a unified "total outstanding" across both currencies.

#### 5. Expense tab — delete period
Add a "Delete month" option (admin only) for months that have no items or payments. Currently these empty rows stay in the DB forever.

#### 6. Expense tab — edit item
Currently items can only be deleted and re-added. An inline edit (description + amount) would improve the workflow for corrections.

### Medium Priority

#### 7. Pagination / infinite scroll on Loans page
As loan count grows, the current "fetch all" approach will slow down. Add cursor-based pagination or `useInfiniteQuery`.

#### 8. Loan statement — include expense tab
When generating a PDF or CSV statement for a borrower, optionally append their expense tab history. Both datasets are already available; they just need to be merged in `statementExport.ts`.

#### 9. Admin bulk operations
- Bulk mark installments as paid (e.g., end-of-month sweep)
- Bulk lock/unlock expense periods

#### 10. Email notifications for payment confirmation
When admin marks an installment as paid or approves a proof, send a confirmation email to the borrower via a Supabase Edge Function.

#### 11. Loan notes & attachments
Allow admin to attach documents (contract PDF, screenshots) to individual loans, stored in Supabase Storage alongside payment proofs.

#### 12. Custom credit sources via UI
The `credit_sources` table exists but new sources are seeded via SQL. Add a UI in the Admin page for creating custom credit sources per region without a database migration.

### Low Priority / Nice to Have

#### 13. Borrower-facing dashboard improvements
- Show expense tab summary card on the borrower's dashboard (outstanding balance, last payment)
- Show a simple timeline of their payments

#### 14. Audit log
Record who changed what and when for sensitive operations (loan status changes, payment approvals, expense tab lock/unlock). A Postgres trigger writing to an `audit_log` table would cover this.

#### 15. Multi-admin support
Currently `role = 'admin'` is a single-owner concept. Support a "co-admin" or "viewer" role with read-only access to all data.

#### 16. Dark/light PDF output
The PDF print window currently outputs a white-background document. Consider adding a print-specific CSS theme that respects the user's preference, or always output a clean white document (current behavior is fine for printing).

#### 17. React Native / Expo app
The Supabase backend is already mobile-ready. An Expo app sharing the same hooks and types would give borrowers a native experience with push notifications.

#### 18. Automated type checking in CI
Add a GitHub Actions workflow that runs `npm run type-check` and `npm run build` on every pull request to catch regressions before they reach production.

#### 19. End-to-end tests with Playwright
Critical flows to cover: login → view loans, admin invite borrower, add expense item, record payment, export PDF.

---

## File Reference

```
src/
├── components/
│   ├── admin/
│   │   ├── BorrowersList.tsx        # Borrower list with statement button
│   │   ├── InviteBorrowerDrawer.tsx # Invite flow
│   │   ├── LoanStatementDrawer.tsx  # PDF/CSV export drawer
│   │   └── StatCard.tsx             # Dashboard stat card
│   ├── dashboard/
│   │   ├── LoanCard.tsx             # Active loan card
│   │   └── UpcomingPayments.tsx     # Next 30-day payments
│   ├── layout/
│   │   ├── BottomNav.tsx            # Mobile nav bar
│   │   ├── DashboardLayout.tsx      # App shell (scroll-to-top)
│   │   ├── GlobalLoadingBar.tsx     # React Query synced bar
│   │   ├── Sidebar.tsx              # Desktop sidebar
│   │   ├── TopBar.tsx               # Mobile top bar
│   │   └── navItems.ts              # Shared nav config
│   ├── loans/
│   │   ├── AddLoanDrawer.tsx        # New loan form
│   │   ├── InstallmentRow.tsx       # Installment table row
│   │   ├── LoanBreakdownSummary.tsx # Repayment breakdown
│   │   ├── ReviewProofModal.tsx     # Admin proof review
│   │   └── SubmitPaymentModal.tsx   # Borrower proof upload
│   └── ui/
│       ├── calendar.tsx             # shadcn Calendar
│       ├── popover.tsx              # shadcn Popover (Base UI)
│       ├── refresh-button.tsx       # Reusable refresh icon button
│       └── region-badge.tsx         # 🇵🇭 / 🇦🇪 flag badge + label
├── hooks/
│   ├── useAuth.ts
│   ├── useAdminBorrowers.ts
│   ├── useBorrowerDetail.ts
│   ├── useBorrowerStatement.ts
│   ├── useExpenseTab.ts             # Single tab detail + computed totals
│   ├── useExpenseTabs.ts            # Tab list (admin) / own tab (borrower)
│   ├── useExpenseTabMutations.ts    # Add/delete items, payments, lock
│   ├── useLoanDetail.ts
│   ├── useLoans.ts / useMyLoans.ts
│   └── ...
├── lib/
│   ├── statementExport.ts           # PDF + CSV for loans AND expense tabs
│   └── supabase.ts
├── pages/
│   ├── AdminPage.tsx
│   ├── BorrowerDetailPage.tsx       # /borrowers/:id
│   ├── DashboardPage.tsx
│   ├── ExpenseTabDetailPage.tsx     # /tabs/:id
│   ├── ExpenseTabsPage.tsx          # /tabs
│   ├── LoanDetailPage.tsx           # /loans/:id
│   ├── LoansPage.tsx
│   ├── LoginPage.tsx
│   ├── ProfilePage.tsx
│   └── ResetPasswordPage.tsx
├── types/
│   ├── database.ts                  # ⚠ Manually maintained — regenerate after migrations
│   └── schema.ts                    # Loan type / credit source configs
└── router.tsx
supabase/
├── migrations/
│   ├── 001_initial_schema.sql
│   └── 002_expense_tabs.sql
└── email-templates/
    ├── invite-user.html
    └── reset-password.html
```

---

*This document covers the state of the project as of 2026-03-28. Update it after each significant feature or migration.*
