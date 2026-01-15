-- =============================================================================
-- FIX PROCESSED_REQUESTS RLS POLICY
-- Run this in Supabase SQL Editor
-- =============================================================================
-- This migration fixes the INSERT policy for processed_requests
-- Uses direct subquery instead of helper functions for better RLS compatibility
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Managers can create processed requests" ON public.processed_requests;
DROP POLICY IF EXISTS "Managers can update processed requests" ON public.processed_requests;

-- INSERT policy - uses direct subquery for reliable auth.uid() evaluation
CREATE POLICY "Managers can create processed requests" ON public.processed_requests
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

-- UPDATE policy
CREATE POLICY "Managers can update processed requests" ON public.processed_requests
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role IN ('manager', 'company_admin', 'admin', 'developer')
        AND u.company_code = processed_requests.company_code
    )
)
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
-- SELECT * FROM pg_policies WHERE tablename = 'processed_requests';
