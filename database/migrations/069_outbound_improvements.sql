-- =============================================================================
-- OUTBOUND IMPROVEMENTS
-- =============================================================================
-- 1. Promeniti source_type 'outbound' na 'izlaz' (srpski)
-- 2. Promeniti source_type 'kalo' na 'kalo' (ok je)
-- 3. Dodati region_id u inventory_outbound za praćenje iz kog regiona
-- =============================================================================

-- =============================================================================
-- 1. UPDATE existing source_type values to Serbian
-- =============================================================================
UPDATE inventory_transactions
SET source_type = 'izlaz'
WHERE source_type = 'outbound';

-- 'kalo' je ok, ostaje
-- 'adjustment' -> 'korekcija'
UPDATE inventory_transactions
SET source_type = 'korekcija'
WHERE source_type = 'adjustment';

-- =============================================================================
-- 2. ADD region_id to inventory_outbound
-- =============================================================================
ALTER TABLE inventory_outbound
ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id);

-- =============================================================================
-- 3. UPDATE send_outbound to use Serbian source_type
-- =============================================================================
CREATE OR REPLACE FUNCTION public.send_outbound(p_outbound_id UUID)
RETURNS inventory_outbound
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_info current_user_info;
    v_outbound inventory_outbound;
    v_current_qty NUMERIC;
BEGIN
    v_user_info := get_current_user_info();

    IF v_user_info IS NULL THEN
        RAISE EXCEPTION 'Niste prijavljeni';
    END IF;

    IF v_user_info.role NOT IN ('manager', 'supervisor', 'company_admin', 'admin', 'developer') THEN
        RAISE EXCEPTION 'Nemate dozvolu za slanje izlaza';
    END IF;

    -- Dobavi outbound
    SELECT * INTO v_outbound
    FROM inventory_outbound
    WHERE id = p_outbound_id;

    IF v_outbound IS NULL THEN
        RAISE EXCEPTION 'Izlaz nije pronađen';
    END IF;

    IF v_outbound.company_code <> v_user_info.company_code
       AND v_user_info.role NOT IN ('admin', 'developer') THEN
        RAISE EXCEPTION 'Izlaz nije u vašoj firmi';
    END IF;

    IF v_outbound.status <> 'pending' THEN
        RAISE EXCEPTION 'Izlaz mora biti u statusu "Na čekanju" da bi se poslao';
    END IF;

    -- Proveri da li ima dovoljno na stanju
    SELECT COALESCE(quantity_kg, 0) INTO v_current_qty
    FROM inventory_items
    WHERE inventory_id = v_outbound.inventory_id
      AND waste_type_id = v_outbound.waste_type_id;

    IF v_current_qty < v_outbound.quantity_planned_kg THEN
        RAISE EXCEPTION 'Nedovoljno na stanju. Dostupno: % kg, traženo: % kg',
            ROUND(v_current_qty, 2), ROUND(v_outbound.quantity_planned_kg, 2);
    END IF;

    -- Oduzmi iz inventory
    UPDATE inventory_items
    SET quantity_kg = quantity_kg - v_outbound.quantity_planned_kg,
        last_updated = NOW()
    WHERE inventory_id = v_outbound.inventory_id
      AND waste_type_id = v_outbound.waste_type_id;

    -- Zapiši transakciju (SRPSKI source_type!)
    INSERT INTO inventory_transactions (
        inventory_id, waste_type_id, transaction_type, quantity_kg,
        source_type, source_id, notes, created_by, region_id
    ) VALUES (
        v_outbound.inventory_id, v_outbound.waste_type_id, 'out', v_outbound.quantity_planned_kg,
        'izlaz', v_outbound.id, 'Izlaz poslan: ' || v_outbound.recipient_name,
        v_user_info.user_id, v_user_info.region_id
    );

    -- Ažuriraj status
    UPDATE inventory_outbound
    SET status = 'sent',
        sent_by = v_user_info.user_id,
        sent_at = NOW(),
        region_id = COALESCE(region_id, v_user_info.region_id)
    WHERE id = p_outbound_id
    RETURNING * INTO v_outbound;

    RETURN v_outbound;
END;
$$;

-- =============================================================================
-- 4. UPDATE confirm_outbound to use Serbian source_type (for negative kalo case)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.confirm_outbound(
    p_outbound_id UUID,
    p_quantity_received_kg NUMERIC
)
RETURNS inventory_outbound
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_info current_user_info;
    v_outbound inventory_outbound;
    v_kalo_kg NUMERIC;
    v_total_amount NUMERIC;
BEGIN
    v_user_info := get_current_user_info();

    IF v_user_info IS NULL THEN
        RAISE EXCEPTION 'Niste prijavljeni';
    END IF;

    IF v_user_info.role NOT IN ('manager', 'supervisor', 'company_admin', 'admin', 'developer') THEN
        RAISE EXCEPTION 'Nemate dozvolu za potvrdu izlaza';
    END IF;

    -- Dobavi outbound
    SELECT * INTO v_outbound
    FROM inventory_outbound
    WHERE id = p_outbound_id;

    IF v_outbound IS NULL THEN
        RAISE EXCEPTION 'Izlaz nije pronađen';
    END IF;

    IF v_outbound.company_code <> v_user_info.company_code
       AND v_user_info.role NOT IN ('admin', 'developer') THEN
        RAISE EXCEPTION 'Izlaz nije u vašoj firmi';
    END IF;

    IF v_outbound.status <> 'sent' THEN
        RAISE EXCEPTION 'Izlaz mora biti u statusu "Poslat" da bi se potvrdio';
    END IF;

    IF p_quantity_received_kg < 0 THEN
        RAISE EXCEPTION 'Primljena količina ne može biti negativna';
    END IF;

    -- Izračunaj kalo (planned - received)
    v_kalo_kg := v_outbound.quantity_planned_kg - p_quantity_received_kg;

    -- Izračunaj ukupnu cenu (na osnovu primljene količine)
    IF v_outbound.price_per_kg IS NOT NULL THEN
        v_total_amount := p_quantity_received_kg * v_outbound.price_per_kg;
    END IF;

    -- Ako je kalo > 0, zapiši SAMO u inventory_kalo tabelu (evidencija)
    IF v_kalo_kg > 0 THEN
        INSERT INTO inventory_kalo (
            company_code, inventory_id, outbound_id, waste_type_id, quantity_kg
        ) VALUES (
            v_outbound.company_code, v_outbound.inventory_id,
            v_outbound.id, v_outbound.waste_type_id, v_kalo_kg
        );
    END IF;

    -- Ako je primljeno VIŠE nego planirano - vraćamo razliku
    IF v_kalo_kg < 0 THEN
        UPDATE inventory_items
        SET quantity_kg = quantity_kg + ABS(v_kalo_kg),
            last_updated = NOW()
        WHERE inventory_id = v_outbound.inventory_id
          AND waste_type_id = v_outbound.waste_type_id;

        INSERT INTO inventory_transactions (
            inventory_id, waste_type_id, transaction_type, quantity_kg,
            source_type, source_id, notes, created_by, region_id
        ) VALUES (
            v_outbound.inventory_id, v_outbound.waste_type_id, 'in', ABS(v_kalo_kg),
            'korekcija', v_outbound.id,
            'Korekcija: primljeno više nego planirano (' || p_quantity_received_kg || ' kg umesto ' || v_outbound.quantity_planned_kg || ' kg)',
            v_user_info.user_id, v_user_info.region_id
        );
    END IF;

    -- Ažuriraj outbound
    UPDATE inventory_outbound
    SET status = 'confirmed',
        quantity_received_kg = p_quantity_received_kg,
        total_amount = v_total_amount,
        confirmed_by = v_user_info.user_id,
        confirmed_at = NOW()
    WHERE id = p_outbound_id
    RETURNING * INTO v_outbound;

    RETURN v_outbound;
END;
$$;

-- =============================================================================
-- 5. UPDATE cancel_outbound to use Serbian source_type
-- =============================================================================
CREATE OR REPLACE FUNCTION public.cancel_outbound(p_outbound_id UUID)
RETURNS inventory_outbound
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_info current_user_info;
    v_outbound inventory_outbound;
BEGIN
    v_user_info := get_current_user_info();

    IF v_user_info IS NULL THEN
        RAISE EXCEPTION 'Niste prijavljeni';
    END IF;

    IF v_user_info.role NOT IN ('manager', 'supervisor', 'company_admin', 'admin', 'developer') THEN
        RAISE EXCEPTION 'Nemate dozvolu za otkazivanje izlaza';
    END IF;

    -- Dobavi outbound
    SELECT * INTO v_outbound
    FROM inventory_outbound
    WHERE id = p_outbound_id;

    IF v_outbound IS NULL THEN
        RAISE EXCEPTION 'Izlaz nije pronađen';
    END IF;

    IF v_outbound.company_code <> v_user_info.company_code
       AND v_user_info.role NOT IN ('admin', 'developer') THEN
        RAISE EXCEPTION 'Izlaz nije u vašoj firmi';
    END IF;

    IF v_outbound.status = 'confirmed' THEN
        RAISE EXCEPTION 'Potvrđeni izlaz se ne može otkazati';
    END IF;

    IF v_outbound.status = 'cancelled' THEN
        RAISE EXCEPTION 'Izlaz je već otkazan';
    END IF;

    -- Ako je bio sent, vrati u inventory
    IF v_outbound.status = 'sent' THEN
        INSERT INTO inventory_items (inventory_id, waste_type_id, quantity_kg)
        VALUES (v_outbound.inventory_id, v_outbound.waste_type_id, v_outbound.quantity_planned_kg)
        ON CONFLICT (inventory_id, waste_type_id)
        DO UPDATE SET
            quantity_kg = inventory_items.quantity_kg + EXCLUDED.quantity_kg,
            last_updated = NOW();

        -- Zapiši transakciju (SRPSKI!)
        INSERT INTO inventory_transactions (
            inventory_id, waste_type_id, transaction_type, quantity_kg,
            source_type, source_id, notes, created_by, region_id
        ) VALUES (
            v_outbound.inventory_id, v_outbound.waste_type_id, 'in', v_outbound.quantity_planned_kg,
            'korekcija', v_outbound.id, 'Otkazan izlaz - vraćeno u skladište',
            v_user_info.user_id, v_user_info.region_id
        );
    END IF;

    -- Ažuriraj status
    UPDATE inventory_outbound
    SET status = 'cancelled',
        cancelled_by = v_user_info.user_id,
        cancelled_at = NOW()
    WHERE id = p_outbound_id
    RETURNING * INTO v_outbound;

    RETURN v_outbound;
END;
$$;
