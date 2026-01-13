-- =============================================================================
-- FIX RLS RECURSION - Run this in Supabase SQL Editor
-- Error 42P17: infinite recursion detected in policy for relation "users"
-- =============================================================================

-- The problem: RLS policies on "users" table use subqueries that read from "users"
-- This creates infinite recursion when trying to authenticate

-- Solution: Use auth.uid() directly and JWT claims instead of subqueries

-- =============================================================================
-- STEP 1: Drop all existing policies on users table
-- =============================================================================

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can view own company members" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can update any user" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;
DROP POLICY IF EXISTS "Drivers can view own assignments" ON public.users;

-- =============================================================================
-- STEP 2: Create new policies that don't cause recursion
-- =============================================================================

-- Users can ALWAYS read their own profile (by auth_id match)
CREATE POLICY "Users can read own profile"
ON public.users FOR SELECT
TO authenticated
USING (
    auth_id = auth.uid()
    AND deleted_at IS NULL
);

-- Users can read other users in same company (using a security definer function)
-- First, create a helper function that bypasses RLS
CREATE OR REPLACE FUNCTION public.get_user_company_code(user_auth_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT company_code FROM public.users WHERE auth_id = user_auth_id AND deleted_at IS NULL LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_auth_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.users WHERE auth_id = user_auth_id AND deleted_at IS NULL LIMIT 1;
$$;

-- Now create policies using these SECURITY DEFINER functions
CREATE POLICY "Users can view company members"
ON public.users FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND (
        -- Can always see own profile
        auth_id = auth.uid()
        -- Or same company
        OR company_code = public.get_user_company_code(auth.uid())
        -- Or is admin/developer
        OR public.get_user_role(auth.uid()) IN ('admin', 'developer')
    )
);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
TO authenticated
USING (auth_id = auth.uid())
WITH CHECK (auth_id = auth.uid());

-- Admins can update any user
CREATE POLICY "Admins can update any user"
ON public.users FOR UPDATE
TO authenticated
USING (public.get_user_role(auth.uid()) IN ('admin', 'developer'));

-- Admins can delete users
CREATE POLICY "Admins can delete users"
ON public.users FOR DELETE
TO authenticated
USING (public.get_user_role(auth.uid()) IN ('admin', 'developer'));

-- Service role can insert (for registration)
CREATE POLICY "Service role can insert users"
ON public.users FOR INSERT
WITH CHECK (true);

-- =============================================================================
-- STEP 3: Fix driver_assignments policies too
-- =============================================================================

DROP POLICY IF EXISTS "Drivers can view own assignments" ON public.driver_assignments;
DROP POLICY IF EXISTS "Managers can create assignments" ON public.driver_assignments;
DROP POLICY IF EXISTS "Managers can update assignments" ON public.driver_assignments;
DROP POLICY IF EXISTS "Drivers can update own assignments" ON public.driver_assignments;
DROP POLICY IF EXISTS "Managers can delete assignments" ON public.driver_assignments;

-- Helper function to get user ID from auth_id
CREATE OR REPLACE FUNCTION public.get_user_id(user_auth_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.users WHERE auth_id = user_auth_id AND deleted_at IS NULL LIMIT 1;
$$;

-- Drivers can view their own assignments, managers can view all in company
CREATE POLICY "View assignments"
ON public.driver_assignments FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND (
        driver_id = public.get_user_id(auth.uid())
        OR public.get_user_role(auth.uid()) IN ('manager', 'admin', 'developer')
        OR (
            company_code = public.get_user_company_code(auth.uid())
            AND public.get_user_role(auth.uid()) = 'manager'
        )
    )
);

-- Managers can create assignments for their company
CREATE POLICY "Managers create assignments"
ON public.driver_assignments FOR INSERT
TO authenticated
WITH CHECK (
    company_code = public.get_user_company_code(auth.uid())
    AND public.get_user_role(auth.uid()) IN ('manager', 'admin', 'developer')
);

-- Managers can update assignments for their company
CREATE POLICY "Managers update assignments"
ON public.driver_assignments FOR UPDATE
TO authenticated
USING (
    company_code = public.get_user_company_code(auth.uid())
    AND public.get_user_role(auth.uid()) IN ('manager', 'admin', 'developer')
);

-- Drivers can update their own assignments (status changes)
CREATE POLICY "Drivers update own assignments"
ON public.driver_assignments FOR UPDATE
TO authenticated
USING (
    driver_id = public.get_user_id(auth.uid())
    AND public.get_user_role(auth.uid()) = 'driver'
);

-- Managers can delete assignments
CREATE POLICY "Managers delete assignments"
ON public.driver_assignments FOR DELETE
TO authenticated
USING (
    company_code = public.get_user_company_code(auth.uid())
    AND public.get_user_role(auth.uid()) IN ('manager', 'admin', 'developer')
);

-- =============================================================================
-- DONE! The key fix is using SECURITY DEFINER functions that bypass RLS
-- to get user info without causing recursive policy evaluation
-- =============================================================================
