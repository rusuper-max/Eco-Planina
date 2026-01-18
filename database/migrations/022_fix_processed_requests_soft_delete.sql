-- =============================================================================
-- FIX PROCESSED_REQUESTS SOFT DELETE RLS
-- Run this in Supabase SQL Editor
-- =============================================================================
-- This migration ensures managers can soft-delete (update deleted_at) on
-- processed_requests table
-- =============================================================================

-- First, check current policies (uncomment to debug)
-- SELECT * FROM pg_policies WHERE tablename = 'processed_requests';

-- Drop and recreate UPDATE policy to ensure it's correct
DROP POLICY IF EXISTS "Managers can update processed requests" ON public.processed_requests;

-- UPDATE policy - allows managers/admins to update (including soft delete)
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
        AND u.company_code = processed_requests.company_code
    )
);

-- Also ensure the deleted_at column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'processed_requests'
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.processed_requests ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;

-- =============================================================================
-- VERIFICATION QUERY
-- Run this after the migration to verify the policy is active:
-- =============================================================================
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'processed_requests' AND policyname LIKE '%update%';
--
-- Test soft delete (replace with actual IDs):
-- UPDATE processed_requests SET deleted_at = NOW() WHERE id = 'some-uuid';
-- =============================================================================
