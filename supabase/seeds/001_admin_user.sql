-- =============================================================================
-- Seed: Admin User (Owner)
-- Run this in the Supabase SQL Editor AFTER 001_initial_schema.sql
--
-- ⚠️  IMPORTANT: Change the email below to your real email address.
-- ⚠️  Save the generated password somewhere secure (e.g. a password manager).
--     You can change it after first login via Profile settings.
-- =============================================================================

DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_email   text := 'marcpfrancisco@gmail.com';
  v_password text := 'zR7@wB3#qF9mK2!xN';
BEGIN


  -- 1. Insert the auth user with a bcrypt-hashed password.
  --    The handle_new_user trigger fires here and creates a profiles row (role='borrower').
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    role,
    aud,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    v_email,
    crypt(v_password, gen_salt('bf', 10)),
    now(),                  -- email pre-confirmed (no verification email needed)
    jsonb_build_object(
      'full_name', 'Marc Francisco',
      'region',    'PH'
    ),
    'authenticated',
    'authenticated',
    now(),
    now()
  );

  -- 2. Elevate the auto-created profile to admin.
  --    The trigger defaults new users to 'borrower'; we override that here.
  UPDATE public.profiles
  SET
    role      = 'admin',
    full_name = 'Marc Francisco',
    region    = 'PH'
  WHERE id = v_user_id;

END $$;

-- Verify: should return 1 row with role = 'admin'
-- SELECT id, full_name, role, region FROM public.profiles WHERE full_name = 'Marc Francisco';
