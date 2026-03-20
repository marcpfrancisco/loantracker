# Project: Global Loan Tracker

A high-end, multi-tenant PWA for tracking personal loans across different regions (Philippines & UAE) with multi-currency support.

## Tech Stack

- **Frontend:** React (Vite), TypeScript, TailwindCSS, shadcn/ui, Framer Motion - motion.dev (for luxury transitions).
- **Backend/BaaS:** Supabase (Auth, PostgreSQL, RLS, Storage for receipts).
- **Deployment:** Vercel (PWA enabled via vite-plugin-pwa).
- **Icons:** Lucide-react.

## Core Logic & Rules

- **Multi-Tenancy:** Strictly enforce Row Level Security (RLS). Users (Borrowers) must only see their own data. The Owner (Person 1) sees all.
- **Regional Logic:** - **PH:** Support PHP. Templates for SLoan, GLoan, SPayLater (fixed installments).
  - **UAE:** Support AED. Templates for Tabby (4-part split), Credit Cards.
- **Currency:** Handle PHP and AED separately. Do not mix totals without a clear FX conversion utility.
- **Principles:** Follow **SOLID** (especially Single Responsibility for hooks) and **DRY** (shared components for currency inputs/cards).

## Database Schema (Supabase/Postgres)

- `profiles`: id (uuid), full_name, role (admin/borrower), region (PH/UAE).
- `credit_sources`: id, name (e.g., Seabank), type (E-wallet/CC), region.
- `loans`: id, borrower_id, source_id, principal, currency, installments_total, status.
- `installments`: id, loan_id, due_date, amount, status (unpaid/pending/paid), receipt_url.

## Coding Standards

- **Naming:** PascalCase for components, camelCase for functions/variables.
- **Components:** Use shadcn/ui for primitives. Keep components small.
- **Data Fetching:** Use Custom Hooks (`useLoans`, `usePayments`) to separate UI from Supabase logic.
- **State:** Use `React Context` for global user state; `Zustand` for complex UI state if needed.
- **Security:** Never trust the frontend for totals. Use PostgreSQL Views or RPCs for sensitive calculations (e.g., total outstanding).

## Implementation Patterns

- **The "Luxury" Feel:** Use `Framer Motion` for layout transitions and `AnimatePresence`.
- **Offline First:** Ensure the PWA manifest is configured for offline viewing of the current loan status.
- **Validation:** Use `Zod` with `react-hook-form` for all loan entries.

## Development Commands

- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Type Check: `npm run type-check`
- Add UI Component: `npx shadcn-ui@latest add [component]`

## Strict Technical Constraints

- **Language:** TypeScript only. No `any`. Use interfaces for Supabase row types.
- **Styling:** Tailwind CSS. Primary color palette: Slate/Zinc (Dark Mode by default).
- **Architecture:** logic belongs in `/hooks`. Components in `/components` (UI vs. Logic).
- **Security:** RLS (Row Level Security) is non-negotiable. Every query must filter by `auth.uid()`.
- **Currency:** Use the `Money` utility class in `@/lib/utils` for all PHP/AED conversions.

## PWA Rules

- Ensure `vite-plugin-pwa` is configured for "Prompt for update."
- Icons must be available in 192x192 and 512x512.
