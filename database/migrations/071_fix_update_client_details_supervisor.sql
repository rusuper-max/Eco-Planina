-- =============================================
-- Migracija 071: Fix update_client_details za supervisor ulogu
-- =============================================
-- Problem: Supervisor uloga nije bila dozvoljena u update_client_details funkciji
-- što je blokiralo bulk dodeljivanje vrsta robe klijentima za supervizore

-- Prvo obriši postojeću funkciju
DROP FUNCTION IF EXISTS public.update_client_details(uuid, uuid[], text, text, text[]);

-- Ponovo kreiraj funkciju SA supervisor ulogom
CREATE OR REPLACE FUNCTION public.update_client_details(
    p_client_id UUID,
    p_equipment_types UUID[],
    p_manager_note TEXT,
    p_pib TEXT,
    p_allowed_waste_types TEXT[] DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role TEXT;
    v_caller_company TEXT;
    v_client_company TEXT;
    v_supervisor_region_ids UUID[];
    v_client_region_id UUID;
BEGIN
    -- Get caller's role and company
    SELECT role, company_code INTO v_caller_role, v_caller_company
    FROM users
    WHERE auth_id = auth.uid()
    AND deleted_at IS NULL;

    -- Check if caller is manager, supervisor, company_admin, admin or developer
    -- FIX: Added 'supervisor' to allowed roles
    IF v_caller_role NOT IN ('manager', 'supervisor', 'company_admin', 'admin', 'developer') THEN
        RETURN FALSE;
    END IF;

    -- Get client's company and region
    SELECT company_code, region_id INTO v_client_company, v_client_region_id
    FROM users
    WHERE id = p_client_id
    AND deleted_at IS NULL;

    -- For non-admins, verify same company
    IF v_caller_role NOT IN ('admin', 'developer') AND v_caller_company != v_client_company THEN
        RETURN FALSE;
    END IF;

    -- For supervisors, verify client is in their supervised regions
    IF v_caller_role = 'supervisor' THEN
        SELECT ARRAY_AGG(region_id) INTO v_supervisor_region_ids
        FROM supervisor_regions sr
        JOIN users u ON u.id = sr.supervisor_id AND u.auth_id = auth.uid()
        WHERE sr.supervisor_id = u.id;

        IF v_client_region_id IS NOT NULL AND NOT (v_client_region_id = ANY(v_supervisor_region_ids)) THEN
            RETURN FALSE;
        END IF;
    END IF;

    -- Update the client
    UPDATE users
    SET
        equipment_types = p_equipment_types,
        manager_note = p_manager_note,
        pib = p_pib,
        allowed_waste_types = p_allowed_waste_types
    WHERE id = p_client_id
    AND deleted_at IS NULL;

    RETURN TRUE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_client_details(UUID, UUID[], TEXT, TEXT, TEXT[]) TO authenticated;

-- Komentar
COMMENT ON FUNCTION public.update_client_details IS 'Updates client details including equipment, notes, PIB and allowed waste types. Allowed for manager, supervisor, company_admin, admin, developer roles.';
