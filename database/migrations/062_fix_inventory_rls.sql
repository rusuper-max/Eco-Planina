-- =============================================================================
-- FIX: Inventory RLS Policies
-- =============================================================================
-- Problem: company_admin cannot insert into inventories
-- Solution: Recreate policies with proper checks
-- =============================================================================

-- Drop existing inventory policies
DROP POLICY IF EXISTS "Users can view company inventories" ON public.inventories;
DROP POLICY IF EXISTS "Company admin can insert inventories" ON public.inventories;
DROP POLICY IF EXISTS "Company admin can update inventories" ON public.inventories;
DROP POLICY IF EXISTS "Company admin can delete inventories" ON public.inventories;
DROP POLICY IF EXISTS "supervisor_view_inventories" ON public.inventories;

-- =============================================================================
-- Recreate policies using get_current_user_info() for consistency
-- =============================================================================

-- SELECT policy - users can view their company's inventories
CREATE POLICY "inventories_select" ON public.inventories
FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND (
        company_code = (get_current_user_info()).company_code
        OR (get_current_user_info()).role IN ('admin', 'developer')
    )
);

-- INSERT policy - company_admin can create inventories
CREATE POLICY "inventories_insert" ON public.inventories
FOR INSERT TO authenticated
WITH CHECK (
    company_code = (get_current_user_info()).company_code
    AND (get_current_user_info()).role IN ('company_admin', 'admin', 'developer')
);

-- UPDATE policy - company_admin can update inventories
CREATE POLICY "inventories_update" ON public.inventories
FOR UPDATE TO authenticated
USING (
    company_code = (get_current_user_info()).company_code
    AND (get_current_user_info()).role IN ('company_admin', 'admin', 'developer')
)
WITH CHECK (
    company_code = (get_current_user_info()).company_code
    AND (get_current_user_info()).role IN ('company_admin', 'admin', 'developer')
);

-- DELETE policy - company_admin can delete inventories
CREATE POLICY "inventories_delete" ON public.inventories
FOR DELETE TO authenticated
USING (
    company_code = (get_current_user_info()).company_code
    AND (get_current_user_info()).role IN ('company_admin', 'admin', 'developer')
);

-- Supervisor view policy (can only see inventories linked to their regions)
CREATE POLICY "inventories_supervisor_select" ON public.inventories
FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND (get_current_user_info()).role = 'supervisor'
    AND company_code = (get_current_user_info()).company_code
    AND EXISTS (
        SELECT 1 FROM public.regions r
        WHERE r.inventory_id = inventories.id
        AND r.id = ANY((get_current_user_info()).supervisor_region_ids)
    )
);
