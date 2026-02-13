-- =============================================================================
-- FIX: Kalo transakcija ne treba da oduzima iz inventara
-- =============================================================================
-- Problem: confirm_outbound funkcija zapisuje kalo kao 'out' transakciju
--          što dodatno oduzima iz inventara, a to je pogrešno.
--
-- Logika:
-- 1. Pri SLANJU (sent) - oduzimamo PLANIRANU količinu (npr. 555 kg)
-- 2. Pri POTVRDI (confirmed) - beležimo koliko je STVARNO primljeno (npr. 520 kg)
-- 3. KALO = planirano - primljeno (npr. 35 kg) - samo EVIDENCIJA, ne oduzimanje!
--
-- Kalo je gubitak koji se već desio - roba je već izašla iz skladišta.
-- Ne treba dodatno oduzimati jer bi to značilo duplo oduzimanje.
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
    -- NE oduzimamo iz inventara jer je već oduzeto pri slanju!
    IF v_kalo_kg > 0 THEN
        INSERT INTO inventory_kalo (
            company_code, inventory_id, outbound_id, waste_type_id, quantity_kg
        ) VALUES (
            v_outbound.company_code, v_outbound.inventory_id,
            v_outbound.id, v_outbound.waste_type_id, v_kalo_kg
        );

        -- Transakcija je samo INFORMATIVNA - quantity_kg = 0 jer ne menja stanje
        -- Ili možemo uopšte ne praviti transakciju za kalo, samo evidenciju u inventory_kalo
        -- Za sada: ne pravimo transakciju jer zbunjuje (prikazuje -35 kg kao da je oduzeto)
    END IF;

    -- Ako je primljeno VIŠE nego planirano (retko, ali moguće)
    -- Vraćamo razliku u inventory jer smo oduzeli previše pri slanju
    IF v_kalo_kg < 0 THEN
        UPDATE inventory_items
        SET quantity_kg = quantity_kg + ABS(v_kalo_kg),
            last_updated = NOW()
        WHERE inventory_id = v_outbound.inventory_id
          AND waste_type_id = v_outbound.waste_type_id;

        INSERT INTO inventory_transactions (
            inventory_id, waste_type_id, transaction_type, quantity_kg,
            source_type, source_id, notes, created_by
        ) VALUES (
            v_outbound.inventory_id, v_outbound.waste_type_id, 'in', ABS(v_kalo_kg),
            'adjustment', v_outbound.id,
            'Korekcija: primljeno više nego planirano (' || p_quantity_received_kg || ' kg umesto ' || v_outbound.quantity_planned_kg || ' kg)',
            v_user_info.user_id
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

-- Napomena: Postojeće pogrešne transakcije tipa 'kalo' treba ručno ispraviti
-- ili ih ignorisati u prikazima jer se ionako beleže u inventory_kalo tabeli.
