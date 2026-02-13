-- =============================================================================
-- Migration 079: Fix inventory reset - Add DELETE/UPDATE policies for transactions
-- =============================================================================
-- Problem: inventory_transactions only has SELECT and INSERT policies.
-- When company_admin/manager tries to reset inventory (delete all items
-- and transactions), the DELETE silently fails because no DELETE policy exists.
--
-- Also: the reset function in the frontend uses direct supabase delete,
-- which is subject to RLS. Company admins should be able to delete all
-- company transactions; managers/supervisors only their region's.
-- =============================================================================

-- =============================================================================
-- STEP 1: Add DELETE policy for inventory_transactions
-- Only company_admin and admin/developer can DELETE transactions
-- (managers/supervisors should not be able to delete transaction history)
-- =============================================================================
DROP POLICY IF EXISTS "inventory_transactions_delete" ON public.inventory_transactions;

CREATE POLICY "inventory_transactions_delete" ON public.inventory_transactions
FOR DELETE TO authenticated
USING (
    (get_current_user_info()).role IN ('developer', 'admin')
    OR
    EXISTS (
        SELECT 1 FROM public.inventories i
        WHERE i.id = inventory_transactions.inventory_id
        AND i.company_code = (get_current_user_info()).company_code
        AND (get_current_user_info()).role = 'company_admin'
    )
);

-- =============================================================================
-- STEP 2: Add DELETE policy for inventory_items (company_admin unrestricted)
-- The existing inventory_items_all policy requires region match for managers.
-- For reset, company_admin needs to delete ALL items regardless of region.
-- The existing policy already covers this (company_admin has no region filter),
-- but let's verify it works by ensuring company_admin is in the USING clause.
-- =============================================================================
-- No change needed: inventory_items_all already allows company_admin to delete
-- all company items without region restriction.

-- =============================================================================
-- Comments
-- =============================================================================
COMMENT ON POLICY "inventory_transactions_delete" ON public.inventory_transactions IS
'DELETE: only admin/developer and company_admin can delete transactions (for inventory reset)';
