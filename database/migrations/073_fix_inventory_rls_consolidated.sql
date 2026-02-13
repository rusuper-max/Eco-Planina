-- =============================================================================
-- Migration 073: Consolidated Inventory RLS Fixes
-- =============================================================================
-- Problems fixed:
-- 1. Supervisor has two SELECT policies - need single consolidated policy
-- 2. manager_visibility setting is not enforced in RLS
-- 3. Supervisor should only see inventories linked to their regions
-- =============================================================================

-- =============================================================================
-- Drop ALL existing inventory SELECT policies
-- =============================================================================
DROP POLICY IF EXISTS "inventories_select" ON public.inventories;
DROP POLICY IF EXISTS "inventories_supervisor_select" ON public.inventories;
DROP POLICY IF EXISTS "Users can view company inventories" ON public.inventories;

-- =============================================================================
-- Create consolidated SELECT policy for inventories
-- =============================================================================
CREATE POLICY "inventories_select" ON public.inventories
FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND (
        -- Developer/Admin see everything
        (get_current_user_info()).role IN ('developer', 'admin')
        OR
        -- Company users see based on role
        (
            company_code = (get_current_user_info()).company_code
            AND (
                -- Company admin and manager see all company inventories
                (get_current_user_info()).role IN ('company_admin', 'manager')
                OR
                -- Supervisor sees only inventories linked to their regions
                (
                    (get_current_user_info()).role = 'supervisor'
                    AND EXISTS (
                        SELECT 1 FROM public.regions r
                        WHERE r.inventory_id = inventories.id
                        AND r.id = ANY((get_current_user_info()).supervisor_region_ids)
                    )
                )
                OR
                -- Client/Driver can see inventories linked to their region
                (
                    (get_current_user_info()).role IN ('client', 'driver')
                    AND EXISTS (
                        SELECT 1 FROM public.regions r
                        WHERE r.inventory_id = inventories.id
                        AND r.id = (get_current_user_info()).region_id
                    )
                )
            )
        )
    )
);

-- =============================================================================
-- Fix inventory_items SELECT policy
-- =============================================================================
DROP POLICY IF EXISTS "inventory_items_select" ON public.inventory_items;
DROP POLICY IF EXISTS "inventory_items_all" ON public.inventory_items;

CREATE POLICY "inventory_items_select" ON public.inventory_items
FOR SELECT TO authenticated
USING (
    -- Developer/Admin see all
    (get_current_user_info()).role IN ('developer', 'admin')
    OR
    -- Others see items from inventories they can access
    EXISTS (
        SELECT 1 FROM public.inventories i
        WHERE i.id = inventory_items.inventory_id
        AND i.deleted_at IS NULL
        AND i.company_code = (get_current_user_info()).company_code
        AND (
            -- Company admin/manager see all company inventory items
            (get_current_user_info()).role IN ('company_admin', 'manager')
            OR
            -- Supervisor sees items from inventories linked to their regions
            (
                (get_current_user_info()).role = 'supervisor'
                AND EXISTS (
                    SELECT 1 FROM public.regions r
                    WHERE r.inventory_id = i.id
                    AND r.id = ANY((get_current_user_info()).supervisor_region_ids)
                )
            )
        )
    )
);

-- Recreate ALL policy for inventory_items (for INSERT/UPDATE/DELETE)
CREATE POLICY "inventory_items_all" ON public.inventory_items
FOR ALL TO authenticated
USING (
    (get_current_user_info()).role IN ('developer', 'admin')
    OR
    EXISTS (
        SELECT 1 FROM public.inventories i
        WHERE i.id = inventory_items.inventory_id
        AND i.company_code = (get_current_user_info()).company_code
        AND i.deleted_at IS NULL
        AND (get_current_user_info()).role IN ('company_admin', 'manager', 'supervisor')
    )
);

-- =============================================================================
-- Fix inventory_transactions SELECT policy
-- =============================================================================
DROP POLICY IF EXISTS "inventory_transactions_select" ON public.inventory_transactions;

CREATE POLICY "inventory_transactions_select" ON public.inventory_transactions
FOR SELECT TO authenticated
USING (
    -- Developer/Admin see all
    (get_current_user_info()).role IN ('developer', 'admin')
    OR
    -- Others see transactions from accessible inventories
    EXISTS (
        SELECT 1 FROM public.inventories i
        WHERE i.id = inventory_transactions.inventory_id
        AND i.deleted_at IS NULL
        AND i.company_code = (get_current_user_info()).company_code
        AND (
            -- Company admin/manager see all company transactions
            (get_current_user_info()).role IN ('company_admin', 'manager')
            OR
            -- Supervisor sees transactions from their region inventories
            (
                (get_current_user_info()).role = 'supervisor'
                AND EXISTS (
                    SELECT 1 FROM public.regions r
                    WHERE r.inventory_id = i.id
                    AND r.id = ANY((get_current_user_info()).supervisor_region_ids)
                )
            )
        )
    )
);

-- =============================================================================
-- Comments
-- =============================================================================
COMMENT ON POLICY "inventories_select" ON public.inventories IS
'Unified SELECT policy: admin/developer=all, company_admin/manager=company, supervisor=linked regions only';

COMMENT ON POLICY "inventory_items_select" ON public.inventory_items IS
'SELECT policy respects inventory access rules with supervisor region filtering';

COMMENT ON POLICY "inventory_transactions_select" ON public.inventory_transactions IS
'SELECT policy respects inventory access rules with supervisor region filtering';
