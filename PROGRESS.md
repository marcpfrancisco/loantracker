# Global Loan Tracker — Progress & Roadmap

> Last updated: 2026-04-08 (migrations 008–011 applied ✅)

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
| Country / currency data | `countries-list` (bundled, ISO 3166-1 + ISO 4217) |

---

## What Has Been Built

### Authentication & Onboarding
- [x] Email/password login with Supabase Auth
- [x] Lender self-registration at `/signup` — Full Name, Email, Country, Password; calls `register-lender` Edge Function; success state → redirect to login
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
- [x] Scroll-to-top on every route navigation
- [x] Per-page refresh buttons with spin animation (`RefreshButton`)
- [x] Navigation items: Dashboard, Loans, Tabs, Admin, Profile

### Dashboard
- [x] Active loan cards with outstanding balance, progress bar, next due date
- [x] Upcoming payments section (next 30 days)
- [x] Admin sees all borrowers' loans; borrower sees only their own
- [x] Skeleton loaders synced with the global loading bar

### Loans Module
- [x] Loan list with region/currency filter and status filter pills
- [x] **Region filter pills are now dynamic** — derived from actually loaded loans + lender's own profile region; an AE lender never sees a PH filter unless PH loans exist in their org
- [x] **Grouped by borrower** (admin view) — collapsible `BorrowerLoanGroup` cards; overdue borrowers sort first; compact single-line loan rows inside each group (source name, status badge, slim progress bar, principal, due date)
- [x] Borrower view remains flat card grid
- [x] Add Loan drawer: credit source selector, loan type config, installment breakdown preview
- [x] **AddLoanDrawer header** uses `getFlagEmoji` + `getCountryName` + `getDefaultCurrency` — no hardcoded PH/AE labels; works for any country
- [x] Loan detail page: installment table, status badges, loan metadata
- [x] Installment status management (unpaid → pending → paid)
- [x] Payment proof upload (borrower submits receipt; admin reviews/approves/rejects)
- [x] Loan status management: active → completed / defaulted / cancelled
- [x] **Loan editing** — admin can edit principal, interest rate, service fee, due day, notes; unpaid installments are recomputed; business rule: locked after first payment unless org plan = `owner`
- [x] **Bulk mark installments paid** — admin bulk mode in `LoanDetailPage`; `useBulkMarkPaid` in `useUpdateInstallment.ts`; fires `notify-payment-confirmed` Edge Function
- [x] Supported loan types: Maribank Credit, S-Loan, G-Loan, SPayLater, LazCredit, Tabby, Credit Card, Custom
- [x] Loan breakdown summary — always shows "Borrower Actually Receives" block; visible to both admin and borrower
- [x] Installment strategies: `computeMaribank`, `computeSLoan`, `computeGLoan`, `computeLazCredit`, `computeTabby`
- [x] Tabby editable payment splits — pre-filled equal split, live sum-vs-principal validator
- [x] Infinite scroll (`useLoansInfinite`, `LOANS_PAGE_SIZE = 20`, cursor-based)

### Admin Module
- [x] Admin dashboard with dynamic stat cards — active loans and outstanding balance grouped per region/currency (supports any country, not just PH/AE)
- [x] **Active Loans section grouped by borrower** — same `BorrowerLoanGroup` component as Loans page; overdue borrowers first; header shows borrower count + loan count
- [x] Borrower list — collapsible, shows region flag badge, active/total loans, pending invite chip
- [x] Invite Borrower drawer — uses `CountryPicker` (any country, not just PH/AE)
- [x] Borrower Detail page (`/borrowers/:id`): profile card, expense tab shortcut, loans list
- [x] Loan Statement drawer — per-loan installment breakdown, dynamic currency summary totals (any currency)
- [x] Export loan statement as **PDF** (styled HTML) or **CSV**; both support dynamic multi-currency summaries
- [x] Org Settings page (`/org-settings`, admin only) — update lender name (synced to `profiles.full_name`) + country picker; read-only workspace info (slug, active region, plan badge)

### Credit Sources CRUD
- [x] Full CRUD drawer (`CreditSourcesDrawer`) — accessible from AdminPage via Settings icon
- [x] **"+ New" tab** — the old inline "More" button is now a proper first-class tab; navigating to it shows the Add form; saving redirects to the new country's tab automatically
- [x] **Default loan fields per source** — when creating or editing a credit source, lender can set:
  - Default interest rate (%)
  - Default installments count
  - Default due day of month
  - These pre-fill the Add Loan form when that source is selected (stored in `default_interest_rate`, `default_installments`, `default_due_day` columns — migration 011)
  - Source rows show a compact defaults summary line when any defaults are configured
- [x] **Credit source defaults wired into Add Loan form** — `useEffect` in `AddLoanDrawer` applies a three-level priority chain: per-loan-type DB override → source-level defaults → schema.ts config
- [x] **Region-aware tabs** — tabs are derived from the lender's own profile region + any regions that already have sources. An AE lender never sees a Philippines tab unless they explicitly added a PH source via "+ New"
- [x] **CountryPicker in Add form** pre-selects the lender's own region; lender can change it to add sources for another country
- [x] Toggle active/inactive per source (inactive hidden from loan forms, kept for history)
- [x] Delete with confirmation dialog

### Multi-Tenant / SaaS
- [x] **Migration `005_multi_tenant.sql`** — `organizations` + `org_members` tables; `org_id` added to all tables; RLS policies rewritten with org isolation; `my_org_id()` + `is_admin()` helper functions
- [x] **Migration `006_org_id_defaults.sql`** — `DEFAULT my_org_id()` on loans, credit_sources, expense_tabs
- [x] **Migration `007_multi_org_membership.sql`** — `user_org_context` table; `my_org_id()` reads active context; `is_admin()` checks `org_members` for active org; drops `profiles.org_id`
- [x] **Migration `008_fix_profiles_rls.sql`** — fixed infinite recursion in `profiles` RLS; new `my_profile_role()` SECURITY DEFINER function; dropped orphaned `admins_update_any_profile` policy
- [x] **Migration `009_owner_plan.sql`** — added `'owner'` plan tier to `organizations.plan` constraint; set owner account plan via email lookup
- [x] **Migration `010_flexible_regions.sql`** — converted `region_type`/`currency_type` Postgres enums to free-text `text` columns; renamed stored `'UAE'` → `'AE'` (ISO 3166-1 alignment); updated `handle_new_user()` trigger; dropped old enums
- [x] **Migration `011_credit_source_defaults.sql`** — added `default_interest_rate` (numeric), `default_installments` (smallint), `default_due_day` (smallint, 1–28) to `credit_sources`; all nullable
- [x] **Migration `012_per_loan_type_default.sql`** — `credit_source_loan_type_defaults` table; per-loan-type interest rate, installments, due day overrides; RLS; `org_id DEFAULT my_org_id()`
- [x] **`register-lender` Edge Function** — public registration; `OWNER_EMAIL` secret auto-assigns `'owner'` plan; creates org → auth user → org_members → user_org_context → seeds credit sources
- [x] **`invite-borrower` Edge Function** — fetches caller's active org from `user_org_context`; verifies admin role; creates `org_members` + `user_org_context` for new borrower
- [x] **`AuthContext`** — exposes `activeOrgId`, `activeRole`, `switchOrg(orgId)`; fetches org context in parallel with profile on every auth event; single-org users upsert `user_org_context` on sign-in (self-healing)
- [x] **`OrgPickerPage`** (`/org-picker`) — shown after login when user belongs to 2+ orgs; shows org cards with `RegionBadge`, `RoleBadge`, `PlanBadge`; auto-redirects single-org users
- [x] **`requireAdmin` loader** — uses `supabase.rpc("is_admin")` (org-scoped) instead of `profile.role`
- [x] **Plan tiers** — `free` (up to 5 borrowers / 20 active loans), `pro` (unlimited), `owner` (unlimited, no restrictions); `PlanBadge` shared component
- [x] `src/types/enums.ts` — `RegionType` and `CurrencyType` are now `string` (free-form after migration 010)

### Flexible Multi-Country / Currency
- [x] **`countries-list`** npm package — bundled ISO 3166-1 + ISO 4217 data, no API calls
- [x] **`src/lib/countries.ts`** — `getFlagEmoji`, `getCountryName`, `getDefaultCurrency`, `getCountryOptions`, `filterCountries`
- [x] **`CountryPicker`** component — popover-based searchable dropdown; search by name, ISO code, or currency; flag + name + currency code display
- [x] **`RegionBadge` / `RegionLabel`** — now universal; works with any ISO alpha-2 code; deterministic colour palette
- [x] All hardcoded `"UAE"` / `"PH"` / `"PHP"` / `"AED"` references eliminated from frontend logic

### Expense Tabs Module
- [x] Database schema: `expense_tabs` → `expense_periods` → `expense_items` + `expense_payments`
- [x] Expense Tabs list page (`/tabs`): admin sees all; borrower redirected to their own tab
- [x] Expense Tab Detail page (`/tabs/:id`): totals card, month pills, QuickAdd bar, lock/unlock, payment recording, delete item/payment
- [x] Export expense tab as **PDF** or **CSV**
- [x] **Delete expense period** — admin-only; `useDeleteExpensePeriod` in `useExpenseTabMutations.ts`; confirmation dialog
- [x] **Inline edit expense item** — `ItemRow` edit mode (description, amount, split toggle); `useUpdateExpenseItem` in `useExpenseTabMutations.ts`
- [x] **Bulk lock/unlock expense periods** — admin bulk mode on month pills; select-all; `useBulkTogglePeriodLock` in `useExpenseTabMutations.ts`; Lock/Unlock action buttons

### Profile Page
- [x] Display name, region (with flag), role
- [x] Avatar upload (Supabase Storage) + DiceBear avatar selector
- [x] Change password form
- [x] Full Name update syncs to `organizations.name` (admin only)

### UI / Design System
- [x] `CountryPicker` — searchable popover, any ISO country, flag + name + currency
- [x] `RegionBadge` / `RegionLabel` — universal ISO alpha-2 support
- [x] `PlanBadge` — free / pro / owner (amber + Crown icon)
- [x] `BorrowerLoanGroup` + `CompactLoanRow` — shared collapsible borrower group component
- [x] `RefreshButton`, `GlobalLoadingBar`, `StatCard`
- [x] shadcn/ui: Button, Input, Label, Calendar, Popover, Card, Sonner (toast), PasswordInput
- [x] Framer Motion: card entrances, sidebar indicator, drawer slides, collapse animations

### Developer Tooling
- [x] `npm run seed:test` — creates test lender + borrower accounts
  - Loads `.env` via `tsx --env-file=.env` (Node native, no manual file parsing)
  - Imports `CREDIT_SOURCE_CONFIGS` from `src/types/schema.ts` — schema is the single source of truth
  - Seeds only the lender's own region (PH lender → PH sources only; AE lender → AE sources only)
  - Populates `default_interest_rate`, `default_installments`, `default_due_day` from schema configs
- [x] `scripts/reset-test-accounts.sql` — safely removes test accounts in correct FK dependency order (installments → loans → expense data → notifications → credit_sources → organization → auth.users); run in Supabase SQL Editor
- [x] `npm run gen:types` — regenerates `src/types/database.ts` from live Supabase schema
- [x] `vercel.json` — SPA rewrites, `no-cache` for `index.html`, `immutable` 1-year for `/assets/*`

### Deployment & Infrastructure
- [x] Vercel Analytics integrated
- [x] PWA manifest (vite-plugin-pwa), icons 192×192 and 512×512

---

## Known Limitations

- Payment proof storage has no CDN or expiry policy configured.
- Tabby installment amounts cannot be edited after loan creation — admin must delete and re-create the loan.
- Billing enforcement (free plan borrower/loan caps) is not yet wired up in the frontend or enforced via RLS.
- No push notifications for due date reminders (Web Push Phase 2 not yet implemented).
- No FX conversion utility — multi-currency totals are always kept separate per currency.

---

## Roadmap

### Next Up — High Value, Low Effort

#### Wire Credit Source Defaults into Add Loan Form
The `default_interest_rate`, `default_installments`, and `default_due_day` columns are now stored on `credit_sources` but not yet applied. When a lender selects a credit source in `AddLoanDrawer`, these values should pre-fill the form fields — overriding the static `schema.ts` template defaults for sources that the lender has customised.

Implementation: in the `useEffect` that watches `watchedSourceId`, check `selectedSource.default_*` fields and `setValue` before the schema config defaults kick in.

#### ~~Loan Editing~~ ✅ Done
~~Allow the admin to edit a loan's principal, interest rate, notes, and due day after creation without deleting and re-creating. Key constraint: installment amounts may need to be recomputed.~~

### High Priority

#### Web Push Notifications (Phase 2)
Upgrade in-app notifications to system-level pushes when the app is closed.
1. Switch PWA to `injectManifest` mode; add push event handler to service worker
2. Generate VAPID keys (`npx web-push generate-vapid-keys`); store as Edge Function secrets
3. `push_subscriptions` table — stores per-device subscription objects
4. Permission prompt + subscription save on login
5. `send-push` Edge Function — encrypts + sends via Web Push Protocol; handles `410 Gone`
6. Wire into `create_notification()` via `pg_net`
7. `send-due-date-reminders` Edge Function + `pg_cron` — daily scan for installments due in 3 days

#### Billing Enforcement
Enforce `free` plan limits (5 borrowers / 20 active loans) in the invite flow and `AddLoanDrawer`. Gate behind a Stripe integration for plan upgrades.

### Medium Priority

- **FX conversion utility** — `Money` class + admin-configurable exchange rate for a unified outstanding total across currencies on the dashboard
- **Loan statement — include expense tab** — merge expense tab history into the PDF/CSV export per borrower

### Low Priority / Nice to Have

- **Borrower dashboard improvements** — expense tab summary card, payment timeline view
- **Audit log** — Postgres trigger writing to `audit_log` for sensitive operations (loan status changes, proof approvals, period lock/unlock)
- **Multi-admin / viewer role** — "co-admin" or read-only viewer membership type
- **React Native / Expo app** — mobile-native app sharing the same hooks and Supabase backend
- **Automated CI** — GitHub Actions running `type-check` + `build` on every PR
- **End-to-end tests** — Playwright covering login, invite borrower, add expense item, export PDF

---

## File Reference

```
src/
├── components/
│   ├── admin/
│   │   ├── BorrowersList.tsx         # Borrower list with statement button
│   │   ├── CreditSourcesDrawer.tsx   # CRUD — dynamic country tabs, "+ New" tab, default fields
│   │   ├── InviteBorrowerDrawer.tsx  # Invite borrower — CountryPicker for region
│   │   ├── LoanStatementDrawer.tsx   # PDF/CSV export — dynamic multi-currency summary
│   │   └── StatCard.tsx              # Dashboard stat card
│   ├── dashboard/
│   │   ├── LoanCard.tsx              # Active loan card (borrower flat view)
│   │   └── UpcomingPayments.tsx      # Next 30-day payments
│   ├── layout/
│   │   ├── BottomNav.tsx
│   │   ├── DashboardLayout.tsx
│   │   ├── GlobalLoadingBar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── navItems.ts
│   ├── loans/
│   │   ├── AddLoanDrawer.tsx         # New loan form — dynamic country/currency label
│   │   ├── BorrowerLoanGroup.tsx     # Shared collapsible borrower group + compact row
│   │   ├── InstallmentRow.tsx
│   │   ├── LoanBreakdownSummary.tsx
│   │   ├── ReviewProofModal.tsx
│   │   └── SubmitPaymentModal.tsx
│   └── ui/
│       ├── country-picker.tsx        # Searchable country dropdown (any ISO country)
│       ├── plan-badge.tsx            # free / pro / owner badge
│       ├── region-badge.tsx          # Universal ISO alpha-2 flag badge + label
│       ├── refresh-button.tsx
│       └── ...shadcn primitives
├── hooks/
│   ├── useAdminBorrowers.ts
│   ├── useAdminStats.ts              # Dynamic Record<region, stat> + Record<currency, amount>
│   ├── useAuth.ts                    # activeOrgId, activeRole, switchOrg
│   ├── useBorrowerDetail.ts
│   ├── useBorrowerStatement.ts       # summary: Record<string, CurrencySummary>
│   ├── useCreditSourceMutations.ts   # create/update include default_* fields
│   ├── useCreditSources.ts           # CreditSourceOption + CreditSourceRow include default_* fields
│   ├── useExpenseTab.ts
│   ├── useExpenseTabMutations.ts
│   ├── useExpenseTabs.ts
│   ├── useLoanDetail.ts
│   ├── useLoans.ts                   # LoanListItem type lives here
│   ├── useLoansInfinite.ts           # Infinite scroll, LOANS_PAGE_SIZE=20
│   ├── useMyLoans.ts
│   ├── useNotifications.ts
│   ├── useOverdueInstallments.ts
│   ├── useReviewProof.ts
│   ├── useUpdateInstallment.ts
│   ├── useUpdateProfile.ts           # Syncs full_name → organizations.name for admins
│   └── useUpcomingInstallments.ts
├── lib/
│   ├── countries.ts                  # getFlagEmoji, getCountryName, getDefaultCurrency, getCountryOptions
│   ├── installmentStrategies.ts      # computeMaribank / SLoan / GLoan / LazCredit / Tabby
│   ├── loaders.ts                    # requireAuth, requireAdmin (uses is_admin RPC)
│   ├── statementExport.ts            # PDF + CSV — dynamic multi-currency summaries
│   └── supabase.ts
├── pages/
│   ├── AdminPage.tsx                 # Active loans grouped by borrower
│   ├── BorrowerDetailPage.tsx
│   ├── DashboardPage.tsx
│   ├── ExpenseTabDetailPage.tsx
│   ├── ExpenseTabsPage.tsx
│   ├── LoanDetailPage.tsx
│   ├── LoansPage.tsx                 # Dynamic region filter pills from loaded data + profile.region
│   ├── LoginPage.tsx
│   ├── OrgPickerPage.tsx             # /org-picker — multi-org context switcher
│   ├── OrgSettingsPage.tsx           # /org-settings — name + country + workspace info
│   ├── ProfilePage.tsx
│   ├── ResetPasswordPage.tsx
│   └── SignupPage.tsx
├── types/
│   ├── database.ts                   # Auto-generated (run npm run gen:types after migrations)
│   ├── enums.ts                      # Hand-maintained aliases; RegionType/CurrencyType = string
│   └── schema.ts                     # CREDIT_SOURCE_CONFIGS — single source of truth for loan types + defaults
└── router.tsx
scripts/
├── seed-test-accounts.ts             # npm run seed:test — imports schema.ts, region-scoped seeds
└── reset-test-accounts.sql           # Supabase SQL Editor — safe FK-ordered teardown of test data
supabase/
├── functions/
│   ├── invite-borrower/              # Org-scoped invite, creates org_members row
│   ├── notify-loan-created/          # Notify borrower on new loan
│   ├── notify-payment-confirmed/     # Email borrower when payment approved
│   ├── notify-rejection/             # Email + delete receipt on reject
│   └── register-lender/             # Self-registration — OWNER_EMAIL → owner plan
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_expense_tabs.sql
│   ├── 003_notifications.sql
│   ├── 004_expense_period_archive.sql
│   ├── 005_multi_tenant.sql
│   ├── 006_org_id_defaults.sql
│   ├── 007_multi_org_membership.sql
│   ├── 008_fix_profiles_rls.sql      # my_profile_role() SECURITY DEFINER; fixed recursion
│   ├── 009_owner_plan.sql            # owner plan tier + set owner account
│   ├── 010_flexible_regions.sql      # region/currency enums → text; UAE → AE
│   └── 011_credit_source_defaults.sql # default_interest_rate / _installments / _due_day on credit_sources
└── email-templates/
    ├── invite-user.html
    └── reset-password.html
```
