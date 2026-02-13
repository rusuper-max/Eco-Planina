-- =============================================================================
-- FIX: delete_user_permanently - Handle ALL foreign key references
-- =============================================================================
-- Problem: Migration 058 only cleaned up 3 tables (driver_assignments.driver_id,
-- processed_requests.client_id, notifications). But there are 5+ more columns
-- referencing users(id) with NO ON DELETE clause, which causes RESTRICT errors
-- when trying to delete a manager or any user who has activity in the system.
--
-- Missing FK cleanup:
--   processed_requests.processed_by_id (NO ON DELETE - BLOCKS deletion)
--   fuel_logs.created_by              (NO ON DELETE - BLOCKS deletion)
--   driver_assignments.assigned_by    (NO ON DELETE - BLOCKS deletion)
--   supervisor_regions.assigned_by    (NO ON DELETE - BLOCKS deletion)
--   vehicle_drivers.assigned_by       (NO ON DELETE - BLOCKS deletion)
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

    IF v_requester_role IS NULL THEN
        RAISE EXCEPTION 'Korisnik koji šalje zahtev ne postoji';
    END IF;

    -- Get target user info INCLUDING auth_id
    SELECT role, company_code, auth_id INTO v_target_role, v_target_company_code, v_target_auth_id
    FROM public.users
    WHERE id = p_target_user_id;

    IF v_target_role IS NULL THEN
        RAISE EXCEPTION 'Korisnik za brisanje ne postoji';
    END IF;

    -- =========================================================================
    -- Authorization check based on role hierarchy
    -- god/admin/developer > company_admin > master_manager > manager > driver/client
    -- =========================================================================

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

    -- Master manager can delete manager, driver, client in their company
    ELSIF v_requester_role = 'master_manager' AND v_requester_company_code = v_target_company_code THEN
        IF v_target_role IN ('company_admin', 'master_manager', 'admin', 'god', 'developer') THEN
            RAISE EXCEPTION 'Master menadžer ne može obrisati korisnika sa ulogom: %', v_target_role;
        END IF;

    -- Manager can delete driver, client in their company
    ELSIF v_requester_role = 'manager' AND v_requester_company_code = v_target_company_code THEN
        IF v_target_role NOT IN ('driver', 'client') THEN
            RAISE EXCEPTION 'Menadžer može obrisati samo vozače i klijente';
        END IF;

    ELSE
        RAISE EXCEPTION 'Nemate dozvolu za brisanje ovog korisnika (vaša uloga: %, ciljna uloga: %)',
            v_requester_role, v_target_role;
    END IF;

    -- =========================================================================
    -- Clean up ALL foreign key references to this user
    -- Must handle every column that references users(id) without ON DELETE SET NULL/CASCADE
    -- =========================================================================

    -- driver_assignments: driver_id (SET NULL) and assigned_by (NO ON DELETE - must clean!)
    UPDATE public.driver_assignments SET driver_id = NULL WHERE driver_id = p_target_user_id;
    UPDATE public.driver_assignments SET assigned_by = NULL WHERE assigned_by = p_target_user_id;

    -- processed_requests: client_id AND processed_by_id (NO ON DELETE - must clean!)
    UPDATE public.processed_requests SET client_id = NULL WHERE client_id = p_target_user_id;
    UPDATE public.processed_requests SET processed_by_id = NULL WHERE processed_by_id = p_target_user_id;

    -- notifications: user_id (CASCADE, but explicit delete is cleaner)
    DELETE FROM public.notifications WHERE user_id = p_target_user_id;

    -- supervisor_regions: assigned_by (NO ON DELETE - must clean!)
    -- supervisor_id has CASCADE so it auto-deletes, but assigned_by does not
    UPDATE public.supervisor_regions SET assigned_by = NULL WHERE assigned_by = p_target_user_id;

    -- vehicle_drivers: assigned_by (NO ON DELETE - must clean!)
    -- driver_id has CASCADE so it auto-deletes, but assigned_by does not
    UPDATE public.vehicle_drivers SET assigned_by = NULL WHERE assigned_by = p_target_user_id;

    -- fuel_logs: created_by (NO ON DELETE - must clean!)
    -- driver_id has ON DELETE SET NULL so it's handled, but created_by is not
    UPDATE public.fuel_logs SET created_by = NULL WHERE created_by = p_target_user_id;

    -- =========================================================================
    -- The following have ON DELETE SET NULL/CASCADE and are handled automatically,
    -- but we list them here for documentation:
    --   activity_logs.user_id          -> ON DELETE SET NULL (auto)
    --   driver_locations.driver_id     -> ON DELETE CASCADE (auto)
    --   driver_location_history.driver_id -> ON DELETE CASCADE (auto)
    --   equipment.assigned_to          -> ON DELETE SET NULL (auto)
    --   fuel_logs.driver_id            -> ON DELETE SET NULL (auto)
    --   inventory_transactions.created_by -> ON DELETE SET NULL (auto)
    --   inventory_outbound.created_by  -> ON DELETE SET NULL (auto)
    --   inventory_outbound.sent_by     -> ON DELETE SET NULL (auto)
    --   inventory_outbound.confirmed_by -> ON DELETE SET NULL (auto)
    --   inventory_outbound.cancelled_by -> ON DELETE SET NULL (auto)
    --   pickup_requests.created_by_manager -> ON DELETE SET NULL (auto)
    -- =========================================================================

    -- Delete from public.users FIRST
    DELETE FROM public.users WHERE id = p_target_user_id;

    -- Delete from auth.users using auth_id
    IF v_target_auth_id IS NOT NULL THEN
        DELETE FROM auth.users WHERE id = v_target_auth_id;
    END IF;

END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_permanently(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.delete_user_permanently IS 'Permanently deletes a user. Cleans up ALL FK references including processed_by_id, assigned_by, created_by columns that lack ON DELETE clauses.';
