-- =============================================================================
-- FIX INVENTORY TRIGGER - Better waste_type matching
-- =============================================================================
-- Problem: waste_type in processed_requests may be stored as:
-- - UUID (ideal)
-- - name (e.g., "cardboard", "plastic", "Karton", "Staklo")
-- NOTE: waste_types table only has 'name' column, not 'label'
-- =============================================================================

CREATE OR REPLACE FUNCTION add_to_inventory_on_process()
RETURNS TRIGGER AS $$
DECLARE
    v_inventory_id UUID;
    v_region_name TEXT;
    v_quantity_kg NUMERIC;
    v_waste_type_uuid UUID;
BEGIN
    -- Only for completed requests with weight
    IF NEW.status != 'completed' OR NEW.weight IS NULL OR NEW.weight <= 0 THEN
        RAISE NOTICE 'Skipping: status=%, weight=%', NEW.status, NEW.weight;
        RETURN NEW;
    END IF;

    -- Find inventory via region_id
    IF NEW.region_id IS NOT NULL THEN
        SELECT r.inventory_id, r.name INTO v_inventory_id, v_region_name
        FROM public.regions r
        WHERE r.id = NEW.region_id AND r.deleted_at IS NULL;
    END IF;

    -- If region has no inventory, skip (but log warning)
    IF v_inventory_id IS NULL THEN
        RAISE WARNING 'Region % has no inventory_id assigned. Skipping inventory update for processed_request %',
            NEW.region_id, NEW.id;
        RETURN NEW;
    END IF;

    -- Convert waste_type to UUID (can be UUID or name)
    BEGIN
        v_waste_type_uuid := NEW.waste_type::UUID;
    EXCEPTION WHEN OTHERS THEN
        -- If not UUID, try to find by name or id::text (case-insensitive)
        SELECT id INTO v_waste_type_uuid
        FROM public.waste_types
        WHERE id::TEXT = NEW.waste_type
           OR name = NEW.waste_type
           OR LOWER(name) = LOWER(NEW.waste_type)
        LIMIT 1;
    END;

    -- If no valid waste_type found, log and skip
    IF v_waste_type_uuid IS NULL THEN
        RAISE WARNING 'Could not find waste_type for value: %. Skipping inventory update for processed_request %',
            NEW.waste_type, NEW.id;
        RETURN NEW;
    END IF;

    -- Convert to kg
    v_quantity_kg := CASE
        WHEN NEW.weight_unit = 't' THEN NEW.weight * 1000
        ELSE NEW.weight
    END;

    -- Log what we're about to insert
    RAISE NOTICE 'Adding to inventory: inventory_id=%, waste_type_id=%, quantity_kg=%',
        v_inventory_id, v_waste_type_uuid, v_quantity_kg;

    -- Upsert inventory_items
    INSERT INTO public.inventory_items (inventory_id, waste_type_id, quantity_kg)
    VALUES (v_inventory_id, v_waste_type_uuid, v_quantity_kg)
    ON CONFLICT (inventory_id, waste_type_id)
    DO UPDATE SET
        quantity_kg = inventory_items.quantity_kg + EXCLUDED.quantity_kg,
        last_updated = NOW();

    -- Record transaction
    INSERT INTO public.inventory_transactions (
        inventory_id, waste_type_id, transaction_type, quantity_kg,
        source_type, source_id, region_id, region_name,
        created_by, created_by_name
    ) VALUES (
        v_inventory_id, v_waste_type_uuid, 'in', v_quantity_kg,
        'processed_request', NEW.id, NEW.region_id, v_region_name,
        NEW.processed_by_id, NEW.processed_by_name
    );

    RAISE NOTICE 'Successfully added % kg to inventory % for waste_type %',
        v_quantity_kg, v_inventory_id, v_waste_type_uuid;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update the UPDATE trigger for consistency
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
    -- Only if completed status and weight/waste_type changed
    IF NEW.status != 'completed' THEN
        RETURN NEW;
    END IF;

    -- Check if there were changes
    IF (OLD.weight IS NOT DISTINCT FROM NEW.weight)
       AND (OLD.weight_unit IS NOT DISTINCT FROM NEW.weight_unit)
       AND (OLD.waste_type IS NOT DISTINCT FROM NEW.waste_type) THEN
        RETURN NEW;
    END IF;

    -- Find inventory
    IF NEW.region_id IS NOT NULL THEN
        SELECT r.inventory_id, r.name INTO v_inventory_id, v_region_name
        FROM public.regions r
        WHERE r.id = NEW.region_id AND r.deleted_at IS NULL;
    END IF;

    IF v_inventory_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Convert OLD waste_type to UUID
    BEGIN
        v_old_waste_type_uuid := OLD.waste_type::UUID;
    EXCEPTION WHEN OTHERS THEN
        SELECT id INTO v_old_waste_type_uuid
        FROM public.waste_types
        WHERE id::TEXT = OLD.waste_type
           OR name = OLD.waste_type
           OR LOWER(name) = LOWER(OLD.waste_type)
        LIMIT 1;
    END;

    -- Convert NEW waste_type to UUID
    BEGIN
        v_new_waste_type_uuid := NEW.waste_type::UUID;
    EXCEPTION WHEN OTHERS THEN
        SELECT id INTO v_new_waste_type_uuid
        FROM public.waste_types
        WHERE id::TEXT = NEW.waste_type
           OR name = NEW.waste_type
           OR LOWER(name) = LOWER(NEW.waste_type)
        LIMIT 1;
    END;

    -- Calculate old and new kg
    v_old_qty_kg := CASE
        WHEN OLD.weight_unit = 't' THEN COALESCE(OLD.weight, 0) * 1000
        ELSE COALESCE(OLD.weight, 0)
    END;
    v_new_qty_kg := CASE
        WHEN NEW.weight_unit = 't' THEN COALESCE(NEW.weight, 0) * 1000
        ELSE COALESCE(NEW.weight, 0)
    END;

    -- If waste_type changed, remove from old and add to new
    IF v_old_waste_type_uuid IS DISTINCT FROM v_new_waste_type_uuid THEN
        -- Remove from old waste_type (if exists)
        IF v_old_waste_type_uuid IS NOT NULL AND v_old_qty_kg > 0 THEN
            UPDATE public.inventory_items
            SET quantity_kg = GREATEST(0, quantity_kg - v_old_qty_kg),
                last_updated = NOW()
            WHERE inventory_id = v_inventory_id
              AND waste_type_id = v_old_waste_type_uuid;

            -- Record OUT transaction
            INSERT INTO public.inventory_transactions (
                inventory_id, waste_type_id, transaction_type, quantity_kg,
                source_type, source_id, region_id, region_name, notes
            ) VALUES (
                v_inventory_id, v_old_waste_type_uuid, 'out', v_old_qty_kg,
                'adjustment', NEW.id, NEW.region_id, v_region_name,
                'Korekcija: promenjen tip otpada sa ' || COALESCE(OLD.waste_type, 'nepoznato')
            );
        END IF;

        -- Add to new waste_type
        IF v_new_waste_type_uuid IS NOT NULL AND v_new_qty_kg > 0 THEN
            INSERT INTO public.inventory_items (inventory_id, waste_type_id, quantity_kg)
            VALUES (v_inventory_id, v_new_waste_type_uuid, v_new_qty_kg)
            ON CONFLICT (inventory_id, waste_type_id)
            DO UPDATE SET
                quantity_kg = inventory_items.quantity_kg + EXCLUDED.quantity_kg,
                last_updated = NOW();

            -- Record IN transaction
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
        -- Only quantity changed (waste_type stays the same)
        v_diff_kg := v_new_qty_kg - v_old_qty_kg;

        IF v_diff_kg != 0 AND v_new_waste_type_uuid IS NOT NULL THEN
            -- Update inventory_items
            IF v_diff_kg > 0 THEN
                -- Increase
                INSERT INTO public.inventory_items (inventory_id, waste_type_id, quantity_kg)
                VALUES (v_inventory_id, v_new_waste_type_uuid, v_diff_kg)
                ON CONFLICT (inventory_id, waste_type_id)
                DO UPDATE SET
                    quantity_kg = inventory_items.quantity_kg + EXCLUDED.quantity_kg,
                    last_updated = NOW();
            ELSE
                -- Decrease
                UPDATE public.inventory_items
                SET quantity_kg = GREATEST(0, quantity_kg + v_diff_kg), -- v_diff_kg is negative
                    last_updated = NOW()
                WHERE inventory_id = v_inventory_id
                  AND waste_type_id = v_new_waste_type_uuid;
            END IF;

            -- Record transaction
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

-- =============================================================================
-- RETROACTIVE FIX: Process existing records that were missed
-- =============================================================================
-- This will add to inventory all processed_requests that have weight but no
-- corresponding inventory_transaction

DO $$
DECLARE
    r RECORD;
    v_inventory_id UUID;
    v_waste_type_uuid UUID;
    v_quantity_kg NUMERIC;
    v_region_name TEXT;
    v_count INT := 0;
BEGIN
    FOR r IN
        SELECT pr.*
        FROM processed_requests pr
        WHERE pr.status = 'completed'
          AND pr.weight IS NOT NULL
          AND pr.weight > 0
          AND pr.region_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM inventory_transactions it
              WHERE it.source_id = pr.id
                AND it.source_type = 'processed_request'
          )
        ORDER BY pr.processed_at
    LOOP
        -- Get inventory_id from region
        SELECT reg.inventory_id, reg.name INTO v_inventory_id, v_region_name
        FROM regions reg
        WHERE reg.id = r.region_id AND reg.deleted_at IS NULL;

        IF v_inventory_id IS NULL THEN
            RAISE NOTICE 'Skipping request % - region % has no inventory', r.id, r.region_id;
            CONTINUE;
        END IF;

        -- Get waste_type UUID (without label column)
        BEGIN
            v_waste_type_uuid := r.waste_type::UUID;
        EXCEPTION WHEN OTHERS THEN
            SELECT id INTO v_waste_type_uuid
            FROM waste_types
            WHERE id::TEXT = r.waste_type
               OR name = r.waste_type
               OR LOWER(name) = LOWER(r.waste_type)
            LIMIT 1;
        END;

        IF v_waste_type_uuid IS NULL THEN
            RAISE NOTICE 'Skipping request % - could not find waste_type %', r.id, r.waste_type;
            CONTINUE;
        END IF;

        -- Calculate kg
        v_quantity_kg := CASE
            WHEN r.weight_unit = 't' THEN r.weight * 1000
            ELSE r.weight
        END;

        -- Upsert inventory_items
        INSERT INTO inventory_items (inventory_id, waste_type_id, quantity_kg)
        VALUES (v_inventory_id, v_waste_type_uuid, v_quantity_kg)
        ON CONFLICT (inventory_id, waste_type_id)
        DO UPDATE SET
            quantity_kg = inventory_items.quantity_kg + EXCLUDED.quantity_kg,
            last_updated = NOW();

        -- Record transaction
        INSERT INTO inventory_transactions (
            inventory_id, waste_type_id, transaction_type, quantity_kg,
            source_type, source_id, region_id, region_name,
            created_by, created_by_name, notes
        ) VALUES (
            v_inventory_id, v_waste_type_uuid, 'in', v_quantity_kg,
            'processed_request', r.id, r.region_id, v_region_name,
            r.processed_by_id, r.processed_by_name,
            'Retroaktivni import - propuštena automatska transakcija'
        );

        v_count := v_count + 1;
        RAISE NOTICE 'Processed request % - added % kg of waste_type % to inventory %',
            r.id, v_quantity_kg, v_waste_type_uuid, v_inventory_id;
    END LOOP;

    RAISE NOTICE 'Retroactive import complete. Processed % requests.', v_count;
END $$;

-- =============================================================================
-- DONE
-- =============================================================================
