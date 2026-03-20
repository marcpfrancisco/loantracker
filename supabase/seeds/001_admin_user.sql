-- =============================================================================
-- Seed: Admin User (Owner)
--
-- ⚠️  DO NOT run this in the SQL Editor directly.
--     Direct inserts into auth.users break GoTrue's internal state.
--
-- CORRECT PROCESS:
-- 1. Go to Supabase Dashboard → Authentication → Users → "Add user"
--    - Email:    marcpfrancisco@gmail.com
--    - Password: (set a strong password)
--    - Check "Auto Confirm User"
--
-- 2. After the user is created, run ONLY the UPDATE below in the SQL Editor
--    to elevate the auto-created profile to admin role.
-- =============================================================================

UPDATE public.profiles
SET
  role      = 'admin',
  full_name = 'Marc Francisco',
  region    = 'PH'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'marcpfrancisco@gmail.com'
);

-- Verify: should return 1 row with role = 'admin'
-- SELECT id, full_name, role, region FROM public.profiles WHERE role = 'admin';
