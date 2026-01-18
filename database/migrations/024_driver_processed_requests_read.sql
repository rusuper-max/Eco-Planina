-- =============================================================================
-- DRIVER CAN READ THEIR ASSIGNED PROCESSED REQUESTS
-- Run this in Supabase SQL Editor
-- =============================================================================
-- Allows drivers to read processed_requests where they are the assigned driver
-- This is needed so drivers can see their history of completed requests
-- (requests that were assigned to them after being processed by manager)
-- =============================================================================

-- Add SELECT policy for drivers to read their assigned processed requests
DROP POLICY IF EXISTS "Drivers can read their assigned processed requests" ON public.processed_requests;

CREATE POLICY "Drivers can read their assigned processed requests" ON public.processed_requests
FOR SELECT TO authenticated
USING (
    -- Driver can read requests where they are assigned
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role = 'driver'
        AND u.id = processed_requests.driver_id
    )
);

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- Check the new policy exists:
-- SELECT policyname, cmd FROM pg_policies
-- WHERE tablename = 'processed_requests' AND policyname LIKE '%Driver%';
--
-- Test as a driver (replace with actual driver user ID):
-- SELECT id, client_name, driver_id FROM processed_requests WHERE driver_id = 'driver-user-id';
-- =============================================================================
