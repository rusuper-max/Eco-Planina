-- =============================================================================
-- INVENTORY RETROACTIVE IMPORT
-- =============================================================================
-- Importuje sve postojeće obrađene zahteve u inventory sistem.
--
-- VAŽNO: Ovu migraciju pokrenuti NAKON što:
-- 1. Migracije 055 i 056 budu pokrenute
-- 2. Admin kreira skladišta kroz UI
-- 3. Admin dodeli regione skladištima
--
-- Ako se pokrene pre nego što su regioni dodeljeni skladištima,
-- ti zahtevi neće biti importovani (inventory_id će biti NULL).
-- =============================================================================

DO $$
DECLARE
    r RECORD;
    v_qty_kg NUMERIC;
    v_waste_type_uuid UUID;
    v_count INTEGER := 0;
    v_skipped INTEGER := 0;
BEGIN
    RAISE NOTICE 'Započinjem retroaktivni import u inventory...';

    FOR r IN
        SELECT
            pr.id,
            pr.weight,
            pr.weight_unit,
            pr.waste_type,
            pr.region_id,
            pr.processed_by_id,
            pr.processed_by_name,
            pr.processed_at,
            reg.inventory_id,
            reg.name as region_name
        FROM public.processed_requests pr
        LEFT JOIN public.regions reg ON pr.region_id = reg.id AND reg.deleted_at IS NULL
        WHERE pr.status = 'completed'
          AND pr.weight IS NOT NULL
          AND pr.weight > 0
          AND pr.deleted_at IS NULL
        ORDER BY pr.processed_at ASC
    LOOP
        -- Preskoči ako region nema dodeljeno skladište
        IF r.inventory_id IS NULL THEN
            v_skipped := v_skipped + 1;
            CONTINUE;
        END IF;

        -- Konvertuj waste_type u UUID
        BEGIN
            v_waste_type_uuid := r.waste_type::UUID;
        EXCEPTION WHEN OTHERS THEN
            SELECT id INTO v_waste_type_uuid
            FROM public.waste_types
            WHERE name = r.waste_type OR id::TEXT = r.waste_type
            LIMIT 1;
        END;

        -- Preskoči ako nema validan waste_type
        IF v_waste_type_uuid IS NULL THEN
            v_skipped := v_skipped + 1;
            CONTINUE;
        END IF;

        -- Konvertuj u kg
        v_qty_kg := CASE
            WHEN r.weight_unit = 't' THEN r.weight * 1000
            ELSE r.weight
        END;

        -- Upsert inventory_items
        INSERT INTO public.inventory_items (inventory_id, waste_type_id, quantity_kg)
        VALUES (r.inventory_id, v_waste_type_uuid, v_qty_kg)
        ON CONFLICT (inventory_id, waste_type_id)
        DO UPDATE SET
            quantity_kg = inventory_items.quantity_kg + EXCLUDED.quantity_kg,
            last_updated = NOW();

        -- Zapiši transakciju sa originalnim datumom
        INSERT INTO public.inventory_transactions (
            inventory_id,
            waste_type_id,
            transaction_type,
            quantity_kg,
            source_type,
            source_id,
            region_id,
            region_name,
            created_by,
            created_by_name,
            notes,
            created_at
        ) VALUES (
            r.inventory_id,
            v_waste_type_uuid,
            'in',
            v_qty_kg,
            'processed_request',
            r.id,
            r.region_id,
            r.region_name,
            r.processed_by_id,
            r.processed_by_name,
            'Retroaktivni import',
            r.processed_at  -- Koristi originalni datum obrade
        );

        v_count := v_count + 1;

        -- Log svakih 100 zapisa
        IF v_count % 100 = 0 THEN
            RAISE NOTICE 'Importovano % zahteva...', v_count;
        END IF;
    END LOOP;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Retroaktivni import završen!';
    RAISE NOTICE 'Importovano: % zahteva', v_count;
    RAISE NOTICE 'Preskočeno: % zahteva (bez skladišta ili nevažeći tip)', v_skipped;
    RAISE NOTICE '========================================';
END $$;

-- =============================================================================
-- VERIFICATION QUERY
-- =============================================================================
-- Pokrenite ovaj query posle importa da proverite rezultate:
--
-- SELECT
--     i.name as inventory_name,
--     wt.name as waste_type,
--     ii.quantity_kg,
--     (SELECT COUNT(*) FROM inventory_transactions it WHERE it.inventory_id = i.id) as transaction_count
-- FROM inventory_items ii
-- JOIN inventories i ON ii.inventory_id = i.id
-- JOIN waste_types wt ON ii.waste_type_id = wt.id
-- WHERE i.deleted_at IS NULL
-- ORDER BY i.name, wt.name;
-- =============================================================================
