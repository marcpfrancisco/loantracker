# Project Memory & Status

## ✅ Completed

### Infrastructure
- [x] Supabase SQL migration (`supabase/migrations/001_initial_schema.sql`) — run in Supabase
  - 5 tables: profiles, credit_sources, loans, installments, payment_proofs
  - 8 enums, RLS policies, triggers, 13 indexes, seed data for credit_sources
  - `is_admin()` SECURITY DEFINER helper to prevent RLS recursion
- [x] TypeScript path aliases (`@/*` → `src/*`), Vite config, PWA plugin
- [x] ESLint + Prettier with `prettier-plugin-tailwindcss`
- [x] Admin user created: `marcpfrancisco@gmail.com`, role=`admin`, region=`PH`
  - Created via Supabase Auth Dashboard (NOT direct SQL insert — breaks GoTrue)
  - Profile elevated via SQL UPDATE after trigger auto-created the row
- [x] `.vscode/settings.json` — `deno.enablePaths: ["supabase/functions"]` to avoid TS errors in Edge Functions
- [x] `supabase/functions/deno.json` — Deno import map for Edge Functions

### Auth UI
- [x] Login page — email/password, react-hook-form + Zod, generic error message
- [x] Forgot password page — always shows success (no email enumeration)
- [x] Reset password page — handles `type=recovery` AND `type=invite` via `verifyOtp`
  - Detects `token_hash` + `type` from URL search params
  - Shows "Set your password" / "Create password" copy for invite flow
  - On success redirects to `/dashboard`
- [x] Logout redirect — `AuthContext.tsx` handles `SIGNED_OUT` event via `window.location.replace('/login')`
  - Covers both manual logout AND automatic session expiry
  - Uses `window.location` to avoid circular dependency with the RR7 router

### Session Config (Manual Supabase Step — Done)
- [x] Session strategy: 7-day sliding window with refresh token rotation
  - Refresh token expiry: `604800` seconds
  - Active users never get kicked out; inactive for 7+ days → SIGNED_OUT → redirect to login

### Dashboard Layout (Module A)
- [x] `Sidebar` — desktop, Framer Motion `layoutId` animated active indicator
- [x] `TopBar` — mobile header, region badge + initials avatar
- [x] `BottomNav` — mobile fixed tab bar with animated indicator
- [x] `DashboardLayout` — shell wrapping all protected pages
- [x] Router updated to nested layout routes (pathless parent with `requireAuth`)

### Admin Dashboard (Module B)
- [x] `useAdminStats` — borrower count, active loans by region (PH/UAE), pending proofs
- [x] `useAdminBorrowers` — borrowers list with active/total loan counts
- [x] `StatCard`, `BorrowersList` components
- [x] `AdminPage` — staggered stat grid + clickable borrowers list + "Invite Borrower" button

### Borrower Dashboard (Module C)
- [x] `useMyLoans` — current user's loans with paidCount, pendingCount, nextDueDate
- [x] `useUpcomingInstallments` — next 8 payments sorted by urgency
- [x] `LoanCard` — shared card; `LoanCardData` interface; optional `borrowerName` prop (admin view)
- [x] `UpcomingPayments` — sorted payment list with urgency highlighting
- [x] `DashboardPage` — personalized greeting, active/past loans, upcoming payments

### Loans Page (Module A)
- [x] `useLoans` — TanStack Query, RLS-aware (admin sees all, borrower sees own)
- [x] `LoansPage` — status + region filter pills, staggered grid, context-aware empty states
  - Region filter hidden for borrowers (single-region accounts)

### Add Loan Form (Module B)
- [x] `useCreditSources` — active sources filtered by region
- [x] `useCreateLoan` — two-step: insert loan → batch insert installments; rounding on last installment
- [x] `AddLoanDrawer` — right-side spring slide-over (w-full mobile, 480px desktop)
  - Borrower selector auto-derives region + currency, resets credit source on change
  - Loan type templates: Tabby (4 parts, 0%), SLoan, GLoan, SPayLater, Credit Card, Custom (filtered by region)
  - `z.preprocess` + explicit `FormData` type + `zodResolver cast` to fix TypeScript inference

### Loan Detail Page (Module C)
- [x] `useLoanDetail` — single loan with credit_source, borrower profile, installments sorted by no.
- [x] `useUpdateInstallment` — optimistic updates, rollback on error, per-status toast messages
- [x] `useUpdateLoanStatus` — optimistic updates; sets/clears `ended_at`; toast per status
- [x] `InstallmentRow` — action variant system (primary/success/ghost); opens modals for submit/review
- [x] `LoanDetailPage` — loan summary, progress bar, admin status actions, full installments list

### Payment Proof Upload (Medium Priority — Done)
- [x] Supabase Storage bucket `payment-receipts` created with RLS policies
- [x] `useSubmitPaymentProof` — uploads to `{borrowerId}/{loanId}/{installmentId}/{timestamp}.ext`
  - Cleans up uploaded file if DB insert fails
  - Optimistic update sets installment to `pending`
- [x] `SubmitPaymentModal` — drag-and-drop + click upload; image preview; PDF icon; 10 MB / image+PDF limit

### Admin Proof Review (Medium Priority — Done)
- [x] `useProof` — fetches latest proof + 1-hour signed URL; `staleTime: 50 min` to refresh before expiry
- [x] `useReviewProof` — approve (paid + paid_at) / reject (unpaid + admin_note); optimistic updates
- [x] `ReviewProofModal` — two-view state machine (proof → rejecting); image shrinks in rejecting view

### Toast Notifications
- [x] Sonner added via `npx shadcn@latest add sonner`
- [x] `<Toaster theme="dark" position="bottom-right" richColors closeButton />` in `App.tsx`

### Invite Borrower Flow (Medium Priority — Done)
- [x] `supabase/functions/invite-borrower/index.ts` — Edge Function
  - Deployed with `--no-verify-jwt` (gateway-level JWT check was blocking; function handles auth itself)
  - Auth pattern: anon client + `getUser(token)` — works with ES256 JWTs
  - Passes `redirectTo: ${SITE_URL}/reset-password` so invite email links to the password-set page
  - `SITE_URL` secret: set via `npx supabase secrets set SITE_URL=http://localhost:5173`
- [x] `useInviteBorrower` — mutation hook; reads `error.context` as raw Response to extract body message
- [x] `InviteBorrowerDrawer` — email + full name + region toggle (PH/UAE); info banner about borrower role
- [x] `AdminPage` updated — "Invite Borrower" button in header; `InviteBorrowerDrawer` wired

### Accept Invite Flow (Done — reuses existing page)
- [x] `/reset-password` route already handles `type=invite` (same as `type=recovery`)
- [x] Edge Function sets `redirectTo` so invite email lands on `/reset-password?token_hash=...&type=invite`
- [x] Full flow: invite email → set password → auto-redirect to `/dashboard`

---

## 🔜 Next Steps

### Pending Manual Supabase Steps
- [ ] **Auth → URL Configuration** (Production) — set Site URL + add redirect URLs
  - `https://your-domain.com` as Site URL
  - `https://your-domain.com/reset-password` as allowed redirect URL
- [ ] **Edge Function SITE_URL secret** (Production) — `npx supabase secrets set SITE_URL=https://your-domain.com`

### Remaining Features
- [ ] **PWA icons** — 192×192 and 512×512 PNGs in `public/icons/`
- [ ] **Profile page** — borrower/admin can view their profile info (name, region, role)
- [ ] **Production deployment** — Vercel deploy, env vars, Supabase URL config

### Recommendations (Future Enhancements)
- [ ] **Email notifications** — Edge Function triggered on new proof submission to notify admin
- [ ] **Payment reminders** — scheduled Edge Function (pg_cron or Supabase cron) for upcoming due dates
- [ ] **Dashboard charts** — outstanding balance over time, payment history trend
- [ ] **Export** — PDF/CSV export of loan summary for a borrower
- [ ] **Borrower profile page** — view-only: name, region, joined date, loan summary

---

## Key Architecture Decisions

- **Region is admin-controlled** — set at invite time via `raw_user_meta_data`, stored in `profiles.region`
- **Admin user creation** — must use Supabase Auth Dashboard, not direct SQL insert
- **TanStack Query everywhere** — all data fetching via custom hooks, no useState/useEffect for server state
- **`LoanCardData` interface** — shared between dashboard and loans page; one card component for both
- **Edge Function auth pattern** — anon client + `getUser(token)` for ES256 JWT projects; deploy with `--no-verify-jwt`
- **Invite flow reuses `/reset-password`** — `type=invite` detected in URL params, different copy shown
- **`window.location.replace`** for logout — avoids circular dependency (AuthContext → router → pages → AuthContext)
- **Signed URL staleTime: 50 min** — re-fetches before 1-hour Supabase Storage signed URLs expire
