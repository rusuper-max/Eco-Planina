-- =============================================================================
-- Fix activity log: distinguish processed vs rejected pickup_requests
-- When a pickup_request is deleted because it was rejected, log action = 'rejected'
-- instead of 'process' so UI shows it as "Odbijen".
-- =============================================================================

CREATE OR REPLACE FUNCTION log_pickup_request_deleted()
RETURNS TRIGGER AS $$
DECLARE
    v_deleter RECORD;
    v_processed_record RECORD;
    v_action TEXT;
    v_description TEXT;
BEGIN
    -- Try to find who is deleting (current auth user)
    SELECT id, name, role INTO v_deleter
    FROM public.users
    WHERE auth_id = auth.uid()
    LIMIT 1;

    -- Check if this request exists in processed_requests and get its status
    SELECT id, status INTO v_processed_record
    FROM public.processed_requests pr
    WHERE pr.request_id = OLD.id
    AND pr.company_code = OLD.company_code
    AND pr.deleted_at IS NULL
    LIMIT 1;

    -- Determine action and description based on processed_request status
    IF v_processed_record.id IS NOT NULL THEN
        IF v_processed_record.status = 'rejected' THEN
            v_action := 'rejected';
            v_description := 'Odbijen zahtev: ' || COALESCE(OLD.waste_label, OLD.waste_type, 'Nepoznato');
        ELSE
            v_action := 'process';
            v_description := 'Obradjen zahtev: ' || COALESCE(OLD.waste_label, OLD.waste_type, 'Nepoznato');
        END IF;
    ELSE
        v_action := 'delete';
        v_description := 'Obrisan zahtev: ' || COALESCE(OLD.waste_label, OLD.waste_type, 'Nepoznato');
    END IF;

    PERFORM log_activity(
        v_deleter.id,
        COALESCE(v_deleter.name, 'Sistem'),
        COALESCE(v_deleter.role, 'manager'),
        OLD.company_code,
        v_action,
        'pickup_request',
        OLD.id,
        v_description,
        jsonb_build_object(
            'waste_type', OLD.waste_type,
            'waste_label', OLD.waste_label,
            'fill_level', OLD.fill_level,
            'urgency', OLD.urgency,
            'client_id', OLD.client_id,
            'created_at', OLD.created_at,
            'action_logged', v_action
        )
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_log_pickup_request_deleted ON public.pickup_requests;
CREATE TRIGGER trigger_log_pickup_request_deleted
BEFORE DELETE ON public.pickup_requests
FOR EACH ROW
EXECUTE FUNCTION log_pickup_request_deleted();

-- =============================================================================
-- Verification:
-- 1) Obrada zahteva -> processed_requests insert (status='processed'/'completed'),
--    pickup_requests delete: log action = 'process', tekst "Obradjen zahtev: ..."
-- 2) Odbijanje zahteva -> processed_requests insert (status='rejected'),
--    pickup_requests delete: log action = 'rejected', tekst "Odbijen zahtev: ..."
-- 3) Rucno brisanje pending zahteva (bez processed_request):
--    log action = 'delete', tekst "Obrisan zahtev: ..."
-- =============================================================================
