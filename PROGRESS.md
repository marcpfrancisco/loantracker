# Global Loan Tracker — Progress & Roadmap

> Last updated: 2026-04-07 (multi-org membership complete)

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
- [x] Loan breakdown summary component — always shows "Borrower Actually Receives" green block (not only when fee exists); visible to both admin and borrower on Loan Detail page
- [x] Installment strategies with full config per loan type:
  - `computeMaribank` — monthly reducing balance, `same_month_if_possible` first due
  - `computeSLoan` — add-on rate, admin fee deducted upfront, `always_next_month`
  - `computeGLoan` — monthly add-on rate, `always_next_month`, inherits start day
  - `computeLazCredit` — monthly add-on rate, `Math.ceil` rounding to whole peso (matches Lazada app), `always_next_month`
  - `computeTabby` — 0% interest, equal split, `immediate_first_then_monthly` (first payment due same day as purchase, auto-marked paid)
- [x] Tabby editable payment splits in Add Loan drawer — pre-filled with equal split, admin adjusts to match Tabby app's exact amounts; live sum-vs-principal validator
- [x] `src/types/enums.ts` — hand-maintained named type alias file (`LoanStatus`, `LoanType`, `CurrencyType`, etc.) that survives `npm run gen:types` overwrites; all 30+ import sites updated
- [x] Cache invalidation strategy for `useUpdateInstallment` — full set of `invalidateQueries` on success (`loan`, `loans`, `loans-infinite`, `my-loans`, `upcoming-installments`, `overdue-installments`, `my-overdue-installments`, `admin/stats`); `staleTime: 30s` on `useLoanDetail` to prevent redundant window-focus refetches

### Admin Module
- [x] Admin dashboard with stat cards: total borrowers, active loans, total outstanding (PHP + AED split)
- [x] Borrower list — collapsible, shows region flag badge, active/total loans, pending invite chip
- [x] Invite Borrower drawer (sends Supabase auth invite email via Brevo SMTP)
- [x] Borrower Detail page (`/borrowers/:id`): profile card, expense tab shortcut, loans list
- [x] Loan Statement drawer — slides in from the right, per-loan installment breakdown, PHP/AED summary totals
- [x] Export loan statement as **PDF** (browser print window, styled HTML) or **CSV** (flat download)
- [x] Credit Sources CRUD drawer — create, rename, toggle active/inactive, delete with confirmation; PH/UAE region tabs; accessible from Admin page via "Credit Sources" button

### Expense Tabs Module
- [x] Database schema: `expense_tabs` → `expense_periods` → `expense_items` + `expense_payments`
  - One tab per borrower (`UNIQUE(borrower_id)`)
  - One period row per month per tab (`UNIQUE(tab_id, period)`)
  - Full RLS: admin has all access; borrower has SELECT-only via JOIN chain
- [x] "Add to Expense Tab" button on Borrower Detail page → Create Tab modal (title + currency)
- [x] Expense Tabs list page (`/tabs`): admin sees all tabs; borrower is redirected straight to their own tab
- [x] Expense Tab Detail page (`/tabs/:id`):
  - Totals card (outstanding / paid / total charged)
  - Month pills — horizontal scroll (`overflow-x-auto`, `scrollbar-none`), auto-centers active pill via `scrollIntoView` on select; color-coded: **emerald** (paid) / **amber** (partial) / **orange** (locked + unpaid) / **zinc** (unlocked unpaid) / **violet** (archived)
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

### SaaS / Multi-Tenant
- [x] **Migration `005_multi_tenant.sql`** ✅ Applied — organizations + org_members tables; `org_id` added to profiles, credit_sources, loans, expense_tabs, notifications; all RLS policies rewritten with org isolation; `my_org_id()` helper function; `is_admin()` made org-scoped; `handle_new_user()` trigger reads `org_id` from user metadata; rollback script `005_multi_tenant_rollback.sql` provided
- [x] **Migration `006_org_id_defaults.sql`** — adds `DEFAULT my_org_id()` to loans, credit_sources, expense_tabs so frontend inserts don't need to pass `org_id` explicitly. **Pending: apply in Supabase + run `npm run gen:types`**
- [x] **Migration `007_multi_org_membership.sql`** — multi-org: `UNIQUE(user_id, org_id)` on org_members; `user_org_context` table (one row per user, tracks active org); `my_org_id()` reads `user_org_context`; `is_admin()` checks org_members for active org; drops `profiles.org_id`; updates `handle_new_user()` to no longer stamp org_id on profile. Rollback: `007_multi_org_membership_rollback.sql`. **Pending: apply in Supabase after 006**
- [x] **`register-lender` Edge Function** — public registration endpoint; org name defaults to lender's full name (no `org_name` field); creates org → auth user → org_members → `user_org_context` → seeds credit sources; rollback on failure
- [x] **`invite-borrower` Edge Function (updated)** — fetches caller's active org from `user_org_context`; verifies admin role in org_members; creates `org_members` + `user_org_context` for new borrower; no longer passes `org_id` in invite metadata
- [x] **`SignupPage.tsx`** — lender self-registration form (Full Name, Email, Region, Password); no `org_name` field (org defaults to full name); success state + redirect to login; guest-only route at `/signup`
- [x] **`LoginPage.tsx`** — "New lender? Create an account" link to `/signup`
- [ ] **`OrgPickerPage`** — shown after login when user belongs to 2+ orgs; lets user choose which context (lender vs borrower) to enter the dashboard as; single-org users skip straight to dashboard
- [ ] **`useAuth` updates** — expose `activeOrgId`, `activeRole`, `switchOrg(orgId)` sourced from `user_org_context`; login flow upserts `user_org_context` on each sign-in for single-org users
- [ ] Org Settings page — lender can update their org name and region
- [ ] Billing / plan limits (free: max 5 borrowers / 20 active loans; pro: unlimited) — Stripe integration, deferred

---

## Known Limitations / Current State

- `src/types/database.ts` is **auto-generated** via `npm run gen:types`. Run after every schema migration. Named type aliases (`LoanStatus`, `LoanType`, etc.) now live in `src/types/enums.ts` so they survive overwrites.
- No push notifications for upcoming due dates (Web Push Phase 2 not yet implemented).
- No FX conversion utility — PHP and AED totals are always kept separate.
- Payment proof storage is in Supabase Storage but there is no CDN or expiry policy configured.
- The expense tab module has no "delete period" action — removing all items from a month leaves an empty period row in the DB.
- Borrower confirmation status is detected via an RPC (`get_user_confirmation_statuses`) that queries `auth.users` — this requires a Supabase service-role function and may need a periodic refresh.
- Tabby installment amounts are editable at loan creation time but cannot be edited after the loan is saved. If the admin enters wrong splits they must delete and re-create the loan.
- **`OrgPickerPage` not yet built** — multi-org users (borrower who also lends) can't switch contexts yet. Migration 007 is ready; the org-picker UI and `useAuth` updates are still pending.

### Pending Ops Tasks
1. Apply `006_org_id_defaults.sql` in Supabase SQL Editor → then `npm run gen:types` (fixes TS type errors in insert hooks)
2. Apply `007_multi_org_membership.sql` in Supabase SQL Editor (requires 006 to be applied first)
3. Deploy `supabase functions deploy register-lender`
4. Deploy `supabase functions deploy invite-borrower`
5. Deploy `supabase functions deploy notify-loan-created`

---

## Future Recommendations

### High Priority

#### 1. Auto-generate Supabase TypeScript types
~~Run `npx supabase gen types typescript --project-id <id> > src/types/database.ts` as a pre-build step or CI action. The manual approach drifts quickly as the schema evolves.~~
**✅ Done** — `npm run gen:types` script added to `package.json`. Run after every schema migration.

#### 2. In-app notifications — Phase 1 ✅ Done
~~Notify borrowers (and admin) when a payment is due in N days.~~
**✅ Done** — In-app notification center implemented:
- `notifications` table with RLS + Supabase Realtime (`003_notifications.sql`)
- `create_notification()` SECURITY DEFINER function — single entry point, ready for Phase 2
- DB triggers: `on_proof_submitted` (→ admin), `on_proof_reviewed` (→ borrower on approve/reject)
- `useNotifications` hook — TanStack Query + Realtime subscription, `markRead`, `markAllRead`
- `NotificationBell` component — bell icon with unread badge, animated dropdown panel, type-aware icons
- Placed in TopBar (mobile) and Sidebar (desktop)

#### 2a. Web Push Notifications — Phase 2
Upgrade in-app notifications to deliver system-level pushes even when the app is closed. The `create_notification()` function is the **only place that needs to change** — all other code stays the same.

**Implementation order:**
1. **Switch PWA to `injectManifest` mode** — change `vite.config.ts` from `generateSW` to `injectManifest` so a custom service worker file can be used. Add push event handler (`push`, `notificationclick`) to the service worker.
2. **Generate VAPID keys** (one-time):
   ```bash
   npx web-push generate-vapid-keys
   ```
   Store as Edge Function secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
3. **`push_subscriptions` table** — stores per-device browser subscription objects:
   ```sql
   CREATE TABLE push_subscriptions (
     id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     endpoint   text NOT NULL,
     p256dh     text NOT NULL,  -- browser encryption key
     auth       text NOT NULL,  -- browser auth secret
     created_at timestamptz NOT NULL DEFAULT now(),
     UNIQUE(user_id, endpoint)
   );
   ```
4. **Permission prompt + subscription save** — on login, call `Notification.requestPermission()`. If granted, get the push subscription from the service worker and `upsert` it into `push_subscriptions`.
5. **`send-push` Edge Function** — reads subscriptions for a `user_id`, encrypts and sends via Web Push Protocol using VAPID keys. Handles `410 Gone` (expired subscription → delete from DB).
6. **Wire into `create_notification()`** — call `send-push` via `pg_net` or `supabase.functions.invoke()` inside the existing Postgres function. No trigger changes needed.
7. **`send-due-date-reminders` Edge Function + `pg_cron`** — daily scan for installments due in 3 days, creates notifications + sends pushes. Requires `pg_cron` enabled (available on Supabase Pro).

**Known limitations:**
- iOS Safari only delivers Web Push to **installed PWAs** (Add to Home Screen), not in-browser tabs
- Users must explicitly grant browser notification permission
- Each device registers its own subscription — one user can have multiple active subscriptions
- Stale/expired subscriptions return `410 Gone` and must be deleted from the DB

#### 3. Overdue installment detection ✅ Done
~~Automatically flag installments as overdue when `due_date < today` and `status != 'paid'`. This can be a Postgres view or a computed column. Surface it as a red badge on Dashboard and Loans pages.~~
- `InstallmentRow` — overdue rows already had rose background + "Overdue" label
- `LoanCard` — already showed "Xd overdue" for next due date
- `AdminPage` — overdue panel already existed (admin sees all borrowers)
- **New:** `useMyOverdueInstallments` hook — borrower-scoped (RLS filters automatically, no borrower_name needed)
- **New:** Overdue alert panel on borrower `DashboardPage` — rose themed, days-late badge per installment, click → loan detail, only renders when data exists

#### 4. FX conversion utility
Add a `Money` utility class and a stored exchange rate (admin-configurable) so the Dashboard can optionally show a unified "total outstanding" across both currencies.

#### 5. Expense tab — delete period
Add a "Delete month" option (admin only) for months that have no items or payments. Currently these empty rows stay in the DB forever.

#### 6. Expense tab — edit item
Currently items can only be deleted and re-added. An inline edit (description + amount) would improve the workflow for corrections.

### Medium Priority

#### 7. Pagination / infinite scroll on Loans page ✅ Done
~~As loan count grows, the current "fetch all" approach will slow down. Add cursor-based pagination or `useInfiniteQuery`.~~
- `useLoansInfinite.ts` — `useInfiniteQuery` with `LOANS_PAGE_SIZE = 20`, cursor via `.range(pageParam, pageParam + 19)`
- `LoansPage.tsx` — renders flat `data?.pages.flat()` list + "Load more" button when `hasNextPage` is true

#### 8. Loan statement — include expense tab
When generating a PDF or CSV statement for a borrower, optionally append their expense tab history. Both datasets are already available; they just need to be merged in `statementExport.ts`.

#### 9. Admin bulk operations
- Bulk mark installments as paid (e.g., end-of-month sweep)
- Bulk lock/unlock expense periods

#### 10. Email notifications for payment confirmation ✅ Done
~~When admin marks an installment as paid or approves a proof, send a confirmation email to the borrower via a Supabase Edge Function.~~
- `notify-payment-confirmed` Edge Function — called from `useUpdateInstallment.ts` when admin marks paid; sends styled HTML email via Brevo with installment details + "View Loan" CTA
- `notify-rejection` Edge Function — called from `useReviewProof.ts` on reject; deletes receipt from Storage + sends rejection email with admin note as reason
- Both functions verify JWT, confirm caller is admin (service role), gracefully skip if `BREVO_API_KEY` not set

#### 11. Loan notes & attachments
Allow admin to attach documents (contract PDF, screenshots) to individual loans, stored in Supabase Storage alongside payment proofs.

#### 12. Custom credit sources via UI ✅ Done
~~The `credit_sources` table exists but new sources are seeded via SQL. Add a UI in the Admin page for creating custom credit sources per region without a database migration.~~
- `CreditSourcesDrawer.tsx` — PH/UAE tabs, inline create/rename forms, active toggle (pill switch), ConfirmDialog for delete
- `useCreditSourceMutations.ts` — `useCreateCreditSource`, `useUpdateCreditSource`, `useToggleCreditSourceActive`, `useDeleteCreditSource`; all invalidate `["credit-sources"]` on success
- `useAllCreditSources()` in `useCreditSources.ts` — admin-scoped hook that includes inactive sources

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
│   │   ├── CreditSourcesDrawer.tsx  # Credit sources CRUD (create/rename/toggle/delete)
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
│   ├── useCreditSources.ts          # useCreditSources (active only) + useAllCreditSources (admin)
│   ├── useCreditSourceMutations.ts  # create/update/toggleActive/delete credit sources
│   ├── useLoanDetail.ts             # staleTime: 30s to prevent window-focus refetches
│   ├── useLoans.ts / useMyLoans.ts
│   ├── useLoansInfinite.ts          # Infinite scroll (LOANS_PAGE_SIZE=20, cursor-based)
│   ├── useNotifications.ts          # In-app notification bell (TanStack Query + Realtime)
│   ├── useReviewProof.ts            # Admin proof approve/reject → notify-rejection
│   ├── useUpdateInstallment.ts      # Mark paid → full cache invalidation + notify-payment-confirmed
│   └── ...
├── lib/
│   ├── installmentStrategies.ts     # computeMaribank / computeSLoan / computeGLoan / computeLazCredit / computeTabby
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
│   ├── LoginPage.tsx                # + "Create an account" link
│   ├── ProfilePage.tsx
│   ├── ResetPasswordPage.tsx
│   └── SignupPage.tsx               # /signup — lender self-registration
├── types/
│   ├── database.ts                  # Auto-generated — run `npm run gen:types` after migrations
│   ├── enums.ts                     # Hand-maintained named type aliases (survives gen:types)
│   └── schema.ts                    # Loan type / credit source configs + FirstDueStrategy
└── router.tsx
supabase/
├── functions/
│   ├── invite-borrower/             # Invite borrower — org-scoped, creates org_members row
│   ├── notify-loan-created/         # Notify borrower on new loan (pending deploy)
│   ├── notify-payment-confirmed/    # Email borrower when payment approved
│   ├── notify-rejection/            # Email borrower + delete receipt on reject
│   └── register-lender/             # Public lender self-registration (creates org + user + seeds)
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_expense_tabs.sql
│   ├── 003_notifications.sql        # notifications table + triggers + create_notification()
│   ├── 004_expense_period_archive.sql
│   ├── 005_multi_tenant.sql         # organizations + org_members + org_id on all tables + RLS rewrite
│   ├── 005_multi_tenant_rollback.sql # Safe revert for 005
│   ├── 006_org_id_defaults.sql      # DEFAULT my_org_id() on loans/credit_sources/expense_tabs
│   ├── 007_multi_org_membership.sql # user_org_context + UNIQUE(user_id,org_id) + drop profiles.org_id
│   └── 007_multi_org_membership_rollback.sql # Safe revert for 007
└── email-templates/
    ├── invite-user.html
    └── reset-password.html
```

---

*This document covers the state of the project as of 2026-04-07. Update it after each significant feature or migration.*
