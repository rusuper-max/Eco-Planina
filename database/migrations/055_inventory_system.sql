-- =============================================================================
-- INVENTORY SYSTEM - Skladišta i praćenje količina
-- =============================================================================
-- Omogućava:
-- 1. Višestruka skladišta po firmi
-- 2. Mapiranje regiona na skladišta
-- 3. Praćenje količina po vrsti otpada
-- 4. Istorija transakcija (ulaz/izlaz)
-- =============================================================================

-- 1. INVENTORIES (Skladišta)
CREATE TABLE IF NOT EXISTS public.inventories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    -- Visibility settings for managers
    -- 'full' = manager vidi celo skladište
    -- 'own_only' = manager vidi samo doprinos svoje filijale
    manager_visibility VARCHAR(20) DEFAULT 'full',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,

    CONSTRAINT fk_inventories_company
        FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE,
    CONSTRAINT unique_inventory_name_per_company
        UNIQUE (company_code, name)
);

-- 2. Dodaj inventory_id u REGIONS tabelu
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'regions' AND column_name = 'inventory_id'
    ) THEN
        ALTER TABLE public.regions
        ADD COLUMN inventory_id UUID REFERENCES public.inventories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. INVENTORY_ITEMS (Stanje po vrsti otpada u svakom skladištu)
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL,
    waste_type_id UUID NOT NULL,
    quantity_kg NUMERIC(12,2) DEFAULT 0, -- Uvek u kg
    last_updated TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_inventory_items_inventory
        FOREIGN KEY (inventory_id) REFERENCES public.inventories(id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_items_waste_type
        FOREIGN KEY (waste_type_id) REFERENCES public.waste_types(id) ON DELETE CASCADE,
    CONSTRAINT unique_item_per_inventory
        UNIQUE (inventory_id, waste_type_id)
);

-- 4. INVENTORY_TRANSACTIONS (Istorija ulaza/izlaza)
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL,
    waste_type_id UUID NOT NULL,
    transaction_type VARCHAR(10) NOT NULL, -- 'in' ili 'out'
    quantity_kg NUMERIC(12,2) NOT NULL,

    -- Izvor transakcije
    source_type VARCHAR(30) NOT NULL, -- 'processed_request', 'shipment', 'adjustment'
    source_id UUID, -- ID processed_request, shipment, ili NULL za adjustment

    -- Koji region je doprineo (za praćenje po filijama)
    region_id UUID,
    region_name TEXT, -- Denormalizovano za istoriju

    -- Detalji
    notes TEXT,
    created_by UUID,
    created_by_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_inventory_transactions_inventory
        FOREIGN KEY (inventory_id) REFERENCES public.inventories(id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_transactions_waste_type
        FOREIGN KEY (waste_type_id) REFERENCES public.waste_types(id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_transactions_region
        FOREIGN KEY (region_id) REFERENCES public.regions(id) ON DELETE SET NULL,
    CONSTRAINT fk_inventory_transactions_user
        FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT chk_transaction_type
        CHECK (transaction_type IN ('in', 'out'))
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_inventories_company
    ON public.inventories(company_code) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_items_inventory
    ON public.inventory_items(inventory_id);

CREATE INDEX IF NOT EXISTS idx_inventory_items_waste_type
    ON public.inventory_items(waste_type_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory
    ON public.inventory_transactions(inventory_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created
    ON public.inventory_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_region
    ON public.inventory_transactions(region_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_source
    ON public.inventory_transactions(source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_regions_inventory
    ON public.regions(inventory_id) WHERE deleted_at IS NULL;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view company inventories" ON public.inventories;
DROP POLICY IF EXISTS "Company admin can insert inventories" ON public.inventories;
DROP POLICY IF EXISTS "Company admin can update inventories" ON public.inventories;
DROP POLICY IF EXISTS "Company admin can delete inventories" ON public.inventories;
DROP POLICY IF EXISTS "Users can view inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "System can manage inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Users can view inventory transactions" ON public.inventory_transactions;
DROP POLICY IF EXISTS "System can insert transactions" ON public.inventory_transactions;

-- INVENTORIES POLICIES

-- Svi korisnici firme mogu videti skladišta
CREATE POLICY "Users can view company inventories" ON public.inventories
FOR SELECT TO authenticated
USING (
    (company_code = get_my_company_code() OR get_my_role() IN ('admin', 'developer'))
    AND deleted_at IS NULL
);

-- Samo company_admin može kreirati skladišta
CREATE POLICY "Company admin can insert inventories" ON public.inventories
FOR INSERT TO authenticated
WITH CHECK (
    company_code = get_my_company_code()
    AND get_my_role() IN ('company_admin', 'admin', 'developer')
);

-- Samo company_admin može ažurirati skladišta
CREATE POLICY "Company admin can update inventories" ON public.inventories
FOR UPDATE TO authenticated
USING (
    company_code = get_my_company_code()
    AND get_my_role() IN ('company_admin', 'admin', 'developer')
)
WITH CHECK (
    company_code = get_my_company_code()
    AND get_my_role() IN ('company_admin', 'admin', 'developer')
);

-- Samo company_admin može brisati skladišta (soft delete)
CREATE POLICY "Company admin can delete inventories" ON public.inventories
FOR DELETE TO authenticated
USING (
    company_code = get_my_company_code()
    AND get_my_role() IN ('company_admin', 'admin', 'developer')
);

-- INVENTORY_ITEMS POLICIES

-- Svi mogu videti items kroz svoj inventory
CREATE POLICY "Users can view inventory items" ON public.inventory_items
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.inventories i
        WHERE i.id = inventory_items.inventory_id
        AND (i.company_code = get_my_company_code() OR get_my_role() IN ('admin', 'developer'))
        AND i.deleted_at IS NULL
    )
);

-- Sistem (trigeri) mogu upravljati items
CREATE POLICY "System can manage inventory items" ON public.inventory_items
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- INVENTORY_TRANSACTIONS POLICIES

-- Svi mogu videti transakcije kroz svoj inventory
CREATE POLICY "Users can view inventory transactions" ON public.inventory_transactions
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.inventories i
        WHERE i.id = inventory_transactions.inventory_id
        AND (i.company_code = get_my_company_code() OR get_my_role() IN ('admin', 'developer'))
        AND i.deleted_at IS NULL
    )
);

-- Sistem može insertovati transakcije (trigeri + manual adjustments)
CREATE POLICY "System can insert transactions" ON public.inventory_transactions
FOR INSERT TO authenticated
WITH CHECK (true);

-- =============================================================================
-- HELPER FUNCTION - Update timestamp
-- =============================================================================

CREATE OR REPLACE FUNCTION update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inventories_updated_at ON public.inventories;
CREATE TRIGGER inventories_updated_at
    BEFORE UPDATE ON public.inventories
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_updated_at();

-- =============================================================================
-- DONE
-- =============================================================================
-- Sledeći korak: 056_inventory_trigger.sql za automatski ulaz
-- =============================================================================
