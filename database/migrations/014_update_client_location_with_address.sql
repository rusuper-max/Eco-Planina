-- =============================================================================
-- UPDATE CLIENT LOCATION WITH ADDRESS
-- Run this in Supabase SQL Editor
-- =============================================================================
-- This migration updates the update_client_location function to also accept
-- and update the address field when a manager changes client location
-- =============================================================================

-- Drop existing function (if exists)
DROP FUNCTION IF EXISTS public.update_client_location(uuid, float8, float8);
DROP FUNCTION IF EXISTS public.update_client_location(uuid, float8, float8, text);

-- Create new function with address parameter
CREATE OR REPLACE FUNCTION public.update_client_location(
    client_id UUID,
    lat FLOAT8,
    lng FLOAT8,
    addr TEXT DEFAULT NULL
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
    WHERE id = client_id
    AND deleted_at IS NULL;

    -- For non-admins, verify same company
    IF v_caller_role NOT IN ('admin', 'developer') AND v_caller_company != v_client_company THEN
        RETURN FALSE;
    END IF;

    -- Update the client location and address
    IF addr IS NOT NULL THEN
        UPDATE users
        SET
            latitude = lat,
            longitude = lng,
            address = addr
        WHERE id = client_id
        AND deleted_at IS NULL;
    ELSE
        UPDATE users
        SET
            latitude = lat,
            longitude = lng
        WHERE id = client_id
        AND deleted_at IS NULL;
    END IF;

    RETURN TRUE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_client_location(UUID, FLOAT8, FLOAT8, TEXT) TO authenticated;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- Test the function (replace with actual IDs):
-- SELECT update_client_location(
--     'client-uuid-here'::uuid,
--     44.8176,
--     20.4633,
--     'Trg Republike 1 Beograd'
-- );
