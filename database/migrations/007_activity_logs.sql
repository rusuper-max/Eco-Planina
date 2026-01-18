-- =============================================================================
-- ACTIVITY LOGS - Audit trail sistem
-- Run this in Supabase SQL Editor
-- =============================================================================

-- 1. Kreirati activity_logs tabelu
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Ko je izvrsio akciju
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_name TEXT,                    -- Denormalizovano ime (ostaje ako se user obrise)
    user_role TEXT,                    -- Uloga u trenutku akcije

    -- Koja firma
    company_code VARCHAR(20),

    -- Sta je uradjeno
    action TEXT NOT NULL,              -- 'create', 'update', 'delete', 'assign', 'process', etc.
    entity_type TEXT NOT NULL,         -- 'pickup_request', 'user', 'driver_assignment', etc.
    entity_id UUID,                    -- ID entiteta na koji se odnosi

    -- Detalji akcije
    description TEXT,                  -- Human-readable opis
    metadata JSONB DEFAULT '{}',       -- Dodatni podaci (stare/nove vrednosti, itd.)

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indeksi za brze pretrage
CREATE INDEX IF NOT EXISTS idx_activity_logs_company_code
ON public.activity_logs(company_code);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id
ON public.activity_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type
ON public.activity_logs(entity_type);

CREATE INDEX IF NOT EXISTS idx_activity_logs_action
ON public.activity_logs(action);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
ON public.activity_logs(created_at DESC);

-- Composite index za najcesce pretrage
CREATE INDEX IF NOT EXISTS idx_activity_logs_company_created
ON public.activity_logs(company_code, created_at DESC);

-- 3. Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Politike
-- Drop existing policies
DROP POLICY IF EXISTS "Developers see all logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Admins see company logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Managers see company logs" ON public.activity_logs;
DROP POLICY IF EXISTS "System can insert logs" ON public.activity_logs;

-- Developers vide sve
CREATE POLICY "Developers see all logs"
ON public.activity_logs FOR SELECT
TO authenticated
USING (
    (SELECT role FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1) = 'developer'
);

-- Admin i Manager vide logove svoje firme
CREATE POLICY "Admins and Managers see company logs"
ON public.activity_logs FOR SELECT
TO authenticated
USING (
    company_code = (SELECT company_code FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1)
    AND (SELECT role FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1) IN ('admin', 'manager')
);

-- Svi autentifikovani korisnici mogu insertovati (trigeri ce to raditi)
CREATE POLICY "Authenticated users can insert logs"
ON public.activity_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Service role moze sve (za trigere koji koriste SECURITY DEFINER)
-- Ovo je implicitno jer service role bypass-uje RLS

-- =============================================================================
-- HELPER FUNKCIJA za logovanje
-- =============================================================================

CREATE OR REPLACE FUNCTION log_activity(
    p_user_id UUID,
    p_user_name TEXT,
    p_user_role TEXT,
    p_company_code TEXT,
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_description TEXT,
    p_metadata JSONB DEFAULT '{}'
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
        action, entity_type, entity_id, description, metadata
    )
    VALUES (
        p_user_id, p_user_name, p_user_role, p_company_code,
        p_action, p_entity_type, p_entity_id, p_description, p_metadata
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION log_activity(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, JSONB) TO authenticated;

-- =============================================================================
-- TRIGERI ZA AUTOMATSKO LOGOVANJE
-- =============================================================================

-- ----- PICKUP REQUESTS -----

-- Trigger za nove zahteve
CREATE OR REPLACE FUNCTION log_pickup_request_created()
RETURNS TRIGGER AS $$
DECLARE
    v_user RECORD;
BEGIN
    -- Dobij info o korisniku koji je kreirao zahtev
    SELECT id, name, role, company_code INTO v_user
    FROM public.users
    WHERE id = NEW.user_id
    LIMIT 1;

    PERFORM log_activity(
        v_user.id,
        v_user.name,
        v_user.role,
        NEW.company_code,
        'create',
        'pickup_request',
        NEW.id,
        'Kreiran novi zahtev za preuzimanje: ' || COALESCE(NEW.waste_label, NEW.waste_type),
        jsonb_build_object(
            'waste_type', NEW.waste_type,
            'waste_label', NEW.waste_label,
            'fill_level', NEW.fill_level,
            'urgency', NEW.urgency
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_pickup_request_created ON public.pickup_requests;
CREATE TRIGGER trigger_log_pickup_request_created
AFTER INSERT ON public.pickup_requests
FOR EACH ROW
EXECUTE FUNCTION log_pickup_request_created();

-- ----- PROCESSED REQUESTS -----

-- Trigger za obradjene zahteve
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
        NEW.original_request_id,
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

DROP TRIGGER IF EXISTS trigger_log_request_processed ON public.processed_requests;
CREATE TRIGGER trigger_log_request_processed
AFTER INSERT ON public.processed_requests
FOR EACH ROW
EXECUTE FUNCTION log_request_processed();

-- ----- DRIVER ASSIGNMENTS -----

-- Trigger za dodeljivanje vozacu
CREATE OR REPLACE FUNCTION log_driver_assigned()
RETURNS TRIGGER AS $$
DECLARE
    v_assigner RECORD;
    v_driver RECORD;
BEGIN
    -- Ko je dodelio
    IF NEW.assigned_by IS NOT NULL THEN
        SELECT id, name, role INTO v_assigner
        FROM public.users
        WHERE id = NEW.assigned_by
        LIMIT 1;
    END IF;

    -- Koji vozac
    SELECT id, name INTO v_driver
    FROM public.users
    WHERE id = NEW.driver_id
    LIMIT 1;

    -- Samo loguj ako je novi zapis ili promena vozaca
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.driver_id != NEW.driver_id) THEN
        PERFORM log_activity(
            v_assigner.id,
            COALESCE(v_assigner.name, 'Sistem'),
            COALESCE(v_assigner.role, 'manager'),
            NEW.company_code,
            'assign',
            'driver_assignment',
            NEW.id,
            'Zahtev dodeljen vozacu: ' || COALESCE(v_driver.name, 'Nepoznat'),
            jsonb_build_object(
                'driver_id', NEW.driver_id,
                'driver_name', v_driver.name,
                'request_id', NEW.request_id,
                'client_name', NEW.client_name
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_driver_assigned ON public.driver_assignments;
CREATE TRIGGER trigger_log_driver_assigned
AFTER INSERT OR UPDATE ON public.driver_assignments
FOR EACH ROW
EXECUTE FUNCTION log_driver_assigned();

-- Trigger za promenu statusa (picked_up, delivered)
CREATE OR REPLACE FUNCTION log_driver_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_driver RECORD;
    v_action_desc TEXT;
BEGIN
    -- Samo ako se status promenio
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Dobij vozaca
    SELECT id, name INTO v_driver
    FROM public.users
    WHERE id = NEW.driver_id
    LIMIT 1;

    -- Odredi opis akcije
    CASE NEW.status
        WHEN 'picked_up' THEN v_action_desc := 'Vozac preuzeo robu od klijenta';
        WHEN 'delivered' THEN v_action_desc := 'Vozac dostavio/ispraznio robu';
        WHEN 'completed' THEN v_action_desc := 'Dostava zavrsena';
        WHEN 'cancelled' THEN v_action_desc := 'Zadatak otkazan';
        ELSE v_action_desc := 'Status promenjen u: ' || NEW.status;
    END CASE;

    PERFORM log_activity(
        v_driver.id,
        v_driver.name,
        'driver',
        NEW.company_code,
        NEW.status,
        'driver_assignment',
        NEW.id,
        v_action_desc || ': ' || COALESCE(NEW.client_name, 'Nepoznat'),
        jsonb_build_object(
            'old_status', OLD.status,
            'new_status', NEW.status,
            'client_name', NEW.client_name,
            'waste_type', NEW.waste_label
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_driver_status_change ON public.driver_assignments;
CREATE TRIGGER trigger_log_driver_status_change
AFTER UPDATE ON public.driver_assignments
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION log_driver_status_change();

-- ----- USERS -----

-- Trigger za nove korisnike
CREATE OR REPLACE FUNCTION log_user_created()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM log_activity(
        NEW.id,
        NEW.name,
        NEW.role,
        NEW.company_code,
        'register',
        'user',
        NEW.id,
        'Novi korisnik registrovan: ' || NEW.name || ' (' || NEW.role || ')',
        jsonb_build_object(
            'role', NEW.role,
            'email', NEW.email
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_user_created ON public.users;
CREATE TRIGGER trigger_log_user_created
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION log_user_created();

-- Trigger za promenu uloge
CREATE OR REPLACE FUNCTION log_user_role_changed()
RETURNS TRIGGER AS $$
DECLARE
    v_changer RECORD;
BEGIN
    -- Samo ako se uloga promenila
    IF OLD.role = NEW.role THEN
        RETURN NEW;
    END IF;

    -- Pokusaj da nadjes ko je promenio (current user)
    SELECT id, name, role INTO v_changer
    FROM public.users
    WHERE auth_id = auth.uid()
    LIMIT 1;

    PERFORM log_activity(
        COALESCE(v_changer.id, NEW.id),
        COALESCE(v_changer.name, 'Sistem'),
        COALESCE(v_changer.role, 'admin'),
        NEW.company_code,
        'role_change',
        'user',
        NEW.id,
        'Promenjena uloga: ' || NEW.name || ' (' || OLD.role || ' -> ' || NEW.role || ')',
        jsonb_build_object(
            'old_role', OLD.role,
            'new_role', NEW.role,
            'user_name', NEW.name
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_user_role_changed ON public.users;
CREATE TRIGGER trigger_log_user_role_changed
AFTER UPDATE ON public.users
FOR EACH ROW
WHEN (OLD.role IS DISTINCT FROM NEW.role)
EXECUTE FUNCTION log_user_role_changed();

-- =============================================================================
-- DONE! Activity logs sistem je spreman.
-- Trigeri ce automatski logovati:
-- 1. Kreiranje novih zahteva
-- 2. Obradu zahteva
-- 3. Dodeljivanje vozacima
-- 4. Promene statusa dostave (picked_up, delivered)
-- 5. Registraciju novih korisnika
-- 6. Promene uloga korisnika
-- =============================================================================
