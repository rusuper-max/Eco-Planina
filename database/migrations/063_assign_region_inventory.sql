-- =============================================================================
-- RPC: assign_region_inventory
-- Purpose: Safely (and visibly) assign/unassign a region to an inventory
-- Roles: company_admin, admin, developer
-- This bypasses RLS via SECURITY DEFINER but enforces company checks manually.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.assign_region_inventory(
    p_region_id UUID,
    p_inventory_id UUID DEFAULT NULL
)
RETURNS regions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_info current_user_info;
    v_region_company TEXT;
    v_inventory_company TEXT;
    v_result regions;
BEGIN
    v_user_info := get_current_user_info();

    IF v_user_info IS NULL OR v_user_info.user_id IS NULL THEN
        RAISE EXCEPTION 'Niste prijavljeni';
    END IF;

    IF v_user_info.role NOT IN ('company_admin', 'admin', 'developer') THEN
        RAISE EXCEPTION 'Nemate dozvolu za dodelu skladišta';
    END IF;

    SELECT company_code INTO v_region_company
    FROM regions
    WHERE id = p_region_id
      AND deleted_at IS NULL;

    IF v_region_company IS NULL THEN
        RAISE EXCEPTION 'Filijala nije pronađena';
    END IF;

    IF v_region_company <> v_user_info.company_code
       AND v_user_info.role NOT IN ('admin', 'developer') THEN
        RAISE EXCEPTION 'Filijala nije u vašoj firmi';
    END IF;

    IF p_inventory_id IS NOT NULL THEN
        SELECT company_code INTO v_inventory_company
        FROM inventories
        WHERE id = p_inventory_id
          AND deleted_at IS NULL;

        IF v_inventory_company IS NULL THEN
            RAISE EXCEPTION 'Skladište nije pronađeno';
        END IF;

        IF v_inventory_company <> v_region_company THEN
            RAISE EXCEPTION 'Skladište pripada drugoj firmi';
        END IF;
    END IF;

    UPDATE regions
    SET inventory_id = p_inventory_id
    WHERE id = p_region_id
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_region_inventory(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.assign_region_inventory(UUID, UUID) IS 'Assign/unassign a region to an inventory with company checks; roles: company_admin/admin/developer';
