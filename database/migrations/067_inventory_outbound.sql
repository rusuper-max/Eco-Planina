-- =============================================================================
-- INVENTORY OUTBOUND - Izlaz robe iz skladišta
-- =============================================================================
-- Tok:
-- 1. KREIRANJE (pending) - samo evidencija, inventory NIJE dirnut
-- 2. SLANJE (sent) - oduzima se planirana količina iz inventory
-- 3. POTVRDA (confirmed) - unosi se stvarna količina, kalo se beleži
-- 4. OTKAZANO (cancelled) - vraća se u inventory (ako je bilo sent)
-- =============================================================================

-- =============================================================================
-- 1. INVENTORY_OUTBOUND TABELA
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_outbound (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_code VARCHAR(20) NOT NULL,
    inventory_id UUID NOT NULL,
    waste_type_id UUID NOT NULL,

    -- Količine
    quantity_planned_kg NUMERIC(12,2) NOT NULL,      -- Planirana količina pri kreiranju
    quantity_received_kg NUMERIC(12,2) DEFAULT NULL, -- Primljena količina (popunjava se pri potvrdi)

    -- Primalac
    recipient_name VARCHAR(200) NOT NULL,            -- Naziv firme primaoca (obavezno)
    recipient_address TEXT,                          -- Adresa (opciono)
    recipient_contact VARCHAR(100),                  -- Telefon/email (opciono)

    -- Cena
    price_per_kg NUMERIC(10,2) DEFAULT NULL,         -- Cena po kg (opciono)
    total_amount NUMERIC(14,2) DEFAULT NULL,         -- Izračunata ukupna cena

    -- Status workflow
    status VARCHAR(20) NOT NULL DEFAULT 'pending',   -- pending/sent/confirmed/cancelled
    notes TEXT,

    -- Audit trail
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_by UUID,
    sent_at TIMESTAMPTZ,
    confirmed_by UUID,
    confirmed_at TIMESTAMPTZ,
    cancelled_by UUID,
    cancelled_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT fk_outbound_company
        FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE,
    CONSTRAINT fk_outbound_inventory
        FOREIGN KEY (inventory_id) REFERENCES inventories(id) ON DELETE CASCADE,
    CONSTRAINT fk_outbound_waste_type
        FOREIGN KEY (waste_type_id) REFERENCES waste_types(id) ON DELETE CASCADE,
    CONSTRAINT fk_outbound_created_by
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_outbound_sent_by
        FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_outbound_confirmed_by
        FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_outbound_cancelled_by
        FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_outbound_status
        CHECK (status IN ('pending', 'sent', 'confirmed', 'cancelled')),
    CONSTRAINT chk_outbound_quantity_positive
        CHECK (quantity_planned_kg > 0)
);

-- =============================================================================
-- 2. INVENTORY_KALO TABELA - Evidencija kala (razlike pri prijemu)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_kalo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_code VARCHAR(20) NOT NULL,
    inventory_id UUID NOT NULL,
    outbound_id UUID NOT NULL,
    waste_type_id UUID NOT NULL,

    quantity_kg NUMERIC(12,2) NOT NULL,  -- Količina kala (planned - received)

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_kalo_company
        FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE,
    CONSTRAINT fk_kalo_inventory
        FOREIGN KEY (inventory_id) REFERENCES inventories(id) ON DELETE CASCADE,
    CONSTRAINT fk_kalo_outbound
        FOREIGN KEY (outbound_id) REFERENCES inventory_outbound(id) ON DELETE CASCADE,
    CONSTRAINT fk_kalo_waste_type
        FOREIGN KEY (waste_type_id) REFERENCES waste_types(id) ON DELETE CASCADE,
    CONSTRAINT chk_kalo_positive
        CHECK (quantity_kg >= 0)
);

-- =============================================================================
-- 3. INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_outbound_company ON public.inventory_outbound(company_code);
CREATE INDEX IF NOT EXISTS idx_outbound_inventory ON public.inventory_outbound(inventory_id);
CREATE INDEX IF NOT EXISTS idx_outbound_status ON public.inventory_outbound(status);
CREATE INDEX IF NOT EXISTS idx_outbound_created_at ON public.inventory_outbound(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outbound_waste_type ON public.inventory_outbound(waste_type_id);

CREATE INDEX IF NOT EXISTS idx_kalo_company ON public.inventory_kalo(company_code);
CREATE INDEX IF NOT EXISTS idx_kalo_inventory ON public.inventory_kalo(inventory_id);
CREATE INDEX IF NOT EXISTS idx_kalo_outbound ON public.inventory_kalo(outbound_id);
CREATE INDEX IF NOT EXISTS idx_kalo_created_at ON public.inventory_kalo(created_at DESC);

-- =============================================================================
-- 4. RLS POLICIES
-- =============================================================================
ALTER TABLE public.inventory_outbound ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_kalo ENABLE ROW LEVEL SECURITY;

-- Drop existing if any
DROP POLICY IF EXISTS "outbound_select" ON public.inventory_outbound;
DROP POLICY IF EXISTS "outbound_insert" ON public.inventory_outbound;
DROP POLICY IF EXISTS "outbound_update" ON public.inventory_outbound;
DROP POLICY IF EXISTS "kalo_select" ON public.inventory_kalo;
DROP POLICY IF EXISTS "kalo_insert" ON public.inventory_kalo;

CREATE POLICY "outbound_select" ON public.inventory_outbound
FOR SELECT TO authenticated
USING (
    (get_current_user_info()).role IN ('admin', 'developer')
    OR EXISTS (
        SELECT 1 FROM public.inventories i
        WHERE i.id = inventory_outbound.inventory_id
        AND i.deleted_at IS NULL
        AND i.company_code = (get_current_user_info()).company_code
        AND (
            (get_current_user_info()).role = 'company_admin'
            OR (
                (get_current_user_info()).role = 'manager'
                AND (
                    i.manager_visibility = 'full'
                    OR EXISTS (
                        SELECT 1 FROM public.regions r
                        WHERE r.inventory_id = i.id
                        AND r.id = (get_current_user_info()).region_id
                    )
                )
            )
            OR (
                (get_current_user_info()).role = 'supervisor'
                AND EXISTS (
                    SELECT 1 FROM public.regions r
                    WHERE r.inventory_id = i.id
                    AND r.id = ANY((get_current_user_info()).supervisor_region_ids)
                )
            )
        )
    )
);

CREATE POLICY "outbound_insert" ON public.inventory_outbound
FOR INSERT TO authenticated
WITH CHECK (
    (get_current_user_info()).role IN ('admin', 'developer')
    OR EXISTS (
        SELECT 1 FROM public.inventories i
        WHERE i.id = inventory_outbound.inventory_id
        AND i.company_code = (get_current_user_info()).company_code
        AND i.deleted_at IS NULL
        AND (
            (get_current_user_info()).role = 'company_admin'
            OR (
                (get_current_user_info()).role = 'manager'
                AND (
                    i.manager_visibility = 'full'
                    OR EXISTS (
                        SELECT 1 FROM public.regions r
                        WHERE r.inventory_id = i.id
                        AND r.id = (get_current_user_info()).region_id
                    )
                )
            )
            OR (
                (get_current_user_info()).role = 'supervisor'
                AND EXISTS (
                    SELECT 1 FROM public.regions r
                    WHERE r.inventory_id = i.id
                    AND r.id = ANY((get_current_user_info()).supervisor_region_ids)
                )
            )
        )
    )
);

CREATE POLICY "outbound_update" ON public.inventory_outbound
FOR UPDATE TO authenticated
USING (
    (get_current_user_info()).role IN ('admin', 'developer')
    OR EXISTS (
        SELECT 1 FROM public.inventories i
        WHERE i.id = inventory_outbound.inventory_id
        AND i.company_code = (get_current_user_info()).company_code
        AND i.deleted_at IS NULL
        AND (
            (get_current_user_info()).role = 'company_admin'
            OR (
                (get_current_user_info()).role = 'manager'
                AND (
                    i.manager_visibility = 'full'
                    OR EXISTS (
                        SELECT 1 FROM public.regions r
                        WHERE r.inventory_id = i.id
                        AND r.id = (get_current_user_info()).region_id
                    )
                )
            )
            OR (
                (get_current_user_info()).role = 'supervisor'
                AND EXISTS (
                    SELECT 1 FROM public.regions r
                    WHERE r.inventory_id = i.id
                    AND r.id = ANY((get_current_user_info()).supervisor_region_ids)
                )
            )
        )
    )
)
WITH CHECK (
    (get_current_user_info()).role IN ('admin', 'developer')
    OR EXISTS (
        SELECT 1 FROM public.inventories i
        WHERE i.id = inventory_outbound.inventory_id
        AND i.company_code = (get_current_user_info()).company_code
        AND i.deleted_at IS NULL
        AND (
            (get_current_user_info()).role = 'company_admin'
            OR (
                (get_current_user_info()).role = 'manager'
                AND (
                    i.manager_visibility = 'full'
                    OR EXISTS (
                        SELECT 1 FROM public.regions r
                        WHERE r.inventory_id = i.id
                        AND r.id = (get_current_user_info()).region_id
                    )
                )
            )
            OR (
                (get_current_user_info()).role = 'supervisor'
                AND EXISTS (
                    SELECT 1 FROM public.regions r
                    WHERE r.inventory_id = i.id
                    AND r.id = ANY((get_current_user_info()).supervisor_region_ids)
                )
            )
        )
    )
);

-- KALO SELECT - svi u firmi mogu videti
CREATE POLICY "kalo_select" ON public.inventory_kalo
FOR SELECT TO authenticated
USING (
    company_code = (get_current_user_info()).company_code
    OR (get_current_user_info()).role IN ('admin', 'developer')
);

-- KALO INSERT - sistem (trigeri) ili admin role
CREATE POLICY "kalo_insert" ON public.inventory_kalo
FOR INSERT TO authenticated
WITH CHECK (
    company_code = (get_current_user_info()).company_code
    AND (get_current_user_info()).role IN ('manager', 'supervisor', 'company_admin', 'admin', 'developer')
);

-- =============================================================================
-- 5. RPC: create_outbound - Kreiranje novog izlaza
-- =============================================================================
CREATE OR REPLACE FUNCTION public.create_outbound(
    p_inventory_id UUID,
    p_waste_type_id UUID,
    p_quantity_kg NUMERIC,
    p_recipient_name TEXT,
    p_recipient_address TEXT DEFAULT NULL,
    p_recipient_contact TEXT DEFAULT NULL,
    p_price_per_kg NUMERIC DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS inventory_outbound
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_info current_user_info;
    v_inventory_company TEXT;
    v_result inventory_outbound;
BEGIN
    v_user_info := get_current_user_info();

    IF v_user_info IS NULL OR v_user_info.user_id IS NULL THEN
        RAISE EXCEPTION 'Niste prijavljeni';
    END IF;

    IF v_user_info.role NOT IN ('manager', 'supervisor', 'company_admin', 'admin', 'developer') THEN
        RAISE EXCEPTION 'Nemate dozvolu za kreiranje izlaza';
    END IF;

    -- Proveri da inventory pripada firmi
    SELECT company_code INTO v_inventory_company
    FROM inventories
    WHERE id = p_inventory_id AND deleted_at IS NULL;

    IF v_inventory_company IS NULL THEN
        RAISE EXCEPTION 'Skladište nije pronađeno';
    END IF;

    IF v_inventory_company <> v_user_info.company_code
       AND v_user_info.role NOT IN ('admin', 'developer') THEN
        RAISE EXCEPTION 'Skladište nije u vašoj firmi';
    END IF;

    -- Validacija
    IF p_quantity_kg <= 0 THEN
        RAISE EXCEPTION 'Količina mora biti veća od 0';
    END IF;

    IF p_recipient_name IS NULL OR TRIM(p_recipient_name) = '' THEN
        RAISE EXCEPTION 'Naziv primaoca je obavezan';
    END IF;

    -- Kreiraj izlaz (status = pending)
    INSERT INTO inventory_outbound (
        company_code, inventory_id, waste_type_id,
        quantity_planned_kg, recipient_name, recipient_address, recipient_contact,
        price_per_kg, notes, created_by, status
    ) VALUES (
        v_inventory_company, p_inventory_id, p_waste_type_id,
        p_quantity_kg, TRIM(p_recipient_name), p_recipient_address, p_recipient_contact,
        p_price_per_kg, p_notes, v_user_info.user_id, 'pending'
    )
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_outbound(UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, NUMERIC, TEXT) TO authenticated;

-- =============================================================================
-- 6. RPC: send_outbound - Pošalji izlaz (status: pending -> sent)
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

    -- Zapiši transakciju
    INSERT INTO inventory_transactions (
        inventory_id, waste_type_id, transaction_type, quantity_kg,
        source_type, source_id, notes, created_by
    ) VALUES (
        v_outbound.inventory_id, v_outbound.waste_type_id, 'out', v_outbound.quantity_planned_kg,
        'outbound', v_outbound.id, 'Izlaz poslan: ' || v_outbound.recipient_name,
        v_user_info.user_id
    );

    -- Ažuriraj status
    UPDATE inventory_outbound
    SET status = 'sent',
        sent_by = v_user_info.user_id,
        sent_at = NOW()
    WHERE id = p_outbound_id
    RETURNING * INTO v_outbound;

    RETURN v_outbound;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_outbound(UUID) TO authenticated;

-- =============================================================================
-- 7. RPC: confirm_outbound - Potvrdi prijem (status: sent -> confirmed)
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

    -- Ako je kalo > 0, zapiši u inventory_kalo
    IF v_kalo_kg > 0 THEN
        INSERT INTO inventory_kalo (
            company_code, inventory_id, outbound_id, waste_type_id, quantity_kg
        ) VALUES (
            v_outbound.company_code, v_outbound.inventory_id,
            v_outbound.id, v_outbound.waste_type_id, v_kalo_kg
        );

        -- Zapiši kalo transakciju (informativno)
        INSERT INTO inventory_transactions (
            inventory_id, waste_type_id, transaction_type, quantity_kg,
            source_type, source_id, notes, created_by
        ) VALUES (
            v_outbound.inventory_id, v_outbound.waste_type_id, 'out', v_kalo_kg,
            'kalo', v_outbound.id,
            'Kalo pri izlazu: planirano ' || v_outbound.quantity_planned_kg || ' kg, primljeno ' || p_quantity_received_kg || ' kg',
            v_user_info.user_id
        );
    END IF;

    -- Ako je primljeno VIŠE nego planirano (retko, ali moguće)
    -- Vraćamo razliku u inventory
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

GRANT EXECUTE ON FUNCTION public.confirm_outbound(UUID, NUMERIC) TO authenticated;

-- =============================================================================
-- 8. RPC: cancel_outbound - Otkaži izlaz
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
        -- Vrati u inventory
        INSERT INTO inventory_items (inventory_id, waste_type_id, quantity_kg)
        VALUES (v_outbound.inventory_id, v_outbound.waste_type_id, v_outbound.quantity_planned_kg)
        ON CONFLICT (inventory_id, waste_type_id)
        DO UPDATE SET
            quantity_kg = inventory_items.quantity_kg + EXCLUDED.quantity_kg,
            last_updated = NOW();

        -- Zapiši transakciju
        INSERT INTO inventory_transactions (
            inventory_id, waste_type_id, transaction_type, quantity_kg,
            source_type, source_id, notes, created_by
        ) VALUES (
            v_outbound.inventory_id, v_outbound.waste_type_id, 'in', v_outbound.quantity_planned_kg,
            'adjustment', v_outbound.id, 'Otkazan izlaz - vraćeno u skladište',
            v_user_info.user_id
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

GRANT EXECUTE ON FUNCTION public.cancel_outbound(UUID) TO authenticated;

-- =============================================================================
-- DONE
-- =============================================================================
-- Sledeći korak: UI komponente za Izlaz tab u InventoryPage
-- =============================================================================
