-- =============================================================================
-- IMPROVED ACTIVITY LOG FOR PICKUP REQUESTS
-- Bolji opis ko je kreirao zahtev i za kog klijenta
-- Run this in Supabase SQL Editor AFTER 007_activity_logs.sql
-- =============================================================================

-- Unapredi trigger za kreiranje zahteva
CREATE OR REPLACE FUNCTION log_pickup_request_created()
RETURNS TRIGGER AS $$
DECLARE
    v_creator RECORD;
    v_client RECORD;
    v_description TEXT;
BEGIN
    -- Dobij info o korisniku koji je kreirao zahtev (user_id)
    SELECT id, name, role, company_code INTO v_creator
    FROM public.users
    WHERE id = NEW.user_id
    LIMIT 1;

    -- Dobij info o klijentu (client_id) - ako je razlicit od kreatora
    IF NEW.client_id IS NOT NULL AND NEW.client_id != NEW.user_id THEN
        SELECT id, name INTO v_client
        FROM public.users
        WHERE id = NEW.client_id
        LIMIT 1;
    ELSE
        -- Kreator je sam klijent
        v_client := v_creator;
    END IF;

    -- Kreiraj opis u zavisnosti od uloge kreatora
    IF v_creator.role = 'client' THEN
        -- Klijent je sam kreirao zahtev
        v_description := 'Klijent ' || COALESCE(v_creator.name, 'Nepoznat') ||
                        ' je kreirao zahtev za ' || COALESCE(NEW.waste_label, NEW.waste_type, 'otpad') ||
                        ' sa ' || COALESCE(NEW.fill_level::TEXT, '0') || '% popunjenosti';
    ELSIF v_creator.role IN ('manager', 'admin') THEN
        -- Manager/Admin je kreirao zahtev za klijenta
        v_description := COALESCE(v_creator.name, 'Menadzer') || ' (' || v_creator.role || ')' ||
                        ' je kreirao zahtev za ' || COALESCE(NEW.waste_label, NEW.waste_type, 'otpad') ||
                        ' sa ' || COALESCE(NEW.fill_level::TEXT, '0') || '% popunjenosti' ||
                        ' u ime klijenta ' || COALESCE(v_client.name, 'Nepoznat');
    ELSE
        -- Ostale uloge
        v_description := COALESCE(v_creator.name, 'Korisnik') ||
                        ' je kreirao zahtev za ' || COALESCE(NEW.waste_label, NEW.waste_type, 'otpad') ||
                        ' sa ' || COALESCE(NEW.fill_level::TEXT, '0') || '% popunjenosti';
    END IF;

    -- Dodaj hitnost ako postoji
    IF NEW.urgency IS NOT NULL AND NEW.urgency != 'normal' THEN
        v_description := v_description || ' (hitnost: ' || NEW.urgency || ')';
    END IF;

    PERFORM log_activity(
        v_creator.id,
        COALESCE(v_creator.name, 'Nepoznat'),
        COALESCE(v_creator.role, 'client'),
        NEW.company_code,
        'create',
        'pickup_request',
        NEW.id,
        v_description,
        jsonb_build_object(
            'waste_type', NEW.waste_type,
            'waste_label', NEW.waste_label,
            'fill_level', NEW.fill_level,
            'urgency', NEW.urgency,
            'client_id', NEW.client_id,
            'client_name', COALESCE(v_client.name, 'Nepoznat'),
            'creator_id', v_creator.id,
            'creator_name', v_creator.name,
            'creator_role', v_creator.role
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (mora se dropovati i ponovo kreirati da se koristi nova funkcija)
DROP TRIGGER IF EXISTS trigger_log_pickup_request_created ON public.pickup_requests;
CREATE TRIGGER trigger_log_pickup_request_created
AFTER INSERT ON public.pickup_requests
FOR EACH ROW
EXECUTE FUNCTION log_pickup_request_created();

-- =============================================================================
-- DONE! Sada ce activity log za kreiranje zahteva prikazivati:
-- - "Klijent Marko je kreirao zahtev za Plastiku sa 75% popunjenosti"
-- - "Petar (manager) je kreirao zahtev za Karton sa 50% popunjenosti u ime klijenta Marko"
-- =============================================================================
