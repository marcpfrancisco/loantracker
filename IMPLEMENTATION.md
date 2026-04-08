 ---                                                  
  Multi-Tenant SaaS Plan                               
                                                       
  The Core Problem                                     
                  
  The app was built single-owner. The entire data model
   assumes one admin:
  - role = 'admin' is a single global concept
  - RLS policies check auth.uid() for borrowers but the
   admin sees everything with no org boundary
  - credit_sources are global — no owner
  - Borrowers are invited but not tied to a specific
  lender

  To go multi-tenant, every row in the database needs
  to belong to an organization, and RLS must enforce
  that boundary.

  ---
  Phase 1 — Data Model: Organizations (The Foundation)

  Everything else depends on this. Can't skip or defer.

  New tables:

  -- One record per lender (their "workspace")
  CREATE TABLE organizations (
    id          uuid PRIMARY KEY DEFAULT
  gen_random_uuid(),
    name        text NOT NULL,         -- "John's
  Lending"
    slug        text UNIQUE NOT NULL,  -- future:
  subdomains
    region      region_type NOT NULL,  -- default
  region
    plan        text NOT NULL DEFAULT 'free', -- 'free'
   | 'pro'
    created_at  timestamptz NOT NULL DEFAULT now()
  );

  -- Who belongs to which org and in what role
  CREATE TABLE org_members (
    id         uuid PRIMARY KEY DEFAULT
  gen_random_uuid(),
    org_id     uuid NOT NULL REFERENCES
  organizations(id) ON DELETE CASCADE,
    user_id    uuid NOT NULL REFERENCES auth.users(id)
  ON DELETE CASCADE,
    role       user_role NOT NULL, -- 'owner' |
  'borrower' (expand later for 'member')
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(org_id, user_id)
  );

  Changes to existing tables — add org_id column to:
  - profiles — org_id uuid NOT NULL REFERENCES
  organizations(id)
  - credit_sources — org_id uuid NOT NULL
  - loans — org_id uuid NOT NULL
  - expense_tabs — org_id uuid NOT NULL
  - notifications — org_id uuid NOT NULL

  ▎ installments, expense_periods, expense_items,
  expense_payments inherit org scoping through their
  parent joins — no column needed there.

  Helper RLS function (replaces repeated subqueries):
  CREATE OR REPLACE FUNCTION my_org_id()
  RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS
  $$
    SELECT org_id FROM org_members WHERE user_id =
  auth.uid() LIMIT 1;
  $$;

  CREATE OR REPLACE FUNCTION i_am_owner()
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
  AS $$
    SELECT EXISTS (
      SELECT 1 FROM org_members
      WHERE user_id = auth.uid() AND role = 'owner'
    );
  $$;

  RLS policy pattern (applied to every table):
  -- loans: owners see all in their org, borrowers see
  only their own
  CREATE POLICY "org_isolation" ON loans
    USING (org_id = my_org_id());

  CREATE POLICY "owner_insert" ON loans
    FOR INSERT WITH CHECK (org_id = my_org_id() AND
  i_am_owner());

  ---
  Phase 2 — Registration & Onboarding

  New public route: /signup

  A lender (new user) self-registers — no invite
  needed.

  Form fields:
  - Full Name
  - Email
  - Password
  - Business / Lending Name (becomes
  organizations.name)
  - Primary Region (PH or UAE)

  On submit, a single Supabase Edge Function
  register-lender does atomically:
  1. Creates auth.user via
  supabase.auth.admin.createUser()
  2. Inserts organizations row
  3. Inserts org_members row (role: 'owner')
  4. Inserts profiles row
  5. Seeds default credit_sources for their region (the
   same sources you already have)
  6. Sends welcome email via Brevo

  Why an Edge Function and not client-side? Creating
  the org + member + profile must be atomic and
  requires service-role to insert into auth.users.
  Can't do it from the browser safely.

  Role rename: admin → owner in the user_role enum. Or
  keep admin as an alias to avoid a breaking migration
  — can decide later.

  ---
  Phase 3 — Borrower Scoping

  The existing invite flow already works — borrowers
  are created via
  supabase.auth.admin.inviteUserByEmail(). The only
  change: when inviting, the Edge Function must also
  insert an org_members row tying the borrower to the
  lender's org.

  Borrowers see their own data scoped to their org —
  same as now, just with the org boundary enforced by
  RLS.

  ---
  Phase 4 — Frontend Changes

  Most hooks stay the same — RLS handles org scoping
  transparently. But:

  ┌──────────────────┬─────────────────────────────┐
  │       Area       │           Change            │
  ├──────────────────┼─────────────────────────────┤
  │ useAuth          │ Add orgId and orgName to    │
  │                  │ auth context                │
  ├──────────────────┼─────────────────────────────┤
  │ requireAdmin     │ Check role === 'owner' (or  │
  │ guard            │ keep 'admin' if enum        │
  │                  │ unchanged)                  │
  ├──────────────────┼─────────────────────────────┤
  │ LoginPage        │ Add "Sign up as lender"     │
  │                  │ link → /signup              │
  ├──────────────────┼─────────────────────────────┤
  │ SignupPage       │ New page — lender           │
  │                  │ registration form           │
  ├──────────────────┼─────────────────────────────┤
  │ AdminPage /      │ No change — RLS ensures     │
  │ DashboardPage    │ they only see their own     │
  │                  │ org's data                  │
  ├──────────────────┼─────────────────────────────┤
  │ ProfilePage      │ Add "Organization Settings" │
  │                  │  section (name, region)     │
  ├──────────────────┼─────────────────────────────┤
  │ Credit sources   │ Already scoped to org via   │
  │ drawer           │ org_id on the row           │
  └──────────────────┴─────────────────────────────┘

  ---
  Phase 5 — Billing & Limits (Optional, defer to later)

  Once you have multiple orgs, you'll want to limit
  free-tier accounts:

  ┌─────────────────────┬──────┬───────────┐
  │        Limit        │ Free │    Pro    │
  ├─────────────────────┼──────┼───────────┤
  │ Borrowers           │ 3    │ Unlimited │
  ├─────────────────────┼──────┼───────────┤
  │ Active loans        │ 10   │ Unlimited │
  ├─────────────────────┼──────┼───────────┤
  │ Expense tabs        │ 1    │ Unlimited │
  ├─────────────────────┼──────┼───────────┤
  │ Email notifications │ No   │ Yes       │
  └─────────────────────┴──────┴───────────┘

  Implementation: organizations.plan column ('free' /
  'pro') + Stripe Checkout + a webhook Edge Function
  that updates the plan on payment. Add a limit-check
  in the createLoan mutation before insert.

  ---
  What's Preserved (No Rewrite Needed)

  - All UI components — zero changes
  - All installment strategies
  - All expense tab logic
  - All PDF/CSV export
  - Notification system (just add org_id)
  - Edge functions (minor: read org context from JWT)

  What Changes Significantly

  - All RLS policies — every table gets org isolation
  (5 tables × ~3 policies = ~15 policy rewrites)
  - useAuth — needs orgId in context
  - Invite flow — must also create org_members row
  - Your existing data — needs a one-time migration to
  assign your current rows to an org_id (one org for
  you, all existing borrowers/loans migrate under it)

  ---
  Migration Risk for Existing Data

  This is the trickiest part. You have live data. The
  migration script must:

  1. Create one organizations row for your current
  setup
  2. Set org_id on your profiles, credit_sources,
  loans, expense_tabs rows
  3. Create org_members rows for all existing users
  4. Then enable RLS policies

  If this runs wrong, data becomes invisible. Must be
  done in a transaction with a dry-run check first.

  ---
  Suggested Implementation Order

  Phase 1  DB migration (organizations + org_members +
  org_id columns + RLS)
  Phase 2  register-lender Edge Function + /signup page
  Phase 3  Invite flow update (org_members on invite)
  Phase 4  useAuth context (orgId) + frontend guards
  Phase 5  Billing/limits (Stripe) — only when you have
   users

  ---