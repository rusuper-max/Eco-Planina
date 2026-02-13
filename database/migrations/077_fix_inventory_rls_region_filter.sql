-- =============================================================================
-- Migration 077: Fix Inventory RLS - Add region filters for manager & supervisor
-- =============================================================================
-- Problems fixed:
-- 1. Supervisor can INSERT/UPDATE/DELETE on ANY company inventory (should be limited to their regions)
-- 2. Manager can see/modify ALL company inventories (should only see inventory linked to their region)
-- 3. Same issues exist on inventory_transactions INSERT policy
-- =============================================================================

-- =============================================================================
-- STEP 0: Safer default for manager_visibility (principle of least privilege)
-- =============================================================================
ALTER TABLE public.inventories
    ALTER COLUMN manager_visibility SET DEFAULT 'own_only';

UPDATE public.inventories
SET manager_visibility = 'own_only'
WHERE manager_visibility IS NULL;

-- =============================================================================
-- STEP 1: Fix inventories SELECT - Manager limited by region unless inventory opts-in with manager_visibility='full'
-- =============================================================================
DROP POLICY IF EXISTS "inventories_select" ON public.inventories;

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
                -- Company admin sees all company inventories
                (get_current_user_info()).role = 'company_admin'
                OR
                -- Manager: can see own region's inventory; if inventory marks manager_visibility='full', allow company-wide
                (
                    (get_current_user_info()).role = 'manager'
                    AND (
                        inventories.manager_visibility = 'full'
                        OR EXISTS (
                            SELECT 1 FROM public.regions r
                            WHERE r.inventory_id = inventories.id
                            AND r.id = (get_current_user_info()).region_id
                        )
                    )
                )
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
-- STEP 2: Fix inventory_items SELECT - Manager limited by region unless inventory manager_visibility='full'
-- =============================================================================
DROP POLICY IF EXISTS "inventory_items_select" ON public.inventory_items;

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
            -- Company admin sees all company inventory items
            (get_current_user_info()).role = 'company_admin'
            OR
            -- Manager sees items from inventory linked to their region, unless manager_visibility='full'
            (
                (get_current_user_info()).role = 'manager'
                AND (
                    i.manager_visibility = 'full'
                    OR EXISTS (
                        SELECT 1 FROM public.regions r
                        WHERE r.inventory_id = i.id
                        AND r.id = (get_current_user_info()).region_id
                    )
                )
            )
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

-- =============================================================================
-- STEP 3: Fix inventory_items ALL (INSERT/UPDATE/DELETE) - Add region filters + optional manager_visibility='full'
-- =============================================================================
DROP POLICY IF EXISTS "inventory_items_all" ON public.inventory_items;

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
        AND (
            -- Company admin can modify all company inventories
            (get_current_user_info()).role = 'company_admin'
            OR
            -- Manager can modify: own region; if manager_visibility='full' allow company-wide
            (
                (get_current_user_info()).role = 'manager'
                AND (
                    i.manager_visibility = 'full'
                    OR EXISTS (
                        SELECT 1 FROM public.regions r
                        WHERE r.inventory_id = i.id
                        AND r.id = (get_current_user_info()).region_id
                    )
                )
            )
            OR
            -- Supervisor can modify only their regions' inventories
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
)
WITH CHECK (
    (get_current_user_info()).role IN ('developer', 'admin')
    OR
    EXISTS (
        SELECT 1 FROM public.inventories i
        WHERE i.id = inventory_items.inventory_id
        AND i.company_code = (get_current_user_info()).company_code
        AND i.deleted_at IS NULL
        AND (
            (get_current_user_info()).role = 'company_admin'
            OR
            (
                (get_current_user_info()).role = 'manager'
                AND (
                    i.manager_visibility = 'full'
                    OR EXISTS (
                        SELECT 1 FROM public.regions r
                        WHERE r.inventory_id = i.id
                        AND r.id = (get_current_user_info()).region_id
                    )
                )
            )
            OR
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
-- STEP 4: Fix inventory_transactions SELECT - Manager limited by region unless manager_visibility='full'
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
            -- Company admin sees all company transactions
            (get_current_user_info()).role = 'company_admin'
            OR
            -- Manager sees transactions from their region's inventory; if manager_visibility='full', allow all company inventories
            (
                (get_current_user_info()).role = 'manager'
                AND (
                    i.manager_visibility = 'full'
                    OR EXISTS (
                        SELECT 1 FROM public.regions r
                        WHERE r.inventory_id = i.id
                        AND r.id = (get_current_user_info()).region_id
                    )
                )
            )
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
-- STEP 5: Fix inventory_transactions INSERT - Add region filters + manager_visibility='full'
-- =============================================================================
DROP POLICY IF EXISTS "System can insert transactions" ON public.inventory_transactions;
DROP POLICY IF EXISTS "inventory_transactions_insert" ON public.inventory_transactions;

CREATE POLICY "inventory_transactions_insert" ON public.inventory_transactions
FOR INSERT TO authenticated
WITH CHECK (
    (get_current_user_info()).role IN ('developer', 'admin')
    OR
    EXISTS (
        SELECT 1 FROM public.inventories i
        WHERE i.id = inventory_transactions.inventory_id
        AND i.company_code = (get_current_user_info()).company_code
        AND i.deleted_at IS NULL
        AND (
            (get_current_user_info()).role = 'company_admin'
            OR
            (
                (get_current_user_info()).role = 'manager'
                AND (
                    i.manager_visibility = 'full'
                    OR EXISTS (
                        SELECT 1 FROM public.regions r
                        WHERE r.inventory_id = i.id
                        AND r.id = (get_current_user_info()).region_id
                    )
                )
            )
            OR
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
-- STEP 6: Remove the old permissive "System can manage" policy if it still exists
-- (should have been dropped in 073, but just in case)
-- =============================================================================
DROP POLICY IF EXISTS "System can manage inventory items" ON public.inventory_items;

-- =============================================================================
-- Comments
-- =============================================================================
COMMENT ON POLICY "inventories_select" ON public.inventories IS
'SELECT: admin/dev=all, company_admin=company, manager=own region or all if manager_visibility=full, supervisor=own regions, client/driver=own region';

COMMENT ON POLICY "inventory_items_select" ON public.inventory_items IS
'SELECT: respects inventory access with region filtering for manager (or full when enabled) and supervisor';

COMMENT ON POLICY "inventory_items_all" ON public.inventory_items IS
'INSERT/UPDATE/DELETE: company_admin=company, manager=own region or all when manager_visibility=full, supervisor=own regions';

COMMENT ON POLICY "inventory_transactions_select" ON public.inventory_transactions IS
'SELECT: respects inventory access with region filtering for manager (or full when enabled) and supervisor';

COMMENT ON POLICY "inventory_transactions_insert" ON public.inventory_transactions IS
'INSERT: company_admin=company, manager=own region or all when manager_visibility=full, supervisor=own regions. Triggers use SECURITY DEFINER.';
