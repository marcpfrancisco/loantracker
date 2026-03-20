-- =============================================================================
-- Global Loan Tracker — Initial Schema Migration
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SECTION 1: ENUMS
-- -----------------------------------------------------------------------------

CREATE TYPE public.user_role AS ENUM ('admin', 'borrower');
CREATE TYPE public.region_type AS ENUM ('PH', 'UAE');
CREATE TYPE public.currency_type AS ENUM ('PHP', 'AED');
CREATE TYPE public.loan_status AS ENUM ('active', 'completed', 'defaulted', 'cancelled');
CREATE TYPE public.payment_status AS ENUM ('unpaid', 'pending', 'paid');
CREATE TYPE public.credit_source_type AS ENUM ('e_wallet', 'credit_card', 'bnpl', 'bank_transfer');
CREATE TYPE public.loan_type AS ENUM ('tabby', 'sloan', 'gloan', 'spaylater', 'credit_card', 'custom');
CREATE TYPE public.proof_status AS ENUM ('pending', 'approved', 'rejected');


-- -----------------------------------------------------------------------------
-- SECTION 2: SHARED TRIGGER FUNCTION (no table dependency)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- -----------------------------------------------------------------------------
-- SECTION 3: TABLES
-- -----------------------------------------------------------------------------

-- profiles
-- PK mirrors auth.users.id — NOT a generated UUID.
CREATE TABLE public.profiles (
  id          uuid            PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text            NOT NULL,
  role        public.user_role    NOT NULL DEFAULT 'borrower',
  region      public.region_type  NOT NULL DEFAULT 'PH',
  avatar_url  text,
  created_at  timestamptz     NOT NULL DEFAULT now(),
  updated_at  timestamptz     NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'One row per authenticated user. Role assignment is admin-only.';
COMMENT ON COLUMN public.profiles.avatar_url IS 'Supabase Storage URL. Generated on frontend from path.';


-- credit_sources (admin-managed reference data, not user-created)
CREATE TABLE public.credit_sources (
  id          uuid                        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text                        NOT NULL,
  type        public.credit_source_type   NOT NULL,
  region      public.region_type          NOT NULL,
  is_active   boolean                     NOT NULL DEFAULT true,
  created_at  timestamptz                 NOT NULL DEFAULT now(),
  updated_at  timestamptz                 NOT NULL DEFAULT now(),
  UNIQUE(name, region)
);

COMMENT ON TABLE public.credit_sources IS 'Reference table of lenders/wallets. Managed by admin only.';
COMMENT ON COLUMN public.credit_sources.is_active IS 'Soft-delete flag. Borrowers see only active=true sources.';


-- loans (core business entity)
CREATE TABLE public.loans (
  id                  uuid                NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  borrower_id         uuid                NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  source_id           uuid                NOT NULL REFERENCES public.credit_sources(id) ON DELETE RESTRICT,
  loan_type           public.loan_type    NOT NULL DEFAULT 'custom',
  currency            public.currency_type NOT NULL,
  principal           numeric(12, 2)      NOT NULL CHECK (principal > 0),
  interest_rate       numeric(5, 4),      -- stored as decimal: 0.0350 = 3.5%
  service_fee         numeric(10, 2)      NOT NULL DEFAULT 0,
  installments_total  integer             NOT NULL CHECK (installments_total > 0),
  due_day_of_month    integer             CHECK (due_day_of_month BETWEEN 1 AND 31),
  status              public.loan_status  NOT NULL DEFAULT 'active',
  region              public.region_type  NOT NULL, -- denormalized for query efficiency
  notes               text,
  started_at          date                NOT NULL DEFAULT CURRENT_DATE,
  ended_at            date,
  created_at          timestamptz         NOT NULL DEFAULT now(),
  updated_at          timestamptz         NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.loans IS 'Core financial record. Totals are never trusted from frontend — use views/RPCs.';
COMMENT ON COLUMN public.loans.interest_rate IS 'Decimal format: 0.0350 = 3.5%. NULL for flat-fee or Tabby-style loans.';
COMMENT ON COLUMN public.loans.due_day_of_month IS 'Statement cycle day. Used only for credit_card loan_type.';
COMMENT ON COLUMN public.loans.region IS 'Denormalized from borrower profile for efficient aggregation queries.';


-- installments (children of loans)
CREATE TABLE public.installments (
  id              uuid                    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id         uuid                    NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  installment_no  integer                 NOT NULL CHECK (installment_no > 0),
  due_date        date                    NOT NULL,
  amount          numeric(10, 2)          NOT NULL CHECK (amount > 0),
  status          public.payment_status   NOT NULL DEFAULT 'unpaid',
  receipt_url     text,                   -- Supabase Storage path (not full URL)
  paid_at         timestamptz,            -- set by trigger on status → 'paid'
  created_at      timestamptz             NOT NULL DEFAULT now(),
  updated_at      timestamptz             NOT NULL DEFAULT now(),
  UNIQUE(loan_id, installment_no)
);

COMMENT ON TABLE public.installments IS 'Installment schedule. Borrowers can only move status to pending via RLS.';
COMMENT ON COLUMN public.installments.receipt_url IS 'Supabase Storage path. Frontend calls createSignedUrl() to display.';
COMMENT ON COLUMN public.installments.paid_at IS 'Business timestamp. Set automatically by trigger on status = paid.';


-- payment_proofs (borrower-submitted evidence)
CREATE TABLE public.payment_proofs (
  id              uuid                NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  installment_id  uuid                NOT NULL REFERENCES public.installments(id) ON DELETE CASCADE,
  submitted_by    uuid                NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  file_url        text                NOT NULL, -- Supabase Storage path
  status          public.proof_status NOT NULL DEFAULT 'pending',
  admin_note      text,               -- rejection reason or approval note
  reviewed_by     uuid                REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at     timestamptz,
  created_at      timestamptz         NOT NULL DEFAULT now(),
  updated_at      timestamptz         NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payment_proofs IS 'Immutable audit log of payment submissions. No DELETE for borrowers.';
COMMENT ON COLUMN public.payment_proofs.file_url IS 'Supabase Storage path under payment-receipts/ bucket.';
COMMENT ON COLUMN public.payment_proofs.reviewed_by IS 'SET NULL on admin profile delete — preserves proof record integrity.';


-- -----------------------------------------------------------------------------
-- SECTION 4: SECURITY HELPER FUNCTION
-- Must be created AFTER profiles table exists.
-- SECURITY DEFINER prevents infinite RLS recursion when called within
-- policies on the profiles table itself.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
STABLE
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'Returns true if the current auth user is an admin. SECURITY DEFINER to '
  'avoid infinite recursion in RLS policies on the profiles table.';


-- -----------------------------------------------------------------------------
-- SECTION 5: TRIGGER FUNCTIONS
-- -----------------------------------------------------------------------------

-- Auto-create a profile row when a new auth user is created.
-- The frontend should pass { full_name, region } in supabase.auth.signUp() data.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, region)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    'borrower',
    COALESCE(
      (NEW.raw_user_meta_data ->> 'region')::public.region_type,
      'PH'
    )
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Triggered on auth.users INSERT. Creates a default borrower profile. '
  'Admin role must be granted manually via SQL UPDATE.';


-- Auto-set paid_at when installment transitions to/from paid.
CREATE OR REPLACE FUNCTION public.handle_installment_paid_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
    NEW.paid_at = now();
  ELSIF NEW.status <> 'paid' AND OLD.status = 'paid' THEN
    NEW.paid_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_installment_paid_at() IS
  'Business-level timestamp management. Distinct from updated_at which fires on any change.';


-- -----------------------------------------------------------------------------
-- SECTION 6: TRIGGERS
-- -----------------------------------------------------------------------------

-- Auth hook: auto-create profile on new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- updated_at triggers for all 5 tables
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_credit_sources_updated_at
  BEFORE UPDATE ON public.credit_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_loans_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_installments_updated_at
  BEFORE UPDATE ON public.installments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_payment_proofs_updated_at
  BEFORE UPDATE ON public.payment_proofs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Business logic: auto-set paid_at on installments
CREATE TRIGGER trigger_installments_paid_at
  BEFORE UPDATE ON public.installments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_installment_paid_at();


-- -----------------------------------------------------------------------------
-- SECTION 7: ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;


-- ── profiles ──────────────────────────────────────────────────────────────────

-- Admins see all profiles
CREATE POLICY "admins_select_all_profiles"
  ON public.profiles
  FOR SELECT
  USING (public.is_admin());

-- Borrowers see only their own profile
CREATE POLICY "borrowers_select_own_profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Admins can update any profile (including promoting roles)
CREATE POLICY "admins_update_any_profile"
  ON public.profiles
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Borrowers can update their own profile — but cannot change their own role.
-- The WITH CHECK subquery pins role to whatever the DB currently holds.
CREATE POLICY "borrowers_update_own_profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- INSERT allowed (used by handle_new_user trigger via SECURITY DEFINER + service role)
CREATE POLICY "service_insert_profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);


-- ── credit_sources ────────────────────────────────────────────────────────────

-- Admins have full CRUD on credit sources
CREATE POLICY "admins_all_credit_sources"
  ON public.credit_sources
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Borrowers can only read active credit sources
CREATE POLICY "borrowers_select_active_credit_sources"
  ON public.credit_sources
  FOR SELECT
  USING (is_active = true);


-- ── loans ─────────────────────────────────────────────────────────────────────

-- Admins see all loans
CREATE POLICY "admins_select_all_loans"
  ON public.loans
  FOR SELECT
  USING (public.is_admin());

-- Admins can create loans
CREATE POLICY "admins_insert_loans"
  ON public.loans
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Admins can update any loan
CREATE POLICY "admins_update_loans"
  ON public.loans
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins can delete loans
CREATE POLICY "admins_delete_loans"
  ON public.loans
  FOR DELETE
  USING (public.is_admin());

-- Borrowers see only their own loans
CREATE POLICY "borrowers_select_own_loans"
  ON public.loans
  FOR SELECT
  USING (borrower_id = auth.uid());


-- ── installments ──────────────────────────────────────────────────────────────

-- Admins have full CRUD on installments
CREATE POLICY "admins_all_installments"
  ON public.installments
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Borrowers can SELECT their own installments (via loan ownership)
CREATE POLICY "borrowers_select_own_installments"
  ON public.installments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.loans
      WHERE loans.id = installments.loan_id
        AND loans.borrower_id = auth.uid()
    )
  );

-- Borrowers can UPDATE an installment — but only to set status = 'pending'.
-- USING: they can only target their own installments.
-- WITH CHECK: the resulting row must have status = 'pending' (cannot set paid or revert to unpaid).
CREATE POLICY "borrowers_mark_installment_pending"
  ON public.installments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.loans
      WHERE loans.id = installments.loan_id
        AND loans.borrower_id = auth.uid()
    )
  )
  WITH CHECK (status = 'pending');


-- ── payment_proofs ────────────────────────────────────────────────────────────

-- Admins see all payment proofs
CREATE POLICY "admins_select_all_proofs"
  ON public.payment_proofs
  FOR SELECT
  USING (public.is_admin());

-- Admins can update proof status (approve/reject)
CREATE POLICY "admins_update_proofs"
  ON public.payment_proofs
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Borrowers see only their own submitted proofs
CREATE POLICY "borrowers_select_own_proofs"
  ON public.payment_proofs
  FOR SELECT
  USING (submitted_by = auth.uid());

-- Borrowers can INSERT a proof — but only for their own installments.
-- Compound WITH CHECK prevents submitting a proof for another borrower's installment.
CREATE POLICY "borrowers_insert_own_proofs"
  ON public.payment_proofs
  FOR INSERT
  WITH CHECK (
    submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.installments i
      JOIN public.loans l ON l.id = i.loan_id
      WHERE i.id = payment_proofs.installment_id
        AND l.borrower_id = auth.uid()
    )
  );


-- -----------------------------------------------------------------------------
-- SECTION 8: INDEXES
-- -----------------------------------------------------------------------------

-- loans
CREATE INDEX idx_loans_borrower_id        ON public.loans(borrower_id);
CREATE INDEX idx_loans_status             ON public.loans(status);
CREATE INDEX idx_loans_region_currency    ON public.loans(region, currency);
CREATE INDEX idx_loans_source_id          ON public.loans(source_id);

-- installments
CREATE INDEX idx_installments_loan_id     ON public.installments(loan_id);
CREATE INDEX idx_installments_status      ON public.installments(status);
CREATE INDEX idx_installments_due_date    ON public.installments(due_date);
CREATE INDEX idx_installments_loan_status ON public.installments(loan_id, status);

-- payment_proofs
CREATE INDEX idx_proofs_installment_id    ON public.payment_proofs(installment_id);
CREATE INDEX idx_proofs_submitted_by      ON public.payment_proofs(submitted_by);
CREATE INDEX idx_proofs_status            ON public.payment_proofs(status);

-- profiles
CREATE INDEX idx_profiles_role            ON public.profiles(role);

-- credit_sources
CREATE INDEX idx_credit_sources_region    ON public.credit_sources(region);


-- -----------------------------------------------------------------------------
-- SECTION 9: SEED DATA — credit_sources (admin-managed reference data)
-- -----------------------------------------------------------------------------

INSERT INTO public.credit_sources (name, type, region) VALUES
  -- Philippines
  ('Seabank',       'e_wallet',     'PH'),
  ('GCash',         'e_wallet',     'PH'),
  ('SPayLater',     'bnpl',         'PH'),
  ('BPI',           'credit_card',  'PH'),
  ('Metrobank',     'credit_card',  'PH'),
  -- UAE
  ('Tabby',         'bnpl',         'UAE'),
  ('Emirates NBD',  'credit_card',  'UAE'),
  ('Mashreq',       'credit_card',  'UAE'),
  ('ADCB',          'credit_card',  'UAE');


-- =============================================================================
-- VERIFICATION QUERIES (run these after migration to confirm success)
-- =============================================================================

-- 1. List all tables
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- 2. List all enums and their values
-- SELECT typname, enumlabel FROM pg_enum JOIN pg_type ON pg_type.oid = pg_enum.enumtypid ORDER BY typname, enumsortorder;

-- 3. List all triggers (public schema)
-- SELECT trigger_name, event_object_table, action_timing, event_manipulation
-- FROM information_schema.triggers WHERE trigger_schema = 'public' ORDER BY event_object_table;

-- 4. Confirm auth trigger exists
-- SELECT trigger_name FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass;

-- 5. List all indexes
-- SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename;

-- 6. List all RLS policies
-- SELECT schemaname, tablename, policyname, cmd, qual FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
