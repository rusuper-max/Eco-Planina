-- =============================================================================
-- FIX: delete_user_permanently - Correct auth_id lookup
-- =============================================================================
-- Problem: Function was looking for auth.users.id = public.users.id
-- but the correct link is public.users.auth_id -> auth.users.id
-- =============================================================================

DROP FUNCTION IF EXISTS public.delete_user_permanently(UUID, UUID);

CREATE OR REPLACE FUNCTION public.delete_user_permanently(p_target_user_id UUID, p_requesting_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_requester_role TEXT;
    v_requester_company_code TEXT;
    v_target_company_code TEXT;
    v_target_role TEXT;
    v_target_auth_id UUID;
BEGIN
    -- Get requester info
    SELECT role, company_code INTO v_requester_role, v_requester_company_code
    FROM public.users
    WHERE id = p_requesting_user_id;

    -- Check if requester exists
    IF v_requester_role IS NULL THEN
        RAISE EXCEPTION 'Korisnik koji šalje zahtev ne postoji';
    END IF;

    -- Get target user info INCLUDING auth_id
    SELECT role, company_code, auth_id INTO v_target_role, v_target_company_code, v_target_auth_id
    FROM public.users
    WHERE id = p_target_user_id;

    -- Check if target user exists
    IF v_target_role IS NULL THEN
        RAISE EXCEPTION 'Korisnik za brisanje ne postoji';
    END IF;

    -- Check authorization based on role hierarchy:
    -- god/admin/developer > company_admin > master_manager > manager > driver/client

    -- Super admins (platform level) can delete anyone
    IF v_requester_role IN ('god', 'admin', 'developer') THEN
        NULL; -- Allowed

    -- Company admin can delete everyone in their company except themselves and other company_admins
    ELSIF v_requester_role = 'company_admin' AND v_requester_company_code = v_target_company_code THEN
        IF p_target_user_id = p_requesting_user_id THEN
            RAISE EXCEPTION 'Ne možete obrisati sami sebe';
        END IF;
        IF v_target_role = 'company_admin' THEN
            RAISE EXCEPTION 'Ne možete obrisati drugog admina firme';
        END IF;
        NULL; -- Allowed

    -- Master manager (future) can delete manager, driver, client in their company
    ELSIF v_requester_role = 'master_manager' AND v_requester_company_code = v_target_company_code THEN
        IF v_target_role IN ('company_admin', 'master_manager', 'admin', 'god', 'developer') THEN
            RAISE EXCEPTION 'Master menadžer ne može obrisati korisnika sa ulogom: %', v_target_role;
        END IF;
        NULL; -- Allowed

    -- Manager can delete driver, client in their company
    ELSIF v_requester_role = 'manager' AND v_requester_company_code = v_target_company_code THEN
        IF v_target_role NOT IN ('driver', 'client') THEN
            RAISE EXCEPTION 'Menadžer može obrisati samo vozače i klijente';
        END IF;
        NULL; -- Allowed

    ELSE
        RAISE EXCEPTION 'Nemate dozvolu za brisanje ovog korisnika (vaša uloga: %, ciljna uloga: %)',
            v_requester_role, v_target_role;
    END IF;

    -- Clean up all references to this user
    -- Remove from driver_assignments
    UPDATE public.driver_assignments SET driver_id = NULL WHERE driver_id = p_target_user_id;

    -- Remove from processed_requests (client_id reference)
    UPDATE public.processed_requests SET client_id = NULL WHERE client_id = p_target_user_id;

    -- Delete notifications for this user
    DELETE FROM public.notifications WHERE user_id = p_target_user_id;

    -- Delete from public.users FIRST
    DELETE FROM public.users WHERE id = p_target_user_id;

    -- Delete from auth.users if auth_id exists
    -- This is the FIX - we now use auth_id from public.users
    IF v_target_auth_id IS NOT NULL THEN
        DELETE FROM auth.users WHERE id = v_target_auth_id;
    END IF;

END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_permanently(UUID, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.delete_user_permanently IS 'Permanently deletes a user from both public.users and auth.users tables. Fixed to use auth_id column.';
