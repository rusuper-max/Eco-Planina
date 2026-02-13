-- =============================================================================
-- Migration 078: Fix fuel_logs INSERT - Allow manager/supervisor/company_admin
-- =============================================================================
-- Problem: Only drivers and admin/developer can INSERT fuel logs.
-- Manager, supervisor, and company_admin get RLS violation when creating
-- fuel logs because no INSERT policy covers them.
--
-- fuel_logs_company_manage (FOR ALL) only covers company_admin,
-- but manager and supervisor have no INSERT or ALL policy.
-- =============================================================================

-- Drop old company_manage (ALL for company_admin only) and replace with
-- a broader policy that also covers manager and supervisor for INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "fuel_logs_company_manage" ON public.fuel_logs;

CREATE POLICY "fuel_logs_company_manage" ON public.fuel_logs
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.company_code = fuel_logs.company_code
        AND u.role IN ('company_admin', 'manager', 'supervisor')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.company_code = fuel_logs.company_code
        AND u.role IN ('company_admin', 'manager', 'supervisor')
    )
);

-- =============================================================================
-- Comments
-- =============================================================================
COMMENT ON POLICY "fuel_logs_company_manage" ON public.fuel_logs IS
'ALL: company_admin/manager/supervisor can read, create, update, delete fuel logs for their company';
