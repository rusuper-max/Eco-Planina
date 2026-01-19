-- =============================================================================
-- INVENTORY TRIGGERS - Automatski ulaz/korekcija
-- =============================================================================
-- 1. INSERT trigger - dodaje u inventory kada se obradi zahtev
-- 2. UPDATE trigger - koriguje inventory kada se promeni težina
-- =============================================================================

-- =============================================================================
-- 1. INSERT TRIGGER - Automatski ulaz pri obradi zahteva
-- =============================================================================

CREATE OR REPLACE FUNCTION add_to_inventory_on_process()
RETURNS TRIGGER AS $$
DECLARE
    v_inventory_id UUID;
    v_region_name TEXT;
    v_quantity_kg NUMERIC;
    v_waste_type_uuid UUID;
BEGIN
    -- Samo za completed zahteve sa težinom
    IF NEW.status != 'completed' OR NEW.weight IS NULL OR NEW.weight <= 0 THEN
        RETURN NEW;
    END IF;

    -- Pronađi inventory preko region_id
    IF NEW.region_id IS NOT NULL THEN
        SELECT r.inventory_id, r.name INTO v_inventory_id, v_region_name
        FROM public.regions r
        WHERE r.id = NEW.region_id AND r.deleted_at IS NULL;
    END IF;

    -- Ako region nema inventory, preskoči
    IF v_inventory_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Konvertuj waste_type u UUID (može biti text ili UUID)
    BEGIN
        v_waste_type_uuid := NEW.waste_type::UUID;
    EXCEPTION WHEN OTHERS THEN
        -- Ako nije UUID, pokušaj da nađeš po name
        SELECT id INTO v_waste_type_uuid
        FROM public.waste_types
        WHERE name = NEW.waste_type OR id::TEXT = NEW.waste_type
        LIMIT 1;
    END;

    -- Ako nema validan waste_type, preskoči
    IF v_waste_type_uuid IS NULL THEN
        RETURN NEW;
    END IF;

    -- Konvertuj u kg
    v_quantity_kg := CASE
        WHEN NEW.weight_unit = 't' THEN NEW.weight * 1000
        ELSE NEW.weight
    END;

    -- Upsert inventory_items
    INSERT INTO public.inventory_items (inventory_id, waste_type_id, quantity_kg)
    VALUES (v_inventory_id, v_waste_type_uuid, v_quantity_kg)
    ON CONFLICT (inventory_id, waste_type_id)
    DO UPDATE SET
        quantity_kg = inventory_items.quantity_kg + EXCLUDED.quantity_kg,
        last_updated = NOW();

    -- Zapiši transakciju
    INSERT INTO public.inventory_transactions (
        inventory_id, waste_type_id, transaction_type, quantity_kg,
        source_type, source_id, region_id, region_name,
        created_by, created_by_name
    ) VALUES (
        v_inventory_id, v_waste_type_uuid, 'in', v_quantity_kg,
        'processed_request', NEW.id, NEW.region_id, v_region_name,
        NEW.processed_by_id, NEW.processed_by_name
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kreiraj trigger (drop ako postoji)
DROP TRIGGER IF EXISTS trigger_add_to_inventory ON public.processed_requests;
CREATE TRIGGER trigger_add_to_inventory
    AFTER INSERT ON public.processed_requests
    FOR EACH ROW
    EXECUTE FUNCTION add_to_inventory_on_process();

-- =============================================================================
-- 2. UPDATE TRIGGER - Korekcija pri promeni težine
-- =============================================================================

CREATE OR REPLACE FUNCTION update_inventory_on_weight_change()
RETURNS TRIGGER AS $$
DECLARE
    v_inventory_id UUID;
    v_old_qty_kg NUMERIC;
    v_new_qty_kg NUMERIC;
    v_diff_kg NUMERIC;
    v_old_waste_type_uuid UUID;
    v_new_waste_type_uuid UUID;
    v_region_name TEXT;
BEGIN
    -- Samo ako je completed status i promenila se težina ili waste_type
    IF NEW.status != 'completed' THEN
        RETURN NEW;
    END IF;

    -- Proveri da li je bilo promena
    IF (OLD.weight IS NOT DISTINCT FROM NEW.weight)
       AND (OLD.weight_unit IS NOT DISTINCT FROM NEW.weight_unit)
       AND (OLD.waste_type IS NOT DISTINCT FROM NEW.waste_type) THEN
        RETURN NEW;
    END IF;

    -- Pronađi inventory
    IF NEW.region_id IS NOT NULL THEN
        SELECT r.inventory_id, r.name INTO v_inventory_id, v_region_name
        FROM public.regions r
        WHERE r.id = NEW.region_id AND r.deleted_at IS NULL;
    END IF;

    IF v_inventory_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Konvertuj waste_type u UUID
    BEGIN
        v_old_waste_type_uuid := OLD.waste_type::UUID;
    EXCEPTION WHEN OTHERS THEN
        SELECT id INTO v_old_waste_type_uuid
        FROM public.waste_types
        WHERE name = OLD.waste_type OR id::TEXT = OLD.waste_type
        LIMIT 1;
    END;

    BEGIN
        v_new_waste_type_uuid := NEW.waste_type::UUID;
    EXCEPTION WHEN OTHERS THEN
        SELECT id INTO v_new_waste_type_uuid
        FROM public.waste_types
        WHERE name = NEW.waste_type OR id::TEXT = NEW.waste_type
        LIMIT 1;
    END;

    -- Izračunaj stare i nove kg
    v_old_qty_kg := CASE
        WHEN OLD.weight_unit = 't' THEN COALESCE(OLD.weight, 0) * 1000
        ELSE COALESCE(OLD.weight, 0)
    END;
    v_new_qty_kg := CASE
        WHEN NEW.weight_unit = 't' THEN COALESCE(NEW.weight, 0) * 1000
        ELSE COALESCE(NEW.weight, 0)
    END;

    -- Ako se promenio waste_type, oduzmi iz starog i dodaj u novi
    IF v_old_waste_type_uuid IS DISTINCT FROM v_new_waste_type_uuid THEN
        -- Oduzmi iz starog waste_type (ako postoji)
        IF v_old_waste_type_uuid IS NOT NULL AND v_old_qty_kg > 0 THEN
            UPDATE public.inventory_items
            SET quantity_kg = GREATEST(0, quantity_kg - v_old_qty_kg),
                last_updated = NOW()
            WHERE inventory_id = v_inventory_id
              AND waste_type_id = v_old_waste_type_uuid;

            -- Zapiši OUT transakciju
            INSERT INTO public.inventory_transactions (
                inventory_id, waste_type_id, transaction_type, quantity_kg,
                source_type, source_id, region_id, region_name, notes
            ) VALUES (
                v_inventory_id, v_old_waste_type_uuid, 'out', v_old_qty_kg,
                'adjustment', NEW.id, NEW.region_id, v_region_name,
                'Korekcija: promenjen tip otpada sa ' || COALESCE(OLD.waste_type, 'nepoznato')
            );
        END IF;

        -- Dodaj u novi waste_type
        IF v_new_waste_type_uuid IS NOT NULL AND v_new_qty_kg > 0 THEN
            INSERT INTO public.inventory_items (inventory_id, waste_type_id, quantity_kg)
            VALUES (v_inventory_id, v_new_waste_type_uuid, v_new_qty_kg)
            ON CONFLICT (inventory_id, waste_type_id)
            DO UPDATE SET
                quantity_kg = inventory_items.quantity_kg + EXCLUDED.quantity_kg,
                last_updated = NOW();

            -- Zapiši IN transakciju
            INSERT INTO public.inventory_transactions (
                inventory_id, waste_type_id, transaction_type, quantity_kg,
                source_type, source_id, region_id, region_name, notes
            ) VALUES (
                v_inventory_id, v_new_waste_type_uuid, 'in', v_new_qty_kg,
                'adjustment', NEW.id, NEW.region_id, v_region_name,
                'Korekcija: promenjen tip otpada na ' || COALESCE(NEW.waste_type, 'nepoznato')
            );
        END IF;
    ELSE
        -- Samo koriguj količinu (waste_type ostaje isti)
        v_diff_kg := v_new_qty_kg - v_old_qty_kg;

        IF v_diff_kg != 0 AND v_new_waste_type_uuid IS NOT NULL THEN
            -- Ažuriraj inventory_items
            IF v_diff_kg > 0 THEN
                -- Povećanje
                INSERT INTO public.inventory_items (inventory_id, waste_type_id, quantity_kg)
                VALUES (v_inventory_id, v_new_waste_type_uuid, v_diff_kg)
                ON CONFLICT (inventory_id, waste_type_id)
                DO UPDATE SET
                    quantity_kg = inventory_items.quantity_kg + EXCLUDED.quantity_kg,
                    last_updated = NOW();
            ELSE
                -- Smanjenje
                UPDATE public.inventory_items
                SET quantity_kg = GREATEST(0, quantity_kg + v_diff_kg), -- v_diff_kg je negativan
                    last_updated = NOW()
                WHERE inventory_id = v_inventory_id
                  AND waste_type_id = v_new_waste_type_uuid;
            END IF;

            -- Zapiši transakciju
            INSERT INTO public.inventory_transactions (
                inventory_id, waste_type_id, transaction_type, quantity_kg,
                source_type, source_id, region_id, region_name, notes
            ) VALUES (
                v_inventory_id, v_new_waste_type_uuid,
                CASE WHEN v_diff_kg > 0 THEN 'in' ELSE 'out' END,
                ABS(v_diff_kg),
                'adjustment', NEW.id, NEW.region_id, v_region_name,
                'Korekcija težine: ' || COALESCE(OLD.weight::TEXT, '0') || ' ' || COALESCE(OLD.weight_unit, 'kg')
                    || ' -> ' || COALESCE(NEW.weight::TEXT, '0') || ' ' || COALESCE(NEW.weight_unit, 'kg')
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kreiraj trigger (drop ako postoji)
DROP TRIGGER IF EXISTS trigger_update_inventory ON public.processed_requests;
CREATE TRIGGER trigger_update_inventory
    AFTER UPDATE ON public.processed_requests
    FOR EACH ROW
    WHEN (
        OLD.weight IS DISTINCT FROM NEW.weight
        OR OLD.weight_unit IS DISTINCT FROM NEW.weight_unit
        OR OLD.waste_type IS DISTINCT FROM NEW.waste_type
    )
    EXECUTE FUNCTION update_inventory_on_weight_change();

-- =============================================================================
-- MANUAL ADJUSTMENT FUNCTION
-- =============================================================================
-- Za ručne korekcije inventara (bez processed_request)

CREATE OR REPLACE FUNCTION create_inventory_adjustment(
    p_inventory_id UUID,
    p_waste_type_id UUID,
    p_quantity_kg NUMERIC,
    p_transaction_type VARCHAR(10), -- 'in' ili 'out'
    p_notes TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_created_by_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transaction_id UUID;
BEGIN
    -- Validacija
    IF p_transaction_type NOT IN ('in', 'out') THEN
        RAISE EXCEPTION 'Invalid transaction_type: must be "in" or "out"';
    END IF;

    IF p_quantity_kg <= 0 THEN
        RAISE EXCEPTION 'quantity_kg must be positive';
    END IF;

    -- Ažuriraj inventory_items
    IF p_transaction_type = 'in' THEN
        INSERT INTO public.inventory_items (inventory_id, waste_type_id, quantity_kg)
        VALUES (p_inventory_id, p_waste_type_id, p_quantity_kg)
        ON CONFLICT (inventory_id, waste_type_id)
        DO UPDATE SET
            quantity_kg = inventory_items.quantity_kg + EXCLUDED.quantity_kg,
            last_updated = NOW();
    ELSE
        UPDATE public.inventory_items
        SET quantity_kg = GREATEST(0, quantity_kg - p_quantity_kg),
            last_updated = NOW()
        WHERE inventory_id = p_inventory_id
          AND waste_type_id = p_waste_type_id;
    END IF;

    -- Zapiši transakciju
    INSERT INTO public.inventory_transactions (
        inventory_id, waste_type_id, transaction_type, quantity_kg,
        source_type, notes, created_by, created_by_name
    ) VALUES (
        p_inventory_id, p_waste_type_id, p_transaction_type, p_quantity_kg,
        'adjustment', COALESCE(p_notes, 'Ručna korekcija'),
        p_created_by, p_created_by_name
    )
    RETURNING id INTO v_transaction_id;

    RETURN v_transaction_id;
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION create_inventory_adjustment(UUID, UUID, NUMERIC, VARCHAR, TEXT, UUID, TEXT) TO authenticated;

-- =============================================================================
-- DONE
-- =============================================================================
-- Sledeći korak: 057_inventory_retroactive_import.sql za import starih podataka
-- =============================================================================
