-- =============================================
-- Migracija 072: Fix Developer Impersonation
-- =============================================
-- Problem: Developer ne može da kreira zahteve dok je impersoniran kao manager
-- jer RLS proverava company_code koji ne odgovara impersoniranoj firmi.
--
-- Rešenje: Dodati izuzetak za developer ulogu - developeri mogu kreirati
-- zahteve za bilo koju firmu (korisno za testiranje).
-- Ovo je bezbedno jer developer već ima pristup svim podacima.
-- =============================================

-- Drop existing INSERT policy for managers
DROP POLICY IF EXISTS "pickup_requests_manager_insert" ON public.pickup_requests;

-- Recreate INSERT policy with developer exception
CREATE POLICY "pickup_requests_manager_insert" ON public.pickup_requests
FOR INSERT TO authenticated
WITH CHECK (
    -- Developeri mogu kreirati zahteve za bilo koju firmu (impersonacija)
    (get_current_user_info()).role = 'developer'
    OR
    -- Ostali moraju da budu u istoj firmi
    (
        company_code = (get_current_user_info()).company_code
        AND (get_current_user_info()).role IN ('manager', 'company_admin', 'admin')
    )
);

-- Also fix UPDATE policy for developer impersonation
DROP POLICY IF EXISTS "pickup_requests_update" ON public.pickup_requests;

CREATE POLICY "pickup_requests_update" ON public.pickup_requests
FOR UPDATE TO authenticated
USING (
    -- Developeri mogu da menjaju sve
    (get_current_user_info()).role = 'developer'
    OR
    (
        company_code = (get_current_user_info()).company_code
        AND (get_current_user_info()).role IN ('manager', 'supervisor', 'company_admin', 'admin')
    )
)
WITH CHECK (
    -- Developeri mogu da menjaju sve
    (get_current_user_info()).role = 'developer'
    OR
    (
        company_code = (get_current_user_info()).company_code
        AND (get_current_user_info()).role IN ('manager', 'supervisor', 'company_admin', 'admin')
    )
);

-- Also fix DELETE policy for developer impersonation
DROP POLICY IF EXISTS "pickup_requests_delete" ON public.pickup_requests;

CREATE POLICY "pickup_requests_delete" ON public.pickup_requests
FOR DELETE TO authenticated
USING (
    -- Developeri mogu da brišu sve
    (get_current_user_info()).role = 'developer'
    OR
    (
        company_code = (get_current_user_info()).company_code
        AND (
            -- Manager/admin može da briše sve u firmi
            (get_current_user_info()).role IN ('manager', 'supervisor', 'company_admin', 'admin')
            OR
            -- Client može da briše samo svoje pending zahteve
            (
                user_id = (get_current_user_info()).user_id
                AND (get_current_user_info()).role = 'client'
                AND status = 'pending'
            )
        )
    )
);

-- Komentar
COMMENT ON POLICY "pickup_requests_manager_insert" ON public.pickup_requests IS
'Dozvolaja INSERT za managere/admine u njihovoj firmi, i za developere u bilo kojoj firmi (impersonacija)';

-- =============================================================================
-- Fix Inventory RLS for Developer Impersonation
-- =============================================================================
-- Problem: Developer ne vidi skladišta drugih firmi dok je impersoniran
-- Rešenje: Developer može da vidi/menja sve (već ima pristup svim podacima)
-- =============================================================================

-- Fix inventories SELECT policy
DROP POLICY IF EXISTS "inventories_select" ON public.inventories;
CREATE POLICY "inventories_select" ON public.inventories
FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND (
        -- Developeri vide sve
        (get_current_user_info()).role = 'developer'
        OR
        -- Admin vidi sve
        (get_current_user_info()).role = 'admin'
        OR
        -- Ostali vide samo svoju firmu
        company_code = (get_current_user_info()).company_code
    )
);

-- Fix inventories INSERT policy
DROP POLICY IF EXISTS "inventories_insert" ON public.inventories;
CREATE POLICY "inventories_insert" ON public.inventories
FOR INSERT TO authenticated
WITH CHECK (
    -- Developeri mogu sve
    (get_current_user_info()).role = 'developer'
    OR
    (
        company_code = (get_current_user_info()).company_code
        AND (get_current_user_info()).role IN ('company_admin', 'admin')
    )
);

-- Fix inventories UPDATE policy
DROP POLICY IF EXISTS "inventories_update" ON public.inventories;
CREATE POLICY "inventories_update" ON public.inventories
FOR UPDATE TO authenticated
USING (
    (get_current_user_info()).role = 'developer'
    OR
    (
        company_code = (get_current_user_info()).company_code
        AND (get_current_user_info()).role IN ('company_admin', 'admin')
    )
)
WITH CHECK (
    (get_current_user_info()).role = 'developer'
    OR
    (
        company_code = (get_current_user_info()).company_code
        AND (get_current_user_info()).role IN ('company_admin', 'admin')
    )
);

-- Fix inventories DELETE policy
DROP POLICY IF EXISTS "inventories_delete" ON public.inventories;
CREATE POLICY "inventories_delete" ON public.inventories
FOR DELETE TO authenticated
USING (
    (get_current_user_info()).role = 'developer'
    OR
    (
        company_code = (get_current_user_info()).company_code
        AND (get_current_user_info()).role IN ('company_admin', 'admin')
    )
);

-- =============================================================================
-- Fix inventory_items RLS for Developer
-- =============================================================================
DROP POLICY IF EXISTS "inventory_items_select" ON public.inventory_items;
CREATE POLICY "inventory_items_select" ON public.inventory_items
FOR SELECT TO authenticated
USING (
    (get_current_user_info()).role IN ('developer', 'admin')
    OR
    EXISTS (
        SELECT 1 FROM public.inventories i
        WHERE i.id = inventory_items.inventory_id
        AND i.company_code = (get_current_user_info()).company_code
        AND i.deleted_at IS NULL
    )
);

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
    )
);

-- =============================================================================
-- Fix inventory_transactions RLS for Developer
-- =============================================================================
DROP POLICY IF EXISTS "inventory_transactions_select" ON public.inventory_transactions;
CREATE POLICY "inventory_transactions_select" ON public.inventory_transactions
FOR SELECT TO authenticated
USING (
    (get_current_user_info()).role IN ('developer', 'admin')
    OR
    EXISTS (
        SELECT 1 FROM public.inventories i
        WHERE i.id = inventory_transactions.inventory_id
        AND i.company_code = (get_current_user_info()).company_code
        AND i.deleted_at IS NULL
    )
);

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
    )
);
