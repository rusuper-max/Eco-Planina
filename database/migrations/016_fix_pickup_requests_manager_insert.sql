-- =============================================================================
-- FIX PICKUP_REQUESTS RLS POLICY FOR MANAGER INSERT
-- Run this in Supabase SQL Editor
-- =============================================================================
-- Problem: Managers cannot create requests on behalf of clients because
-- the existing "Clients can create requests" policy requires user_id = get_my_user_id()
--
-- Solution: Add new policy allowing managers to create requests for any client
-- in their company (uses direct subquery instead of helper functions for reliability)
-- =============================================================================

-- First drop the old policy if it exists (it may use helper functions that don't work)
DROP POLICY IF EXISTS "Managers can create requests for clients" ON public.pickup_requests;

-- Add policy for managers to create requests on behalf of clients
CREATE POLICY "Managers can create requests for clients" ON public.pickup_requests
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role IN ('manager', 'company_admin', 'admin', 'developer')
        AND u.company_code = company_code
    )
);

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- Run this to verify policies:
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'pickup_requests';
--
-- Expected result should show both:
-- 1. "Clients can create requests" - for clients creating their own requests
-- 2. "Managers can create requests for clients" - for managers creating on behalf of clients
