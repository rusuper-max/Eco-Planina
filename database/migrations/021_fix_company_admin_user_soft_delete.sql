-- =============================================================================
-- Fix company_admin soft-delete on users
-- Problem: UPDATE (soft delete) on users fails RLS for company_admin
-- Solution: refresh the company_admin UPDATE policy so it explicitly allows
-- setting deleted_at for manager/driver/client rows in the same company.
-- Run this in Supabase SQL editor.
-- =============================================================================

-- Drop and recreate the company_admin update policy
DROP POLICY IF EXISTS "Company admin can update company users" ON public.users;

CREATE POLICY "Company admin can update company users" ON public.users
FOR UPDATE TO authenticated
USING (
    get_my_role() = 'company_admin'
    AND company_code = get_my_company_code()
    AND role != 'company_admin' -- ne diraj druge admine
)
WITH CHECK (
    company_code = get_my_company_code()
    AND role IN ('manager', 'driver', 'client') -- dozvoljene role posle izmena/soft delete
);

-- (Optional) ensure delete policy is present for hard deletes (if used)
-- DROP POLICY IF EXISTS "Company admin can delete company users" ON public.users;
-- CREATE POLICY "Company admin can delete company users" ON public.users
-- FOR DELETE TO authenticated
-- USING (
--     get_my_role() = 'company_admin'
--     AND company_code = get_my_company_code()
--     AND role != 'company_admin'
-- );

-- Verification:
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'users';

