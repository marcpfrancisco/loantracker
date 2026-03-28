# Global Loan Tracker

A high-end Progressive Web App (PWA) for tracking personal loans across multiple regions (Philippines and UAE) with multi-currency support and role-based access control.

## Purpose

Global Loan Tracker is a private, multi-tenant loan management system designed for a single administrator managing borrowers across two regions. Borrowers can track their own loans, submit payment proofs, and manage their profiles. The administrator has full visibility across all borrowers, loans, and payment activity.

**Key capabilities:**

- Role-based access — Admin sees everything; borrowers see only their own data
- Multi-region support — Philippines (PHP) and UAE (AED) with separate loan templates
- Loan lifecycle management — active, completed, defaulted, and cancelled states
- Installment tracking — per-installment payment status with proof submission and review
- Payment proof workflow — borrowers upload receipts; admin approves or rejects with notes
- Email notifications — invite, reset password, proof rejection via Resend
- Avatar system — DiceBear generated avatars or custom photo upload
- Offline-capable — PWA with service worker caching for loan data

---

## Requirements

### Accounts and Services

| Service | Purpose |
|---|---|
| [Supabase](https://supabase.com) | Database, Auth, Storage, Edge Functions |
| [Vercel](https://vercel.com) | Hosting and deployment |
| [Resend](https://resend.com) | Transactional email (proof rejection notifications) |

### Local Development Tools

- **Node.js** v18 or later
- **npm** v9 or later
- **Supabase CLI** — `npm install -g supabase` (required for Edge Functions)

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd loantracker
```

### 2. Install dependencies

```bash
npm install
```

> The project uses `.npmrc` with `legacy-peer-deps=true` for compatibility with `vite-plugin-pwa`.

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-public-key
```

Both values are found in your Supabase project under **Settings → API**.

### 4. Run the Supabase database migration

Open the Supabase SQL Editor for your project and run the full migration script:

```
supabase/migrations/001_initial_schema.sql
```

This creates all tables, enums, RLS policies, triggers, indexes, and seeds the initial credit sources.

After running the migration, apply any pending schema updates:

```sql
ALTER TYPE public.loan_type ADD VALUE 'lazcredit';
ALTER TYPE public.loan_type ADD VALUE 'maribank_credit';

UPDATE public.credit_sources SET name = 'Maribank', type = 'bnpl' WHERE name = 'Seabank';
UPDATE public.credit_sources SET name = 'Shopee',   type = 'bnpl' WHERE name = 'SPayLater';

INSERT INTO public.credit_sources (name, type, region)
VALUES ('Lazada', 'bnpl', 'PH')
ON CONFLICT (name, region) DO NOTHING;

DELETE FROM public.credit_sources WHERE name IN ('BPI', 'Metrobank');

ALTER TABLE payment_proofs ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE payment_proofs ALTER COLUMN file_url DROP NOT NULL;
```

### 5. Configure Supabase Storage buckets

In the Supabase dashboard under **Storage**, create two buckets:

| Bucket | Visibility |
|---|---|
| `avatars` | Public |
| `payment-receipts` | Private |

### 6. Create the admin user

In the Supabase dashboard under **Authentication → Users**, create the admin user manually using **Add User**. After the user is created, run this in the SQL Editor to grant admin role:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = '<admin-user-uuid>';
```

> Do not insert admin users directly via SQL — the `handle_new_user` trigger must fire on `auth.users` to create the profile row.

### 7. Apply email templates

In the Supabase dashboard under **Authentication → Email Templates**, paste the HTML from the corresponding file in `supabase/email-templates/` for each template type:

| Template | File |
|---|---|
| Confirm signup | `confirm-signup.html` |
| Invite user | `invite-user.html` |
| Reset password | `reset-password.html` |
| Password changed | `password-changed.html` |

### 8. Deploy Edge Functions

```bash
npx supabase login
npx supabase link --project-ref your-project-ref

npx supabase functions deploy invite-borrower --no-verify-jwt
npx supabase functions deploy notify-rejection --no-verify-jwt
```

Set the required secrets:

```bash
npx supabase secrets set SITE_URL=https://your-domain.com
npx supabase secrets set BREVO_API_KEY=re_your_api_key
npx supabase secrets set BREVO_FROM_EMAIL=noreply@yourdomain.com
```

### 9. Configure Supabase Auth redirect URLs

In the Supabase dashboard under **Authentication → URL Configuration**:

- **Site URL** — set to your production domain (e.g. `https://your-domain.vercel.app`)
- **Redirect URLs** — add `https://your-domain.vercel.app/reset-password`

---

## Local Development

```bash
npm run dev
```

The app runs at `http://localhost:5173` by default.

### Available scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run type-check` | Run TypeScript type checking without emitting |
| `npm run lint` | Run ESLint across the project |
| `npm run lint:fix` | Run ESLint and auto-fix issues |
| `npm run format` | Format all files with Prettier |
| `npm run format:check` | Check formatting without writing |

---

## Production Deployment

### Deploy to Vercel

1. Push your repository to GitHub.
2. Import the repository in the [Vercel dashboard](https://vercel.com/new).
3. Under **Environment Variables**, add:

   | Variable | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | Your Supabase project URL |
   | `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Your Supabase anon/public key |

4. Deploy. Vercel auto-detects Vite and sets the build command to `npm run build` with output directory `dist`.

### Update Edge Function secrets for production

```bash
npx supabase secrets set SITE_URL=https://your-production-domain.com
```

---

## Project Structure

```
src/
├── components/
│   ├── admin/          # Admin-specific components (StatCard, BorrowersList, InviteBorrowerDrawer)
│   ├── dashboard/      # Shared dashboard components (LoanCard, UpcomingPayments)
│   ├── layout/         # App shell (DashboardLayout, Sidebar, TopBar, BottomNav)
│   └── loans/          # Loan components (AddLoanDrawer, InstallmentRow, modals)
├── context/            # React context (AuthContext, ThemeContext)
├── hooks/              # All Supabase data-fetching and mutation hooks
├── lib/                # Utilities (supabase client, animations, loaders, utils)
├── pages/              # Route-level page components
├── types/              # TypeScript types (database schema, loan schema config)
└── router.tsx          # React Router v7 route definitions

supabase/
├── functions/          # Edge Functions (invite-borrower, notify-rejection)
├── migrations/         # SQL migration scripts
└── email-templates/    # HTML email templates for Supabase Auth
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite 8 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Animations | Framer Motion |
| Routing | React Router v7 |
| Data fetching | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| PWA | vite-plugin-pwa + Workbox |
| Email | Resend (via Edge Function) |
| Deployment | Vercel |
