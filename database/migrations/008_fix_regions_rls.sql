-- Migration 008: Fix RLS policies for regions table
-- Problem: INSERT/UPDATE/DELETE policies fail for company_admin because admin/developer logic returns NULL for company_code

-- ============================================
-- FIX INSERT POLICY
-- ============================================
DROP POLICY IF EXISTS "Company admin can create regions" ON public.regions;

CREATE POLICY "Company admin can create regions" ON public.regions
FOR INSERT WITH CHECK (
    -- Za company_admin: company_code mora odgovarati
    (
        get_my_role() = 'company_admin'
        AND company_code = get_my_company_code()
    )
    OR
    -- Za super admine: mogu kreirati za bilo koju firmu
    get_my_role() IN ('admin', 'developer')
);

-- ============================================
-- FIX UPDATE POLICY
-- ============================================
DROP POLICY IF EXISTS "Company admin can update regions" ON public.regions;

CREATE POLICY "Company admin can update regions" ON public.regions
FOR UPDATE USING (
    (
        get_my_role() = 'company_admin'
        AND company_code = get_my_company_code()
    )
    OR get_my_role() IN ('admin', 'developer')
) WITH CHECK (
    (
        get_my_role() = 'company_admin'
        AND company_code = get_my_company_code()
    )
    OR get_my_role() IN ('admin', 'developer')
);

-- ============================================
-- FIX DELETE POLICY
-- ============================================
DROP POLICY IF EXISTS "Company admin can delete regions" ON public.regions;

CREATE POLICY "Company admin can delete regions" ON public.regions
FOR DELETE USING (
    (
        get_my_role() = 'company_admin'
        AND company_code = get_my_company_code()
    )
    OR get_my_role() IN ('admin', 'developer')
);

-- ============================================
-- ALSO FIX: Users table region assignment policy
-- Allow company_admin to assign users to regions
-- ============================================
DROP POLICY IF EXISTS "Company admin can update user region" ON public.users;

CREATE POLICY "Company admin can update user region" ON public.users
FOR UPDATE USING (
    -- Company admin može ažurirati korisnike svoje firme
    (
        get_my_role() = 'company_admin'
        AND company_code = get_my_company_code()
    )
    OR
    -- Super admini mogu sve
    get_my_role() IN ('admin', 'developer')
    OR
    -- Korisnik može ažurirati svoj profil
    auth_id = auth.uid()
) WITH CHECK (
    (
        get_my_role() = 'company_admin'
        AND company_code = get_my_company_code()
    )
    OR get_my_role() IN ('admin', 'developer')
    OR auth_id = auth.uid()
);

-- ============================================
-- Grant execute on helper functions
-- ============================================
GRANT EXECUTE ON FUNCTION public.get_my_company_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_region_id() TO authenticated;
