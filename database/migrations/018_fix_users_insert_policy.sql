-- =============================================================================
-- FIX USERS INSERT POLICY
-- Problem: "new row violates row-level security policy for table users"
-- when registering new manager via Edge Function
-- =============================================================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;

-- Create new INSERT policy that allows inserts for all roles
-- The Edge Function uses service_role key which bypasses RLS,
-- but we also need to allow authenticated inserts in some cases
CREATE POLICY "Allow user registration"
ON public.users FOR INSERT
TO authenticated, anon, service_role
WITH CHECK (true);

-- Alternative: If the above doesn't work, try this more permissive version:
-- This ensures service_role can always insert
-- DROP POLICY IF EXISTS "Allow user registration" ON public.users;
-- CREATE POLICY "Allow all inserts"
-- ON public.users FOR INSERT
-- WITH CHECK (true);

-- Verify RLS is enabled on users table
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- IMPORTANT: Make sure SUPABASE_SERVICE_ROLE_KEY is set in Edge Function
-- The service_role key should bypass RLS entirely
-- =============================================================================

-- Debug: Check current policies on users table
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'users';
