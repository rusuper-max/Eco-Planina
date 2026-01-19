-- =============================================================================
-- FIX ACTIVITY LOG FOR REJECTED REQUESTS
-- =============================================================================
-- This migration updates the log_request_processed trigger function to
-- correctly distinguish between processed (completed) and rejected requests
-- =============================================================================

-- Update the trigger function to check status
CREATE OR REPLACE FUNCTION log_request_processed()
RETURNS TRIGGER AS $$
DECLARE
    v_processor RECORD;
    v_action TEXT;
    v_description TEXT;
BEGIN
    -- Dobij info o menadzeru koji je obradio
    IF NEW.processed_by_id IS NOT NULL THEN
        SELECT id, name, role INTO v_processor
        FROM public.users
        WHERE id = NEW.processed_by_id
        LIMIT 1;
    END IF;

    -- Odredi akciju i opis na osnovu statusa
    IF NEW.status = 'rejected' THEN
        v_action := 'rejected';
        v_description := 'Zahtev odbijen: ' || COALESCE(NEW.waste_label, NEW.waste_type) || ' od ' || COALESCE(NEW.client_name, 'Nepoznat');
    ELSE
        v_action := 'process';
        v_description := 'Zahtev obradjen: ' || COALESCE(NEW.waste_label, NEW.waste_type) || ' od ' || COALESCE(NEW.client_name, 'Nepoznat');
    END IF;

    PERFORM log_activity(
        v_processor.id,
        COALESCE(v_processor.name, NEW.processed_by_name, 'Sistem'),
        COALESCE(v_processor.role, 'manager'),
        NEW.company_code,
        v_action,
        'pickup_request',
        NEW.request_id,
        v_description,
        jsonb_build_object(
            'client_name', NEW.client_name,
            'waste_type', NEW.waste_type,
            'waste_label', NEW.waste_label,
            'processed_request_id', NEW.id,
            'status', NEW.status
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The trigger already exists, just the function is updated
-- No need to recreate the trigger since it references the function

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- Test by rejecting a request - the activity log should show "Odbijen" now
-- =============================================================================
