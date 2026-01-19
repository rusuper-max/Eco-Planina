-- =============================================================================
-- WASTE TYPES UPDATE FUNCTION
-- Security definer function to update waste types bypassing RLS
-- =============================================================================

-- Function to update a waste type
CREATE OR REPLACE FUNCTION public.update_waste_type(
    p_waste_type_id UUID,
    p_name TEXT DEFAULT NULL,
    p_icon TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_region_id UUID DEFAULT NULL,
    p_custom_image_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role TEXT;
    v_caller_company TEXT;
    v_waste_type_company TEXT;
    v_result JSONB;
BEGIN
    -- Get caller's role and company
    SELECT role, company_code INTO v_caller_role, v_caller_company
    FROM users
    WHERE auth_id = auth.uid()
    AND deleted_at IS NULL;

    -- Check if caller has permission
    IF v_caller_role NOT IN ('manager', 'company_admin', 'admin', 'developer') THEN
        RAISE EXCEPTION 'Unauthorized: only managers and admins can update waste types';
    END IF;

    -- Get waste type's company
    SELECT company_code INTO v_waste_type_company
    FROM waste_types
    WHERE id = p_waste_type_id
    AND deleted_at IS NULL;

    IF v_waste_type_company IS NULL THEN
        RAISE EXCEPTION 'Waste type not found';
    END IF;

    -- For non-global admins, verify same company
    IF v_caller_role NOT IN ('admin', 'developer') AND v_caller_company != v_waste_type_company THEN
        RAISE EXCEPTION 'Unauthorized: cannot update waste types from another company';
    END IF;

    -- Update the waste type
    UPDATE waste_types
    SET
        name = COALESCE(p_name, name),
        icon = COALESCE(p_icon, icon),
        description = COALESCE(p_description, description),
        region_id = CASE WHEN p_region_id IS NOT NULL THEN p_region_id ELSE region_id END,
        custom_image_url = p_custom_image_url,  -- Allow setting to NULL
        updated_at = NOW()
    WHERE id = p_waste_type_id
    AND deleted_at IS NULL;

    -- Return the updated record
    SELECT jsonb_build_object(
        'id', id,
        'name', name,
        'icon', icon,
        'description', description,
        'region_id', region_id,
        'custom_image_url', custom_image_url,
        'updated_at', updated_at,
        'company_code', company_code
    ) INTO v_result
    FROM waste_types
    WHERE id = p_waste_type_id;

    RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_waste_type(UUID, TEXT, TEXT, TEXT, UUID, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.update_waste_type IS
'Security definer function to update waste types. Bypasses RLS but checks permissions internally.';
