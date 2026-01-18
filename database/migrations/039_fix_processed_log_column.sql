-- =============================================================================
-- FIX: Update log_request_processed trigger to use correct column name
-- The DataContext uses 'request_id' not 'original_request_id'
-- =============================================================================

-- Fix the log_request_processed function to use the correct column name
CREATE OR REPLACE FUNCTION log_request_processed()
RETURNS TRIGGER AS $$
DECLARE
    v_processor RECORD;
BEGIN
    -- Dobij info o menadzeru koji je obradio
    IF NEW.processed_by_id IS NOT NULL THEN
        SELECT id, name, role INTO v_processor
        FROM public.users
        WHERE id = NEW.processed_by_id
        LIMIT 1;
    END IF;

    PERFORM log_activity(
        v_processor.id,
        COALESCE(v_processor.name, NEW.processed_by_name, 'Sistem'),
        COALESCE(v_processor.role, 'manager'),
        NEW.company_code,
        'process',
        'pickup_request',
        NEW.request_id,  -- Changed from original_request_id to request_id
        'Zahtev obradjen: ' || COALESCE(NEW.waste_label, NEW.waste_type) || ' od ' || COALESCE(NEW.client_name, 'Nepoznat'),
        jsonb_build_object(
            'client_name', NEW.client_name,
            'waste_type', NEW.waste_type,
            'processed_request_id', NEW.id
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger already exists, just need to update the function
-- Running this will automatically apply to the existing trigger

