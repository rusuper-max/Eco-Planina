-- =============================================================================
-- ATOMIC PROCESS REQUEST - Prevents duplicate bug
-- =============================================================================
-- This RPC function handles request processing atomically:
-- 1. Deletes from pickup_requests FIRST
-- 2. Inserts into processed_requests
-- 3. Updates driver_assignments
-- All in a single transaction - if any step fails, everything rolls back.
-- =============================================================================

CREATE OR REPLACE FUNCTION process_pickup_request(
    p_request_id UUID,
    p_company_code VARCHAR,
    p_processor_id UUID,
    p_processor_name VARCHAR,
    p_status VARCHAR DEFAULT 'completed',
    p_notes TEXT DEFAULT NULL,
    p_driver_id UUID DEFAULT NULL,
    p_driver_name VARCHAR DEFAULT NULL,
    p_proof_image_url TEXT DEFAULT NULL,
    p_weight NUMERIC DEFAULT NULL,
    p_weight_unit VARCHAR DEFAULT 'kg'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request RECORD;
    v_processed_id UUID;
    v_assignment RECORD;
    v_driver_id UUID;
    v_driver_name VARCHAR;
BEGIN
    -- Step 1: Lock and fetch the request (prevents race conditions)
    SELECT * INTO v_request
    FROM pickup_requests
    WHERE id = p_request_id
      AND company_code = p_company_code
      AND deleted_at IS NULL
    FOR UPDATE;

    -- Verify request exists
    IF v_request IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Request not found or already processed',
            'code', 'NOT_FOUND'
        );
    END IF;

    -- Step 2: Get the driver assignment if exists
    SELECT id, driver_id, picked_up_at, delivered_at
    INTO v_assignment
    FROM driver_assignments
    WHERE request_id = p_request_id
      AND company_code = p_company_code
      AND deleted_at IS NULL
    LIMIT 1;

    -- Determine driver info: use provided or from assignment
    v_driver_id := COALESCE(p_driver_id, v_assignment.driver_id);
    v_driver_name := p_driver_name;

    -- Get driver name if we have driver_id but no name
    IF v_driver_id IS NOT NULL AND v_driver_name IS NULL THEN
        SELECT name INTO v_driver_name
        FROM users
        WHERE id = v_driver_id;
    END IF;

    -- Step 3: INSERT into processed_requests
    -- Column names must match actual table schema
    INSERT INTO processed_requests (
        request_id,
        request_code,
        company_code,
        client_id,
        client_name,
        client_address,
        waste_type,
        waste_label,
        fill_level,
        urgency,
        note,
        processing_note,
        created_at,
        processed_by_id,
        processed_by_name,
        driver_id,
        driver_name,
        driver_assignment_id,
        status,
        region_id,
        proof_image_url,
        weight,
        weight_unit
    ) VALUES (
        v_request.id,
        v_request.request_code,
        v_request.company_code,
        v_request.user_id,  -- pickup_requests uses user_id, processed_requests uses client_id
        v_request.client_name,
        v_request.client_address,
        v_request.waste_type,
        v_request.waste_label,
        v_request.fill_level,
        v_request.urgency,
        v_request.note,
        p_notes,  -- processing_note from manager
        v_request.created_at,
        p_processor_id,
        p_processor_name,
        v_driver_id,
        v_driver_name,
        v_assignment.id,
        p_status,
        v_request.region_id,
        p_proof_image_url,
        p_weight,
        p_weight_unit
    )
    RETURNING id INTO v_processed_id;

    -- Step 4: Update driver_assignments to completed
    IF v_assignment.id IS NOT NULL THEN
        UPDATE driver_assignments
        SET status = 'completed',
            completed_at = NOW(),
            -- Only set delivered_at if not already set by driver
            delivered_at = COALESCE(v_assignment.delivered_at, NOW())
        WHERE id = v_assignment.id;
    END IF;

    -- Step 5: DELETE from pickup_requests (LAST step, after everything else succeeds)
    DELETE FROM pickup_requests
    WHERE id = p_request_id;

    -- Return success with the processed record ID
    RETURN jsonb_build_object(
        'success', true,
        'processed_id', v_processed_id,
        'request_code', v_request.request_code
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Any error = full rollback, return error info
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'code', SQLSTATE
        );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION process_pickup_request(UUID, VARCHAR, UUID, VARCHAR, VARCHAR, TEXT, UUID, VARCHAR, TEXT, NUMERIC, VARCHAR) TO authenticated;

-- =============================================================================
-- ATOMIC REJECT REQUEST
-- =============================================================================
CREATE OR REPLACE FUNCTION reject_pickup_request(
    p_request_id UUID,
    p_company_code VARCHAR,
    p_processor_id UUID,
    p_processor_name VARCHAR,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request RECORD;
    v_processed_id UUID;
    v_assignment_id UUID;
BEGIN
    -- Step 1: Lock and fetch the request
    SELECT * INTO v_request
    FROM pickup_requests
    WHERE id = p_request_id
      AND company_code = p_company_code
      AND deleted_at IS NULL
    FOR UPDATE;

    IF v_request IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Request not found or already processed',
            'code', 'NOT_FOUND'
        );
    END IF;

    -- Step 2: Soft-delete any driver assignment
    UPDATE driver_assignments
    SET deleted_at = NOW()
    WHERE request_id = p_request_id
      AND company_code = p_company_code
      AND deleted_at IS NULL
    RETURNING id INTO v_assignment_id;

    -- Step 3: Insert into processed_requests with status='rejected'
    -- Column names must match actual table schema
    INSERT INTO processed_requests (
        request_id,
        request_code,
        company_code,
        client_id,
        client_name,
        client_address,
        waste_type,
        waste_label,
        fill_level,
        urgency,
        note,
        processing_note,
        created_at,
        processed_by_id,
        processed_by_name,
        status,
        region_id
    ) VALUES (
        v_request.id,
        v_request.request_code,
        v_request.company_code,
        v_request.user_id,  -- pickup_requests uses user_id, processed_requests uses client_id
        v_request.client_name,
        v_request.client_address,
        v_request.waste_type,
        v_request.waste_label,
        v_request.fill_level,
        v_request.urgency,
        v_request.note,
        p_notes,  -- rejection reason from manager
        v_request.created_at,
        p_processor_id,
        p_processor_name,
        'rejected',
        v_request.region_id
    )
    RETURNING id INTO v_processed_id;

    -- Step 4: Delete from pickup_requests
    DELETE FROM pickup_requests
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'processed_id', v_processed_id,
        'request_code', v_request.request_code
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'code', SQLSTATE
        );
END;
$$;

GRANT EXECUTE ON FUNCTION reject_pickup_request(UUID, VARCHAR, UUID, VARCHAR, TEXT) TO authenticated;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- Test:
-- SELECT process_pickup_request(
--     'request-uuid'::UUID,
--     'COMPANY1',
--     'processor-uuid'::UUID,
--     'Manager Name',
--     'completed',
--     'Notes here'
-- );
-- =============================================================================
