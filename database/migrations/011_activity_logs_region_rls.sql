-- =============================================================================
-- ACTIVITY LOGS - Dodaj region_id i ažuriraj RLS
-- Manager vidi samo svoju filijalu, Company Admin vidi celu firmu
-- Run this in Supabase SQL Editor
-- =============================================================================

-- 1. Dodaj region_id kolonu u activity_logs (ako ne postoji)
ALTER TABLE public.activity_logs
ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL;

-- 2. Kreiraj index za brže pretrage po region_id
CREATE INDEX IF NOT EXISTS idx_activity_logs_region_id
ON public.activity_logs(region_id);

-- 3. Drop postojeće politike
DROP POLICY IF EXISTS "Developers see all logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Admins and Managers see company logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Company admins see all company logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Managers see branch logs" ON public.activity_logs;

-- 4. Developers vide SVE logove (svih firmi)
CREATE POLICY "Developers see all logs"
ON public.activity_logs FOR SELECT
TO authenticated
USING (
    (SELECT role FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1) = 'developer'
);

-- 5. Company Admin i Admin vide SVE logove svoje FIRME
CREATE POLICY "Company admins see all company logs"
ON public.activity_logs FOR SELECT
TO authenticated
USING (
    company_code = (SELECT company_code FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1)
    AND (SELECT role FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1) IN ('admin', 'company_admin')
);

-- 6. Manager vidi samo logove svoje FILIJALE
CREATE POLICY "Managers see branch logs"
ON public.activity_logs FOR SELECT
TO authenticated
USING (
    (SELECT role FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1) = 'manager'
    AND company_code = (SELECT company_code FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1)
    AND (
        -- Vidi logove svoje filijale
        region_id = (SELECT region_id FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1)
        -- Ili logove bez filijale (stari logovi pre dodavanja region_id)
        OR region_id IS NULL
    )
);

-- =============================================================================
-- AŽURIRAJ log_activity FUNKCIJU da prima region_id
-- =============================================================================

-- Prvo dropuj staru funkciju (sa manje parametara)
DROP FUNCTION IF EXISTS log_activity(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, JSONB);

-- Kreiraj novu sa region_id parametrom
CREATE OR REPLACE FUNCTION log_activity(
    p_user_id UUID,
    p_user_name TEXT,
    p_user_role TEXT,
    p_company_code TEXT,
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_description TEXT,
    p_metadata JSONB DEFAULT '{}',
    p_region_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.activity_logs (
        user_id, user_name, user_role, company_code,
        action, entity_type, entity_id, description, metadata, region_id
    )
    VALUES (
        p_user_id, p_user_name, p_user_role, p_company_code,
        p_action, p_entity_type, p_entity_id, p_description, p_metadata, p_region_id
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION log_activity(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, JSONB, UUID) TO authenticated;

-- =============================================================================
-- AŽURIRAJ PICKUP REQUEST TRIGGER da čuva region_id
-- =============================================================================

CREATE OR REPLACE FUNCTION log_pickup_request_created()
RETURNS TRIGGER AS $$
DECLARE
    v_creator RECORD;
    v_client RECORD;
    v_description TEXT;
    v_actual_creator_id UUID;
    v_region_id UUID;
BEGIN
    -- Ko je STVARNO ulogovan i kreira zahtev
    v_actual_creator_id := auth.uid();

    -- Dobij info o ulogovanom korisniku (kreator)
    SELECT id, name, role, company_code, region_id INTO v_creator
    FROM public.users
    WHERE auth_id = v_actual_creator_id
    LIMIT 1;

    -- Dobij info o klijentu (user_id u zahtevu)
    SELECT id, name, role, region_id INTO v_client
    FROM public.users
    WHERE id = NEW.user_id
    LIMIT 1;

    -- Ako kreator nije pronadjen, koristi klijenta kao kreatora
    IF v_creator.id IS NULL THEN
        v_creator := v_client;
    END IF;

    -- Odredi region_id (koristi klijentov region jer je zahtev vezan za klijenta)
    v_region_id := COALESCE(v_client.region_id, v_creator.region_id);

    -- Kreiraj opis u zavisnosti od situacije
    IF v_creator.id = v_client.id OR v_creator.id IS NULL THEN
        -- Klijent sam kreira za sebe
        v_description := COALESCE(v_client.name, 'Korisnik') ||
                        ' je kreirao zahtev za ' || COALESCE(NEW.waste_label, NEW.waste_type, 'otpad') ||
                        ' sa ' || COALESCE(NEW.fill_level::TEXT, '0') || '% popunjenosti';
    ELSE
        -- Manager/Admin kreira za klijenta
        v_description := COALESCE(v_creator.name, 'Menadžer') || ' (' || COALESCE(v_creator.role, 'manager') || ')' ||
                        ' je kreirao zahtev za ' || COALESCE(NEW.waste_label, NEW.waste_type, 'otpad') ||
                        ' sa ' || COALESCE(NEW.fill_level::TEXT, '0') || '% popunjenosti' ||
                        ' u ime klijenta ' || COALESCE(v_client.name, 'Nepoznat');
    END IF;

    -- Dodaj hitnost ako nije normalna
    IF NEW.urgency IS NOT NULL AND NEW.urgency != 'normal' THEN
        v_description := v_description || ' (hitnost: ' || NEW.urgency || ')';
    END IF;

    PERFORM log_activity(
        COALESCE(v_creator.id, v_client.id),
        COALESCE(v_creator.name, v_client.name, 'Korisnik'),
        COALESCE(v_creator.role, v_client.role, 'client'),
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
            'client_id', v_client.id,
            'client_name', v_client.name,
            'creator_id', v_creator.id,
            'creator_name', v_creator.name,
            'creator_role', v_creator.role,
            'created_for_client', v_creator.id IS DISTINCT FROM v_client.id
        ),
        v_region_id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ponovo kreiraj trigger
DROP TRIGGER IF EXISTS trigger_log_pickup_request_created ON public.pickup_requests;
CREATE TRIGGER trigger_log_pickup_request_created
AFTER INSERT ON public.pickup_requests
FOR EACH ROW
EXECUTE FUNCTION log_pickup_request_created();

-- =============================================================================
-- DONE!
-- - Manager vidi samo logove svoje filijale
-- - Company Admin vidi sve logove firme
-- - Developer vidi sve
-- - Novi logovi čuvaju region_id
-- =============================================================================
