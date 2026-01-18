-- =============================================================================
-- FIX: Don't log "delete" when pickup_request is being processed
-- The delete is part of the processing flow, not an actual deletion
-- =============================================================================

-- Update the delete trigger to check if request was processed
CREATE OR REPLACE FUNCTION log_pickup_request_deleted()
RETURNS TRIGGER AS $$
DECLARE
    v_deleter RECORD;
    v_was_processed BOOLEAN;
BEGIN
    -- Check if this request was processed (exists in processed_requests)
    SELECT EXISTS(
        SELECT 1 FROM public.processed_requests 
        WHERE request_id = OLD.id
    ) INTO v_was_processed;
    
    -- If the request was processed, don't log the delete
    -- (the processing action was already logged by processed_requests INSERT trigger)
    IF v_was_processed THEN
        RETURN OLD;
    END IF;

    -- Pokusaj da nadjes ko brise (current user)
    SELECT id, name, role INTO v_deleter
    FROM public.users
    WHERE auth_id = auth.uid()
    LIMIT 1;

    PERFORM log_activity(
        v_deleter.id,
        COALESCE(v_deleter.name, 'Sistem'),
        COALESCE(v_deleter.role, 'manager'),
        OLD.company_code,
        'delete',
        'pickup_request',
        OLD.id,
        'Obrisan zahtev: ' || COALESCE(OLD.waste_label, OLD.waste_type, 'Nepoznato'),
        jsonb_build_object(
            'waste_type', OLD.waste_type,
            'waste_label', OLD.waste_label,
            'fill_level', OLD.fill_level,
            'urgency', OLD.urgency,
            'client_id', OLD.client_id,
            'created_at', OLD.created_at
        )
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger already exists, just need to update the function
-- Running this will automatically apply to the existing trigger

