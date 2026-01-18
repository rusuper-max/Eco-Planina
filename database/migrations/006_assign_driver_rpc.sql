-- =============================================================================
-- ASSIGN REQUESTS TO DRIVER RPC FUNCTION
-- Run this in Supabase SQL Editor
-- =============================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS assign_requests_to_driver(UUID[], UUID, VARCHAR);

-- Create the RPC function for assigning requests to drivers
CREATE OR REPLACE FUNCTION assign_requests_to_driver(
    p_request_ids UUID[],
    p_driver_id UUID,
    p_company_code VARCHAR
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request_id UUID;
    v_request RECORD;
    v_assigned_by UUID;
    v_count INT := 0;
BEGIN
    -- Get the current user's ID for assigned_by
    SELECT id INTO v_assigned_by
    FROM public.users
    WHERE auth_id = auth.uid()
    AND deleted_at IS NULL
    LIMIT 1;

    -- Validate that driver exists and belongs to company
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = p_driver_id
        AND role = 'driver'
        AND company_code = p_company_code
        AND deleted_at IS NULL
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Vozač nije pronađen ili ne pripada ovoj firmi'
        );
    END IF;

    -- Loop through each request and create assignment
    FOREACH v_request_id IN ARRAY p_request_ids
    LOOP
        -- Get request details for denormalization
        SELECT
            pr.id,
            u.name as client_name,
            u.address as client_address,
            pr.waste_type,
            pr.waste_label,
            u.latitude,
            u.longitude
        INTO v_request
        FROM public.pickup_requests pr
        JOIN public.users u ON pr.user_id = u.id
        WHERE pr.id = v_request_id
        AND pr.company_code = p_company_code
        AND pr.deleted_at IS NULL;

        -- Skip if request not found
        IF v_request.id IS NULL THEN
            CONTINUE;
        END IF;

        -- Insert or update driver_assignment
        INSERT INTO public.driver_assignments (
            driver_id,
            request_id,
            company_code,
            assigned_by,
            assigned_at,
            status,
            -- Denormalized data for history
            client_name,
            client_address,
            waste_type,
            waste_label,
            latitude,
            longitude
        )
        VALUES (
            p_driver_id,
            v_request_id,
            p_company_code,
            v_assigned_by,
            NOW(),
            'assigned',
            v_request.client_name,
            v_request.client_address,
            v_request.waste_type,
            v_request.waste_label,
            v_request.latitude,
            v_request.longitude
        )
        ON CONFLICT (request_id)
        DO UPDATE SET
            driver_id = p_driver_id,
            assigned_by = v_assigned_by,
            assigned_at = NOW(),
            status = 'assigned',
            client_name = v_request.client_name,
            client_address = v_request.client_address,
            waste_type = v_request.waste_type,
            waste_label = v_request.waste_label,
            latitude = v_request.latitude,
            longitude = v_request.longitude,
            updated_at = NOW();

        v_count := v_count + 1;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'assigned_count', v_count
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION assign_requests_to_driver(UUID[], UUID, VARCHAR) TO authenticated;

-- Add unique constraint on request_id if not exists (for upsert to work)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'driver_assignments_request_id_key'
    ) THEN
        ALTER TABLE public.driver_assignments
        ADD CONSTRAINT driver_assignments_request_id_key UNIQUE (request_id);
    END IF;
EXCEPTION
    WHEN duplicate_table THEN
        NULL;
END $$;

-- =============================================================================
-- DONE! Now the assign_requests_to_driver RPC function is available
-- =============================================================================
