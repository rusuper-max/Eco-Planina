-- =============================================================================
-- Fix activity log: distinguish processed vs deleted pickup_requests
-- When a pickup_request is deleted because it was processed, log action = 'process'
-- instead of 'delete' so UI shows it as "Obrađen".
-- =============================================================================

CREATE OR REPLACE FUNCTION log_pickup_request_deleted()
RETURNS TRIGGER AS $$
DECLARE
    v_deleter RECORD;
    v_has_processed BOOLEAN;
BEGIN
    -- Try to find who is deleting (current auth user)
    SELECT id, name, role INTO v_deleter
    FROM public.users
    WHERE auth_id = auth.uid()
    LIMIT 1;

    -- Check if this request already exists in processed_requests (processed flow)
    SELECT EXISTS (
        SELECT 1 FROM public.processed_requests pr
        WHERE pr.request_id = OLD.id
        AND pr.company_code = OLD.company_code
        AND pr.deleted_at IS NULL
    ) INTO v_has_processed;

    PERFORM log_activity(
        v_deleter.id,
        COALESCE(v_deleter.name, 'Sistem'),
        COALESCE(v_deleter.role, 'manager'),
        OLD.company_code,
        CASE WHEN v_has_processed THEN 'process' ELSE 'delete' END,
        'pickup_request',
        OLD.id,
        CASE WHEN v_has_processed
             THEN 'Obrađen zahtev: ' || COALESCE(OLD.waste_label, OLD.waste_type, 'Nepoznato')
             ELSE 'Obrisan zahtev: ' || COALESCE(OLD.waste_label, OLD.waste_type, 'Nepoznato')
        END,
        jsonb_build_object(
            'waste_type', OLD.waste_type,
            'waste_label', OLD.waste_label,
            'fill_level', OLD.fill_level,
            'urgency', OLD.urgency,
            'client_id', OLD.client_id,
            'created_at', OLD.created_at,
            'processed_logged', v_has_processed
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
-- 1) Obrada zahteva -> processed_requests insert, pickup_requests delete:
--    očekivan log action = 'process', tekst "Obrađen zahtev: ..."
-- 2) Ručno brisanje pending zahteva:
--    očekivan log action = 'delete', tekst "Obrisan zahtev: ..."
-- =============================================================================
