-- =============================================================================
-- ENABLE REALTIME FOR driver_assignments AND pickup_requests
-- =============================================================================
-- This allows web clients to receive live updates when:
-- - Driver changes assignment status (picked_up, delivered, etc.)
-- - New pickup requests are created or updated
-- =============================================================================

-- Enable REPLICA IDENTITY FULL for better change tracking
ALTER TABLE public.driver_assignments REPLICA IDENTITY FULL;
ALTER TABLE public.pickup_requests REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication
DO $$
BEGIN
    -- Add driver_assignments to realtime
    BEGIN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_assignments';
    EXCEPTION
        WHEN duplicate_object THEN
            -- Already in publication, ignore
            NULL;
        WHEN undefined_object THEN
            -- Publication doesn't exist - this shouldn't happen in Supabase
            RAISE NOTICE 'supabase_realtime publication does not exist';
    END;

    -- Add pickup_requests to realtime
    BEGIN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_requests';
    EXCEPTION
        WHEN duplicate_object THEN
            -- Already in publication, ignore
            NULL;
        WHEN undefined_object THEN
            RAISE NOTICE 'supabase_realtime publication does not exist';
    END;
END $$;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- Check which tables are in the realtime publication:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
--
-- Expected: driver_assignments, pickup_requests, driver_locations should all be listed
-- =============================================================================
