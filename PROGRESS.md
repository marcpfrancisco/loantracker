# Global Loan Tracker — Progress & Roadmap

> Last updated: 2026-04-08 (migrations 008–010 applied ✅)

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
- [x] **Grouped by borrower** (admin view) — collapsible `BorrowerLoanGroup` cards; overdue borrowers sort first; compact single-line loan rows inside each group (source name, status badge, slim progress bar, principal, due date)
- [x] Borrower view remains flat card grid
- [x] Add Loan drawer: credit source selector, loan type config, installment breakdown preview
- [x] Loan detail page: installment table, status badges, loan metadata
- [x] Installment status management (unpaid → pending → paid)
- [x] Payment proof upload (borrower submits receipt; admin reviews/approves/rejects)
- [x] Loan status management: active → completed / defaulted / cancelled
- [x] Supported loan types: Maribank Credit, S-Loan, G-Loan, SPayLater, LazCredit, Tabby, Credit Card, Custom
- [x] Loan breakdown summary — always shows "Borrower Actually Receives" block; visible to both admin and borrower
- [x] Installment strategies: `computeMaribank`, `computeSLoan`, `computeGLoan`, `computeLazCredit`, `computeTabby`
- [x] Tabby editable payment splits — pre-filled equal split, live sum-vs-principal validator
- [x] Infinite scroll (`useLoansInfinite`, `LOANS_PAGE_SIZE = 20`, cursor-based)

### Admin Module
- [x] Admin dashboard with dynamic stat cards — active loans and outstanding balance grouped per region/currency (supports any country, not just PH/AE)
- [x] **Active Loans section grouped by borrower** — same `BorrowerLoanGroup` component as Loans page; overdue borrowers first; header shows borrower count + loan count
- [x] Borrower list — collapsible, shows region flag badge, active/total loans, pending invite chip
- [x] Invite Borrower drawer — now uses `CountryPicker` (any country, not just PH/AE)
- [x] Borrower Detail page (`/borrowers/:id`): profile card, expense tab shortcut, loans list
- [x] Loan Statement drawer — per-loan installment breakdown, dynamic currency summary totals (any currency)
- [x] Export loan statement as **PDF** (styled HTML) or **CSV**; both support dynamic multi-currency summaries
- [x] Credit Sources CRUD drawer — dynamic country tabs derived from existing sources; `CountryPicker` for adding sources to any country; create, rename, toggle active/inactive, delete with confirmation
- [x] Org Settings page (`/org-settings`, admin only) — update lender name (synced to `profiles.full_name`) + country picker; read-only workspace info (slug, active region, plan badge)

### Multi-Tenant / SaaS
- [x] **Migration `005_multi_tenant.sql`** — `organizations` + `org_members` tables; `org_id` added to all tables; RLS policies rewritten with org isolation; `my_org_id()` + `is_admin()` helper functions
- [x] **Migration `006_org_id_defaults.sql`** — `DEFAULT my_org_id()` on loans, credit_sources, expense_tabs
- [x] **Migration `007_multi_org_membership.sql`** — `user_org_context` table; `my_org_id()` reads active context; `is_admin()` checks `org_members` for active org; drops `profiles.org_id`
- [x] **Migration `008_fix_profiles_rls.sql`** — fixed infinite recursion in `profiles` RLS; new `my_profile_role()` SECURITY DEFINER function; dropped orphaned `admins_update_any_profile` policy
- [x] **Migration `009_owner_plan.sql`** — added `'owner'` plan tier to `organizations.plan` constraint; set owner account plan via email lookup
- [x] **Migration `010_flexible_regions.sql`** — converted `region_type`/`currency_type` Postgres enums to free-text `text` columns; renamed stored `'UAE'` → `'AE'` (ISO 3166-1 alignment); updated `handle_new_user()` trigger; dropped old enums
- [x] **`register-lender` Edge Function** — public registration; `OWNER_EMAIL` secret auto-assigns `'owner'` plan; creates org → auth user → org_members → user_org_context → seeds credit sources
- [x] **`invite-borrower` Edge Function** — fetches caller's active org from `user_org_context`; verifies admin role; creates `org_members` + `user_org_context` for new borrower
- [x] **`AuthContext`** — exposes `activeOrgId`, `activeRole`, `switchOrg(orgId)`; fetches org context in parallel with profile on every auth event; single-org users upsert `user_org_context` on sign-in (self-healing)
- [x] **`OrgPickerPage`** (`/org-picker`) — shown after login when user belongs to 2+ orgs; shows org cards with `RegionBadge`, `RoleBadge`, `PlanBadge`; auto-redirects single-org users
- [x] **`requireAdmin` loader** — uses `supabase.rpc("is_admin")` (org-scoped) instead of `profile.role`
- [x] **Plan tiers** — `free` (up to 5 borrowers / 20 active loans), `pro` (unlimited), `owner` (unlimited, no restrictions); `PlanBadge` shared component
- [x] `src/types/enums.ts` — `RegionType` and `CurrencyType` are now `string` (free-form after migration 010)
- [x] `src/types/database.ts` — manually updated to reflect migration 010 (enum columns → `string`); will be regenerated by `npm run gen:types` after migration is applied

### Flexible Multi-Country / Currency
- [x] **`countries-list`** npm package — bundled ISO 3166-1 + ISO 4217 data, no API calls
- [x] **`src/lib/countries.ts`** — `getFlagEmoji`, `getCountryName`, `getDefaultCurrency`, `getCountryOptions`, `filterCountries`
- [x] **`CountryPicker`** component — popover-based searchable dropdown; search by name, ISO code, or currency; flag + name + currency code display
- [x] **`RegionBadge` / `RegionLabel`** — now universal; works with any ISO alpha-2 code; deterministic colour palette
- [x] All hardcoded `"UAE"` / `"PH"` / `"PHP"` / `"AED"` references eliminated from frontend logic:
  - `AddLoanDrawer` — `regionToCurrency` now uses `getDefaultCurrency(region)`
  - `BorrowerDetailPage` — `defaultCurrency` uses `getDefaultCurrency`; expense tab region uses borrower's actual region
  - `InviteBorrowerDrawer` — replaced 2-button picker with `CountryPicker`
  - `useAdminStats` — fully dynamic `Record<string, RegionStat>` and `Record<string, number>`
  - `useBorrowerStatement` — `summary` is now `Record<string, CurrencySummary>`
  - `LoanStatementDrawer` + `statementExport.ts` — dynamic multi-currency summary rows
  - `schema.ts` — all `region: "UAE"` updated to `region: "AE"`
  - `LoansPage` — region filter updated to `"AE"`

### Expense Tabs Module
- [x] Database schema: `expense_tabs` → `expense_periods` → `expense_items` + `expense_payments`
- [x] Expense Tabs list page (`/tabs`): admin sees all; borrower redirected to their own tab
- [x] Expense Tab Detail page (`/tabs/:id`): totals card, month pills, QuickAdd bar, lock/unlock, payment recording, delete item/payment
- [x] Export expense tab as **PDF** or **CSV**

### Profile Page
- [x] Display name, region (with flag), role
- [x] Avatar upload (Supabase Storage) + DiceBear avatar selector
- [x] Change password form
- [x] Full Name update syncs to `organizations.name` (admin only) — org name = lender name in P2P context

### UI / Design System
- [x] `CountryPicker` — searchable popover, any ISO country, flag + name + currency
- [x] `RegionBadge` / `RegionLabel` — universal ISO alpha-2 support
- [x] `PlanBadge` — free / pro / owner (amber + Crown icon)
- [x] `BorrowerLoanGroup` + `CompactLoanRow` — shared collapsible borrower group component (used on Loans page and Admin dashboard)
- [x] `RefreshButton`, `GlobalLoadingBar`, `StatCard`
- [x] shadcn/ui: Button, Input, Label, Calendar, Popover, Card, Sonner (toast), PasswordInput
- [x] Framer Motion: card entrances, sidebar indicator, drawer slides, collapse animations

### Deployment & Infrastructure
- [x] `vercel.json` — SPA rewrites, `no-cache` for `index.html`, `immutable` 1-year for `/assets/*`
- [x] Vercel Analytics integrated
- [x] PWA manifest (vite-plugin-pwa), icons 192×192 and 512×512
- [x] `npm run gen:types` script — regenerates `src/types/database.ts` from live Supabase schema

---

## Known Limitations

- Payment proof storage has no CDN or expiry policy configured.
- The expense tab module has no "delete period" action — removing all items from a month leaves an empty period row.
- Tabby installment amounts cannot be edited after loan creation — admin must delete and re-create the loan.
- Billing enforcement (free plan borrower/loan caps) is not yet wired up in the frontend or enforced via RLS.
- No push notifications for due date reminders (Web Push Phase 2 not yet implemented).
- No FX conversion utility — multi-currency totals are always kept separate per currency.

---

## Pending Ops Tasks

1. Run `npm run gen:types` to sync `database.ts` with the live schema (after migrations 008–010)
2. `supabase secrets set OWNER_EMAIL=marcpfrancisco@gmail.com`
3. Redeploy `supabase functions deploy register-lender`
4. Redeploy `supabase functions deploy invite-borrower`

---

## Roadmap

### High Priority

#### Web Push Notifications (Phase 2)
Upgrade in-app notifications to system-level pushes. The `create_notification()` function is the only change point.
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

- **Loan statement — include expense tab**: merge expense tab history into PDF/CSV export
- **Expense tab — edit item**: inline edit for description + amount (currently delete-and-re-add only)
- **Expense tab — delete period**: remove empty month rows
- **Admin bulk operations**: bulk mark installments paid, bulk lock/unlock periods
- **FX conversion utility**: `Money` class + admin-configurable exchange rate for unified outstanding total

### Low Priority / Nice to Have

- **Borrower dashboard improvements**: expense tab summary card, payment timeline
- **Audit log**: Postgres trigger writing to `audit_log` for sensitive operations
- **Multi-admin support**: "co-admin" or "viewer" role
- **React Native / Expo app**: mobile app sharing the same hooks and Supabase backend
- **Automated CI**: GitHub Actions running `type-check` + `build` on every PR
- **End-to-end tests**: Playwright covering login, invite borrower, add expense item, export PDF

---

## File Reference

```
src/
├── components/
│   ├── admin/
│   │   ├── BorrowersList.tsx         # Borrower list with statement button
│   │   ├── CreditSourcesDrawer.tsx   # Credit sources CRUD — dynamic country tabs, CountryPicker
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
│   │   ├── AddLoanDrawer.tsx         # New loan form
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
│   ├── useCreditSourceMutations.ts
│   ├── useCreditSources.ts
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
│   ├── LoansPage.tsx                 # Grouped by borrower (admin) / flat cards (borrower)
│   ├── LoginPage.tsx
│   ├── OrgPickerPage.tsx             # /org-picker — multi-org context switcher
│   ├── OrgSettingsPage.tsx           # /org-settings — name + country + workspace info
│   ├── ProfilePage.tsx
│   ├── ResetPasswordPage.tsx
│   └── SignupPage.tsx
├── types/
│   ├── database.ts                   # Auto-generated (run npm run gen:types after migrations)
│   ├── enums.ts                      # Hand-maintained aliases; RegionType/CurrencyType = string
│   └── schema.ts                     # Loan type configs + FirstDueStrategy
└── router.tsx
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
│   └── 010_flexible_regions.sql      # region/currency enums → text; UAE → AE
└── email-templates/
    ├── invite-user.html
    └── reset-password.html
```
