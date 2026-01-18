-- Migration: Add delete_region RPC function
-- Description: Allows company_admin to delete regions within their company bypassing RLS

-- Drop existing function if exists
DROP FUNCTION IF EXISTS public.delete_region(UUID);
DROP FUNCTION IF EXISTS public.delete_region(UUID, UUID);

-- Create the RPC function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.delete_region(p_region_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_user_role TEXT;
    v_user_company_code TEXT;
    v_region_company_code TEXT;
BEGIN
    -- Get user info from passed user_id
    SELECT role, company_code INTO v_user_role, v_user_company_code
    FROM public.users
    WHERE id = p_user_id;
    
    -- Check if user exists
    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'Korisnik ne postoji (user_id: %)', p_user_id;
    END IF;
    
    -- Get the region's company code
    SELECT company_code INTO v_region_company_code
    FROM public.regions
    WHERE id = p_region_id;
    
    -- Check if region exists
    IF v_region_company_code IS NULL THEN
        RAISE EXCEPTION 'Filijala ne postoji (region_id: %)', p_region_id;
    END IF;
    
    -- Check authorization
    -- Super admins (god, admin, developer) can delete any region
    IF v_user_role IN ('god', 'admin', 'developer') THEN
        NULL; -- Allowed
    -- Company admin can delete regions in their company
    ELSIF v_user_role = 'company_admin' AND v_user_company_code = v_region_company_code THEN
        NULL; -- Allowed
    -- Manager can also delete regions in their company
    ELSIF v_user_role = 'manager' AND v_user_company_code = v_region_company_code THEN
        NULL; -- Allowed
    ELSE
        RAISE EXCEPTION 'Nemate dozvolu za brisanje ove filijale (role: %, user_company: %, region_company: %)', 
            v_user_role, v_user_company_code, v_region_company_code;
    END IF;
    
    -- First, unassign users from this region (set their region_id to NULL)
    UPDATE public.users
    SET region_id = NULL
    WHERE region_id = p_region_id;
    
    -- Hard delete the region
    DELETE FROM public.regions
    WHERE id = p_region_id;
    
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_region(UUID, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.delete_region IS 'Permanently deletes a region. Requires user_id for authorization check.';
