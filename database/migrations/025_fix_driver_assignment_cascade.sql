-- =============================================================================
-- FIX DRIVER ASSIGNMENT CASCADE DELETE
-- Run this in Supabase SQL Editor
-- =============================================================================
-- This migration changes the foreign key on driver_assignments.request_id
-- from ON DELETE CASCADE to ON DELETE SET NULL.
--
-- PROBLEM: When a pickup_request is deleted (during processing), the
-- driver_assignment is automatically deleted due to CASCADE, losing all
-- the timeline/history data (assigned_at, picked_up_at, delivered_at).
--
-- SOLUTION:
-- 1. Change to SET NULL so driver_assignments persist after pickup_request is deleted
-- 2. Add driver_assignment_id to processed_requests to directly link them
-- =============================================================================

-- =============================================================================
-- PART 1: Fix the CASCADE DELETE issue
-- =============================================================================

-- Step 1: Make request_id nullable (required for SET NULL)
ALTER TABLE public.driver_assignments
ALTER COLUMN request_id DROP NOT NULL;

-- Step 2: Drop the existing foreign key constraint
-- The constraint name is auto-generated, so we need to find it first
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the foreign key constraint name
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'driver_assignments'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'request_id';

    -- Drop the constraint if found
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.driver_assignments DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No foreign key constraint found on request_id';
    END IF;
END $$;

-- Also drop the unique constraint on request_id that was added for upsert
DO $$
BEGIN
    ALTER TABLE public.driver_assignments
    DROP CONSTRAINT IF EXISTS driver_assignments_request_id_key;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

-- Step 3: Add the new foreign key with ON DELETE SET NULL
-- This way, when pickup_request is deleted, request_id becomes NULL
-- but the driver_assignment record (with timestamps) is preserved
ALTER TABLE public.driver_assignments
ADD CONSTRAINT driver_assignments_request_id_fkey
FOREIGN KEY (request_id) REFERENCES public.pickup_requests(id)
ON DELETE SET NULL;

-- =============================================================================
-- PART 2: Add driver_assignment_id to processed_requests for direct linking
-- =============================================================================

-- Add column to store reference to the driver_assignment record
ALTER TABLE public.processed_requests
ADD COLUMN IF NOT EXISTS driver_assignment_id UUID REFERENCES public.driver_assignments(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_processed_requests_driver_assignment_id
ON public.processed_requests(driver_assignment_id)
WHERE deleted_at IS NULL;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- Run this to verify the constraint was updated:
-- SELECT conname, confdeltype
-- FROM pg_constraint
-- WHERE conrelid = 'driver_assignments'::regclass
-- AND conname LIKE '%request_id%';
--
-- confdeltype = 'n' means SET NULL (what we want)
-- confdeltype = 'c' means CASCADE (the old behavior)
--
-- Run this to verify new column exists:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'processed_requests' AND column_name = 'driver_assignment_id';
-- =============================================================================
