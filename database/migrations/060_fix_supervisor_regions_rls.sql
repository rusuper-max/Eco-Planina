-- =============================================================================
-- FIX: Supervisor Regions RLS - Infinite Recursion Fix
-- =============================================================================
-- Problem: supervisor_regions_company_admin policy has a JOIN with users table
-- which causes infinite recursion when users table RLS is also being evaluated.
-- Solution: Use SECURITY DEFINER function to bypass RLS when checking permissions.
-- =============================================================================

-- =============================================================================
-- STEP 1: Drop ALL policies that depend on get_supervisor_region_ids function
-- =============================================================================
DROP POLICY IF EXISTS "supervisor_view_users" ON public.users;
DROP POLICY IF EXISTS "supervisor_update_users" ON public.users;
DROP POLICY IF EXISTS "supervisor_view_pickup_requests" ON public.pickup_requests;
DROP POLICY IF EXISTS "supervisor_manage_pickup_requests" ON public.pickup_requests;
DROP POLICY IF EXISTS "supervisor_view_processed_requests" ON public.processed_requests;
DROP POLICY IF EXISTS "supervisor_insert_processed_requests" ON public.processed_requests;
DROP POLICY IF EXISTS "supervisor_update_processed_requests" ON public.processed_requests;
DROP POLICY IF EXISTS "supervisor_view_inventories" ON public.inventories;

-- Drop supervisor_regions policies
DROP POLICY IF EXISTS "supervisor_regions_admin_all" ON public.supervisor_regions;
DROP POLICY IF EXISTS "supervisor_regions_company_admin" ON public.supervisor_regions;
DROP POLICY IF EXISTS "supervisor_regions_self_select" ON public.supervisor_regions;
DROP POLICY IF EXISTS "supervisor_regions_manage" ON public.supervisor_regions;
DROP POLICY IF EXISTS "supervisor_regions_self_view" ON public.supervisor_regions;

-- =============================================================================
-- Create helper function to check if current user can manage supervisor_regions
-- Uses SECURITY DEFINER to bypass RLS
-- =============================================================================
CREATE OR REPLACE FUNCTION can_manage_supervisor_regions(p_supervisor_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_current_user_id UUID;
    v_current_role TEXT;
    v_current_company TEXT;
    v_target_company TEXT;
BEGIN
    -- Get current user info (bypasses RLS due to SECURITY DEFINER)
    SELECT id, role, company_code
    INTO v_current_user_id, v_current_role, v_current_company
    FROM public.users
    WHERE auth_id = auth.uid()
    AND deleted_at IS NULL
    LIMIT 1;

    -- No user found
    IF v_current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Admin/developer can manage all
    IF v_current_role IN ('admin', 'developer') THEN
        RETURN TRUE;
    END IF;

    -- Company admin can manage supervisors in their company
    IF v_current_role = 'company_admin' THEN
        -- If no specific supervisor, allow (for INSERT check)
        IF p_supervisor_id IS NULL THEN
            RETURN TRUE;
        END IF;

        -- Check if target supervisor is in same company
        SELECT company_code INTO v_target_company
        FROM public.users
        WHERE id = p_supervisor_id
        AND deleted_at IS NULL;

        RETURN v_target_company = v_current_company;
    END IF;

    RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION can_manage_supervisor_regions(UUID) TO authenticated;

-- =============================================================================
-- Create simplified RLS policies using helper function
-- =============================================================================

-- Policy for admin/developer/company_admin to manage supervisor_regions
CREATE POLICY "supervisor_regions_manage" ON public.supervisor_regions
FOR ALL USING (
    can_manage_supervisor_regions(supervisor_id)
);

-- Policy for supervisor to view their own region assignments
CREATE POLICY "supervisor_regions_self_view" ON public.supervisor_regions
FOR SELECT USING (
    supervisor_id IN (
        SELECT id FROM public.users
        WHERE auth_id = auth.uid()
        AND deleted_at IS NULL
    )
);

-- =============================================================================
-- Also fix get_supervisor_region_ids to use SECURITY DEFINER properly
-- =============================================================================
DROP FUNCTION IF EXISTS get_supervisor_region_ids(UUID);

CREATE OR REPLACE FUNCTION get_supervisor_region_ids(p_user_id UUID DEFAULT NULL)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_result UUID[];
BEGIN
    -- Determine which user to get regions for
    IF p_user_id IS NOT NULL THEN
        v_user_id := p_user_id;
    ELSE
        -- Get current user's ID
        SELECT id INTO v_user_id
        FROM public.users
        WHERE auth_id = auth.uid()
        AND deleted_at IS NULL
        LIMIT 1;
    END IF;

    -- Return empty array if no user
    IF v_user_id IS NULL THEN
        RETURN ARRAY[]::UUID[];
    END IF;

    -- Get region IDs (this bypasses RLS due to SECURITY DEFINER)
    SELECT COALESCE(array_agg(region_id), ARRAY[]::UUID[])
    INTO v_result
    FROM public.supervisor_regions
    WHERE supervisor_id = v_user_id;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_supervisor_region_ids(UUID) TO authenticated;

COMMENT ON FUNCTION can_manage_supervisor_regions IS 'Helper function to check if current user can manage supervisor_regions. Uses SECURITY DEFINER to bypass RLS.';
COMMENT ON FUNCTION get_supervisor_region_ids IS 'Returns array of region UUIDs assigned to a supervisor. Uses SECURITY DEFINER to bypass RLS.';

-- =============================================================================
-- STEP 4: Recreate all supervisor policies on other tables
-- =============================================================================

-- Supervisor policies on users table
CREATE POLICY "supervisor_view_users" ON public.users
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.users me
        WHERE me.auth_id = auth.uid()
        AND me.deleted_at IS NULL
        AND me.role = 'supervisor'
        AND me.company_code = users.company_code
        AND (
            users.id = me.id
            OR users.region_id IN (SELECT unnest(get_supervisor_region_ids(me.id)))
        )
    )
);

CREATE POLICY "supervisor_update_users" ON public.users
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users me
        WHERE me.auth_id = auth.uid()
        AND me.deleted_at IS NULL
        AND me.role = 'supervisor'
        AND me.company_code = users.company_code
        AND users.region_id IN (SELECT unnest(get_supervisor_region_ids(me.id)))
        AND users.role IN ('driver', 'client')
    )
)
WITH CHECK (
    role IN ('driver', 'client')
);

-- Supervisor policies on pickup_requests
CREATE POLICY "supervisor_view_pickup_requests" ON public.pickup_requests
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.users me
        WHERE me.auth_id = auth.uid()
        AND me.deleted_at IS NULL
        AND me.role = 'supervisor'
        AND me.company_code = pickup_requests.company_code
        AND pickup_requests.region_id IN (SELECT unnest(get_supervisor_region_ids(me.id)))
    )
);

CREATE POLICY "supervisor_manage_pickup_requests" ON public.pickup_requests
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users me
        WHERE me.auth_id = auth.uid()
        AND me.deleted_at IS NULL
        AND me.role = 'supervisor'
        AND me.company_code = pickup_requests.company_code
        AND pickup_requests.region_id IN (SELECT unnest(get_supervisor_region_ids(me.id)))
    )
);

-- Supervisor policies on processed_requests
CREATE POLICY "supervisor_view_processed_requests" ON public.processed_requests
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.users me
        WHERE me.auth_id = auth.uid()
        AND me.deleted_at IS NULL
        AND me.role = 'supervisor'
        AND me.company_code = processed_requests.company_code
        AND processed_requests.region_id IN (SELECT unnest(get_supervisor_region_ids(me.id)))
    )
);

CREATE POLICY "supervisor_insert_processed_requests" ON public.processed_requests
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users me
        WHERE me.auth_id = auth.uid()
        AND me.deleted_at IS NULL
        AND me.role = 'supervisor'
        AND me.company_code = processed_requests.company_code
        AND processed_requests.region_id IN (SELECT unnest(get_supervisor_region_ids(me.id)))
    )
);

CREATE POLICY "supervisor_update_processed_requests" ON public.processed_requests
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.users me
        WHERE me.auth_id = auth.uid()
        AND me.deleted_at IS NULL
        AND me.role = 'supervisor'
        AND me.company_code = processed_requests.company_code
        AND processed_requests.region_id IN (SELECT unnest(get_supervisor_region_ids(me.id)))
    )
);

-- Supervisor policies on inventories
CREATE POLICY "supervisor_view_inventories" ON public.inventories
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.users me
        JOIN public.regions r ON r.id IN (SELECT unnest(get_supervisor_region_ids(me.id)))
        WHERE me.auth_id = auth.uid()
        AND me.deleted_at IS NULL
        AND me.role = 'supervisor'
        AND me.company_code = inventories.company_code
        AND r.inventory_id = inventories.id
    )
);
