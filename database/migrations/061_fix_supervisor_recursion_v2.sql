-- =============================================================================
-- FIX: Supervisor RLS - Complete Recursion Fix v2
-- =============================================================================
-- Problem: Even with SECURITY DEFINER functions, policies on users table that
-- reference the users table cause infinite recursion.
-- Solution: Create a single function that returns current user info + their
-- supervisor regions, then use simple comparisons in policies.
-- =============================================================================

-- =============================================================================
-- STEP 1: Drop ALL supervisor policies
-- =============================================================================
DROP POLICY IF EXISTS "supervisor_view_users" ON public.users;
DROP POLICY IF EXISTS "supervisor_update_users" ON public.users;
DROP POLICY IF EXISTS "supervisor_view_pickup_requests" ON public.pickup_requests;
DROP POLICY IF EXISTS "supervisor_manage_pickup_requests" ON public.pickup_requests;
DROP POLICY IF EXISTS "supervisor_view_processed_requests" ON public.processed_requests;
DROP POLICY IF EXISTS "supervisor_insert_processed_requests" ON public.processed_requests;
DROP POLICY IF EXISTS "supervisor_update_processed_requests" ON public.processed_requests;
DROP POLICY IF EXISTS "supervisor_view_inventories" ON public.inventories;
DROP POLICY IF EXISTS "supervisor_regions_manage" ON public.supervisor_regions;
DROP POLICY IF EXISTS "supervisor_regions_self_view" ON public.supervisor_regions;

-- =============================================================================
-- STEP 2: Create composite type for current user info
-- =============================================================================
DROP TYPE IF EXISTS current_user_info CASCADE;

CREATE TYPE current_user_info AS (
    user_id UUID,
    role TEXT,
    company_code TEXT,
    region_id UUID,
    supervisor_region_ids UUID[]
);

-- =============================================================================
-- STEP 3: Create master function to get current user info (SECURITY DEFINER)
-- This function bypasses RLS completely and returns all needed info in one call
-- =============================================================================
CREATE OR REPLACE FUNCTION get_current_user_info()
RETURNS current_user_info
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_result current_user_info;
    v_auth_id UUID;
BEGIN
    v_auth_id := auth.uid();

    IF v_auth_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get user basic info
    SELECT id, role, company_code, region_id
    INTO v_result.user_id, v_result.role, v_result.company_code, v_result.region_id
    FROM public.users
    WHERE auth_id = v_auth_id
    AND deleted_at IS NULL
    LIMIT 1;

    -- If user not found, return NULL
    IF v_result.user_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- If user is supervisor, get their region IDs
    IF v_result.role = 'supervisor' THEN
        SELECT COALESCE(array_agg(region_id), ARRAY[]::UUID[])
        INTO v_result.supervisor_region_ids
        FROM public.supervisor_regions
        WHERE supervisor_id = v_result.user_id;
    ELSE
        v_result.supervisor_region_ids := ARRAY[]::UUID[];
    END IF;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_current_user_info() TO authenticated;

-- =============================================================================
-- STEP 4: Simple helper functions that use get_current_user_info
-- These are thin wrappers for cleaner policy syntax
-- =============================================================================

-- Check if current user is a supervisor with access to a specific region
CREATE OR REPLACE FUNCTION is_supervisor_for_region(p_region_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        WHERE (get_current_user_info()).role = 'supervisor'
        AND p_region_id = ANY((get_current_user_info()).supervisor_region_ids)
    );
$$;

GRANT EXECUTE ON FUNCTION is_supervisor_for_region(UUID) TO authenticated;

-- Check if current user is supervisor in a company
CREATE OR REPLACE FUNCTION is_supervisor_in_company(p_company_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT (get_current_user_info()).role = 'supervisor'
       AND (get_current_user_info()).company_code = p_company_code;
$$;

GRANT EXECUTE ON FUNCTION is_supervisor_in_company(TEXT) TO authenticated;

-- Get current user's supervisor region IDs
CREATE OR REPLACE FUNCTION get_my_supervisor_regions()
RETURNS UUID[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COALESCE((get_current_user_info()).supervisor_region_ids, ARRAY[]::UUID[]);
$$;

GRANT EXECUTE ON FUNCTION get_my_supervisor_regions() TO authenticated;

-- =============================================================================
-- STEP 5: Update get_supervisor_region_ids to use new approach
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
    v_result UUID[];
    v_current_info current_user_info;
BEGIN
    -- If no user specified, use current user
    IF p_user_id IS NULL THEN
        v_current_info := get_current_user_info();
        RETURN COALESCE(v_current_info.supervisor_region_ids, ARRAY[]::UUID[]);
    END IF;

    -- Get region IDs for specific user (bypasses RLS)
    SELECT COALESCE(array_agg(region_id), ARRAY[]::UUID[])
    INTO v_result
    FROM public.supervisor_regions
    WHERE supervisor_id = p_user_id;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_supervisor_region_ids(UUID) TO authenticated;

-- =============================================================================
-- STEP 6: Recreate supervisor_regions policies
-- =============================================================================
CREATE POLICY "supervisor_regions_manage" ON public.supervisor_regions
FOR ALL USING (
    can_manage_supervisor_regions(supervisor_id)
);

CREATE POLICY "supervisor_regions_self_view" ON public.supervisor_regions
FOR SELECT USING (
    supervisor_id = (get_current_user_info()).user_id
);

-- =============================================================================
-- STEP 7: Recreate supervisor policies using simple function calls
-- These policies avoid ANY reference to users table directly
-- =============================================================================

-- Supervisor can view users in their regions (or themselves)
CREATE POLICY "supervisor_view_users" ON public.users
FOR SELECT USING (
    is_supervisor_in_company(users.company_code)
    AND (
        users.id = (get_current_user_info()).user_id
        OR users.region_id = ANY(get_my_supervisor_regions())
    )
);

-- Supervisor can update drivers/clients in their regions
CREATE POLICY "supervisor_update_users" ON public.users
FOR UPDATE TO authenticated
USING (
    is_supervisor_in_company(users.company_code)
    AND users.region_id = ANY(get_my_supervisor_regions())
    AND users.role IN ('driver', 'client')
)
WITH CHECK (
    role IN ('driver', 'client')
);

-- Supervisor policies on pickup_requests
CREATE POLICY "supervisor_view_pickup_requests" ON public.pickup_requests
FOR SELECT USING (
    is_supervisor_in_company(pickup_requests.company_code)
    AND pickup_requests.region_id = ANY(get_my_supervisor_regions())
);

CREATE POLICY "supervisor_manage_pickup_requests" ON public.pickup_requests
FOR ALL USING (
    is_supervisor_in_company(pickup_requests.company_code)
    AND pickup_requests.region_id = ANY(get_my_supervisor_regions())
);

-- Supervisor policies on processed_requests
CREATE POLICY "supervisor_view_processed_requests" ON public.processed_requests
FOR SELECT USING (
    is_supervisor_in_company(processed_requests.company_code)
    AND processed_requests.region_id = ANY(get_my_supervisor_regions())
);

CREATE POLICY "supervisor_insert_processed_requests" ON public.processed_requests
FOR INSERT WITH CHECK (
    is_supervisor_in_company(processed_requests.company_code)
    AND processed_requests.region_id = ANY(get_my_supervisor_regions())
);

CREATE POLICY "supervisor_update_processed_requests" ON public.processed_requests
FOR UPDATE USING (
    is_supervisor_in_company(processed_requests.company_code)
    AND processed_requests.region_id = ANY(get_my_supervisor_regions())
);

-- Supervisor policies on inventories (via regions)
CREATE POLICY "supervisor_view_inventories" ON public.inventories
FOR SELECT USING (
    is_supervisor_in_company(inventories.company_code)
    AND EXISTS (
        SELECT 1 FROM public.regions r
        WHERE r.inventory_id = inventories.id
        AND r.id = ANY(get_my_supervisor_regions())
    )
);

-- =============================================================================
-- Comments
-- =============================================================================
COMMENT ON TYPE current_user_info IS 'Composite type holding current user info including supervisor regions';
COMMENT ON FUNCTION get_current_user_info IS 'Returns current user info bypassing RLS. Single call for all user data.';
COMMENT ON FUNCTION is_supervisor_for_region IS 'Check if current user is supervisor with access to specific region';
COMMENT ON FUNCTION is_supervisor_in_company IS 'Check if current user is supervisor in specific company';
COMMENT ON FUNCTION get_my_supervisor_regions IS 'Get array of region UUIDs for current supervisor';
