-- =============================================================================
-- CLIENT WASTE TYPES & MANAGER REQUEST CREATION MIGRATION
-- Run this in Supabase SQL Editor AFTER 011_notifications.sql
-- =============================================================================
-- This migration:
-- 1. Adds allowed_waste_types column to users table
-- 2. Updates update_client_details function to include waste types
-- 3. Allows managers to assign specific waste types per client
-- 4. Adds created_by_manager column to pickup_requests for manager-created requests
-- =============================================================================

-- 1a. Add allowed_waste_types column to users table
-- This stores array of waste type IDs that client can use
-- NULL or empty array means client can see ALL waste types
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS allowed_waste_types TEXT[] DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.users.allowed_waste_types IS
'Array of waste type IDs client is allowed to use. NULL or empty means all types allowed.';

-- 1b. Add created_by_manager column to pickup_requests table
-- This tracks when a manager creates a request on behalf of a client (phone call scenario)
ALTER TABLE public.pickup_requests ADD COLUMN IF NOT EXISTS created_by_manager UUID DEFAULT NULL;

-- Add foreign key constraint to users table
ALTER TABLE public.pickup_requests
    DROP CONSTRAINT IF EXISTS fk_pickup_requests_created_by_manager;
ALTER TABLE public.pickup_requests
    ADD CONSTRAINT fk_pickup_requests_created_by_manager
    FOREIGN KEY (created_by_manager) REFERENCES public.users(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.pickup_requests.created_by_manager IS
'UUID of the manager who created this request on behalf of a client. NULL if created by client directly.';

-- =============================================================================
-- 2. Update the update_client_details function to include waste types
-- =============================================================================

-- First drop the existing function (both versions if they exist)
DROP FUNCTION IF EXISTS public.update_client_details(uuid, uuid[], text, text);
DROP FUNCTION IF EXISTS public.update_client_details(uuid, text[], text, text);
DROP FUNCTION IF EXISTS public.update_client_details(uuid, uuid[], text, text, text[]);

-- Create new function with allowed_waste_types parameter
CREATE OR REPLACE FUNCTION public.update_client_details(
    p_client_id UUID,
    p_equipment_types UUID[],
    p_manager_note TEXT,
    p_pib TEXT,
    p_allowed_waste_types TEXT[] DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role TEXT;
    v_caller_company TEXT;
    v_client_company TEXT;
BEGIN
    -- Get caller's role and company
    SELECT role, company_code INTO v_caller_role, v_caller_company
    FROM users
    WHERE auth_id = auth.uid()
    AND deleted_at IS NULL;

    -- Check if caller is manager or company_admin
    IF v_caller_role NOT IN ('manager', 'company_admin', 'admin', 'developer') THEN
        RETURN FALSE;
    END IF;

    -- Get client's company
    SELECT company_code INTO v_client_company
    FROM users
    WHERE id = p_client_id
    AND deleted_at IS NULL;

    -- For non-admins, verify same company
    IF v_caller_role NOT IN ('admin', 'developer') AND v_caller_company != v_client_company THEN
        RETURN FALSE;
    END IF;

    -- Update the client
    UPDATE users
    SET
        equipment_types = p_equipment_types,
        manager_note = p_manager_note,
        pib = p_pib,
        allowed_waste_types = p_allowed_waste_types
    WHERE id = p_client_id
    AND deleted_at IS NULL;

    RETURN TRUE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_client_details(UUID, UUID[], TEXT, TEXT, TEXT[]) TO authenticated;

-- =============================================================================
-- VERIFICATION QUERIES (run these after migration)
-- =============================================================================

-- Check column added:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'users' AND column_name = 'allowed_waste_types';

-- Test the function (replace with actual IDs):
-- SELECT update_client_details(
--     'client-uuid-here'::uuid,
--     ARRAY[]::uuid[],
--     'Test note',
--     '123456789',
--     ARRAY['cardboard', 'plastic']::text[]
-- );

-- =============================================================================
-- ROLLBACK (if needed)
-- =============================================================================
-- ALTER TABLE public.users DROP COLUMN IF EXISTS allowed_waste_types;
-- ALTER TABLE public.pickup_requests DROP CONSTRAINT IF EXISTS fk_pickup_requests_created_by_manager;
-- ALTER TABLE public.pickup_requests DROP COLUMN IF EXISTS created_by_manager;
-- DROP FUNCTION IF EXISTS public.update_client_details(uuid, uuid[], text, text, text[]);
