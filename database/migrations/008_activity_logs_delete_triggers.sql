-- =============================================================================
-- ACTIVITY LOGS - DELETE TRIGGERS
-- Dopunski trigeri za brisanje zahteva
-- Run this in Supabase SQL Editor AFTER 007_activity_logs.sql
-- =============================================================================

-- ----- PICKUP REQUESTS DELETE -----

CREATE OR REPLACE FUNCTION log_pickup_request_deleted()
RETURNS TRIGGER AS $$
DECLARE
    v_deleter RECORD;
BEGIN
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

DROP TRIGGER IF EXISTS trigger_log_pickup_request_deleted ON public.pickup_requests;
CREATE TRIGGER trigger_log_pickup_request_deleted
BEFORE DELETE ON public.pickup_requests
FOR EACH ROW
EXECUTE FUNCTION log_pickup_request_deleted();


-- ----- PROCESSED REQUESTS DELETE -----

CREATE OR REPLACE FUNCTION log_processed_request_deleted()
RETURNS TRIGGER AS $$
DECLARE
    v_deleter RECORD;
BEGIN
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
        'processed_request',
        OLD.id,
        'Obrisan obradjeni zahtev: ' || COALESCE(OLD.waste_label, OLD.waste_type, 'Nepoznato') || ' od ' || COALESCE(OLD.client_name, 'Nepoznat'),
        jsonb_build_object(
            'waste_type', OLD.waste_type,
            'waste_label', OLD.waste_label,
            'client_name', OLD.client_name,
            'weight', OLD.weight,
            'weight_unit', OLD.weight_unit,
            'processed_at', OLD.processed_at
        )
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_processed_request_deleted ON public.processed_requests;
CREATE TRIGGER trigger_log_processed_request_deleted
BEFORE DELETE ON public.processed_requests
FOR EACH ROW
EXECUTE FUNCTION log_processed_request_deleted();


-- ----- DRIVER ASSIGNMENTS DELETE/CANCEL -----

CREATE OR REPLACE FUNCTION log_driver_assignment_deleted()
RETURNS TRIGGER AS $$
DECLARE
    v_deleter RECORD;
    v_driver RECORD;
BEGIN
    -- Pokusaj da nadjes ko brise
    SELECT id, name, role INTO v_deleter
    FROM public.users
    WHERE auth_id = auth.uid()
    LIMIT 1;

    -- Koji vozac
    SELECT name INTO v_driver
    FROM public.users
    WHERE id = OLD.driver_id
    LIMIT 1;

    PERFORM log_activity(
        v_deleter.id,
        COALESCE(v_deleter.name, 'Sistem'),
        COALESCE(v_deleter.role, 'manager'),
        OLD.company_code,
        'delete',
        'driver_assignment',
        OLD.id,
        'Obrisana dodela vozacu: ' || COALESCE(v_driver.name, 'Nepoznat') || ' - ' || COALESCE(OLD.client_name, 'Nepoznat'),
        jsonb_build_object(
            'driver_id', OLD.driver_id,
            'driver_name', v_driver.name,
            'client_name', OLD.client_name,
            'waste_label', OLD.waste_label,
            'status', OLD.status
        )
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_driver_assignment_deleted ON public.driver_assignments;
CREATE TRIGGER trigger_log_driver_assignment_deleted
BEFORE DELETE ON public.driver_assignments
FOR EACH ROW
EXECUTE FUNCTION log_driver_assignment_deleted();


-- ----- USER DELETE (soft delete) -----

CREATE OR REPLACE FUNCTION log_user_deleted()
RETURNS TRIGGER AS $$
DECLARE
    v_deleter RECORD;
BEGIN
    -- Samo loguj ako se deleted_at postavlja (soft delete)
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        -- Pokusaj da nadjes ko brise
        SELECT id, name, role INTO v_deleter
        FROM public.users
        WHERE auth_id = auth.uid()
        LIMIT 1;

        PERFORM log_activity(
            v_deleter.id,
            COALESCE(v_deleter.name, 'Sistem'),
            COALESCE(v_deleter.role, 'admin'),
            OLD.company_code,
            'delete',
            'user',
            OLD.id,
            'Korisnik obrisan: ' || OLD.name || ' (' || OLD.role || ')',
            jsonb_build_object(
                'user_name', OLD.name,
                'user_email', OLD.email,
                'user_role', OLD.role
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_user_deleted ON public.users;
CREATE TRIGGER trigger_log_user_deleted
AFTER UPDATE ON public.users
FOR EACH ROW
WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
EXECUTE FUNCTION log_user_deleted();


-- =============================================================================
-- CLIENT TRIGGERS
-- Koristimo company_clients tabelu
-- =============================================================================

-- Kreiranje klijenta
CREATE OR REPLACE FUNCTION log_client_created()
RETURNS TRIGGER AS $$
DECLARE
    v_creator RECORD;
BEGIN
    SELECT id, name, role INTO v_creator
    FROM public.users
    WHERE auth_id = auth.uid()
    LIMIT 1;

    PERFORM log_activity(
        v_creator.id,
        COALESCE(v_creator.name, 'Sistem'),
        COALESCE(v_creator.role, 'manager'),
        NEW.company_code,
        'create',
        'client',
        NEW.id,
        'Kreiran novi klijent: ' || NEW.name,
        jsonb_build_object(
            'client_name', NEW.name,
            'address', NEW.address,
            'phone', NEW.phone
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_client_created ON public.company_clients;
CREATE TRIGGER trigger_log_client_created
AFTER INSERT ON public.company_clients
FOR EACH ROW
EXECUTE FUNCTION log_client_created();


-- Brisanje klijenta
CREATE OR REPLACE FUNCTION log_client_deleted()
RETURNS TRIGGER AS $$
DECLARE
    v_deleter RECORD;
BEGIN
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
        'client',
        OLD.id,
        'Obrisan klijent: ' || OLD.name,
        jsonb_build_object(
            'client_name', OLD.name,
            'address', OLD.address,
            'phone', OLD.phone
        )
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_client_deleted ON public.company_clients;
CREATE TRIGGER trigger_log_client_deleted
BEFORE DELETE ON public.company_clients
FOR EACH ROW
EXECUTE FUNCTION log_client_deleted();


-- =============================================================================
-- DONE! Delete triggers are ready.
-- These will log:
-- 1. Brisanje pickup zahteva
-- 2. Brisanje obradjenih zahteva
-- 3. Brisanje dodela vozacima
-- 4. Soft-delete korisnika
-- 5. Kreiranje i brisanje klijenata
-- =============================================================================
