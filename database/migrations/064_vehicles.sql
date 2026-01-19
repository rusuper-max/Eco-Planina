-- =============================================================================
-- VEHICLES SYSTEM
-- =============================================================================
-- Praćenje voznog parka sa many-to-many vezom vozač-kamion
-- =============================================================================

-- 1. VEHICLES tabela
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_code VARCHAR(20) NOT NULL REFERENCES public.companies(code) ON DELETE CASCADE,
    registration VARCHAR(20) NOT NULL,  -- Registarska oznaka (BG-123-AB)
    name VARCHAR(100),                   -- Naziv vozila (npr. "Mercedes Sprinter")
    brand VARCHAR(50),                   -- Marka (Mercedes, MAN, Iveco...)
    model VARCHAR(50),                   -- Model
    year INTEGER,                        -- Godina proizvodnje
    capacity_kg NUMERIC(10,2),           -- Nosivost u kg (opciono)
    status VARCHAR(20) DEFAULT 'active', -- active, maintenance, retired
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,

    -- Registracija mora biti jedinstvena unutar firme
    CONSTRAINT unique_registration_per_company
        UNIQUE (company_code, registration),
    CONSTRAINT chk_vehicle_status
        CHECK (status IN ('active', 'maintenance', 'retired'))
);

-- 2. VEHICLE_DRIVERS tabela (many-to-many)
CREATE TABLE IF NOT EXISTS public.vehicle_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,    -- Da li je ovo primarno vozilo za vozača
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES public.users(id),

    -- Jedan vozač može biti dodeljen istom vozilu samo jednom
    CONSTRAINT unique_vehicle_driver UNIQUE (vehicle_id, driver_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX idx_vehicles_company ON public.vehicles(company_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_vehicles_status ON public.vehicles(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_vehicles_registration ON public.vehicles(registration) WHERE deleted_at IS NULL;
CREATE INDEX idx_vehicle_drivers_vehicle ON public.vehicle_drivers(vehicle_id);
CREATE INDEX idx_vehicle_drivers_driver ON public.vehicle_drivers(driver_id);

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================
CREATE OR REPLACE FUNCTION update_vehicles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_vehicles_updated_at
BEFORE UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION update_vehicles_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_drivers ENABLE ROW LEVEL SECURITY;

-- VEHICLES policies
-- View: svi iz firme vide vozila
CREATE POLICY "vehicles_select" ON public.vehicles
FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND (
        company_code = (get_current_user_info()).company_code
        OR (get_current_user_info()).role IN ('admin', 'developer')
    )
);

-- Insert: manager, supervisor, company_admin mogu kreirati
CREATE POLICY "vehicles_insert" ON public.vehicles
FOR INSERT TO authenticated
WITH CHECK (
    company_code = (get_current_user_info()).company_code
    AND (get_current_user_info()).role IN ('manager', 'supervisor', 'company_admin', 'admin', 'developer')
);

-- Update: manager, supervisor, company_admin mogu ažurirati
CREATE POLICY "vehicles_update" ON public.vehicles
FOR UPDATE TO authenticated
USING (
    company_code = (get_current_user_info()).company_code
    AND (get_current_user_info()).role IN ('manager', 'supervisor', 'company_admin', 'admin', 'developer')
)
WITH CHECK (
    company_code = (get_current_user_info()).company_code
    AND (get_current_user_info()).role IN ('manager', 'supervisor', 'company_admin', 'admin', 'developer')
);

-- Delete: manager, supervisor, company_admin mogu brisati
CREATE POLICY "vehicles_delete" ON public.vehicles
FOR DELETE TO authenticated
USING (
    company_code = (get_current_user_info()).company_code
    AND (get_current_user_info()).role IN ('manager', 'supervisor', 'company_admin', 'admin', 'developer')
);

-- VEHICLE_DRIVERS policies
-- View: svi iz firme vide dodele
CREATE POLICY "vehicle_drivers_select" ON public.vehicle_drivers
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.vehicles v
        WHERE v.id = vehicle_drivers.vehicle_id
        AND v.deleted_at IS NULL
        AND (
            v.company_code = (get_current_user_info()).company_code
            OR (get_current_user_info()).role IN ('admin', 'developer')
        )
    )
);

-- Insert: manager, supervisor, company_admin mogu dodeljivati
CREATE POLICY "vehicle_drivers_insert" ON public.vehicle_drivers
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.vehicles v
        WHERE v.id = vehicle_drivers.vehicle_id
        AND v.deleted_at IS NULL
        AND v.company_code = (get_current_user_info()).company_code
        AND (get_current_user_info()).role IN ('manager', 'supervisor', 'company_admin', 'admin', 'developer')
    )
);

-- Delete: manager, supervisor, company_admin mogu uklanjati dodele
CREATE POLICY "vehicle_drivers_delete" ON public.vehicle_drivers
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.vehicles v
        WHERE v.id = vehicle_drivers.vehicle_id
        AND v.deleted_at IS NULL
        AND v.company_code = (get_current_user_info()).company_code
        AND (get_current_user_info()).role IN ('manager', 'supervisor', 'company_admin', 'admin', 'developer')
    )
);

-- Update: manager, supervisor, company_admin mogu menjati (is_primary flag)
CREATE POLICY "vehicle_drivers_update" ON public.vehicle_drivers
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.vehicles v
        WHERE v.id = vehicle_drivers.vehicle_id
        AND v.deleted_at IS NULL
        AND v.company_code = (get_current_user_info()).company_code
        AND (get_current_user_info()).role IN ('manager', 'supervisor', 'company_admin', 'admin', 'developer')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.vehicles v
        WHERE v.id = vehicle_drivers.vehicle_id
        AND v.deleted_at IS NULL
        AND v.company_code = (get_current_user_info()).company_code
        AND (get_current_user_info()).role IN ('manager', 'supervisor', 'company_admin', 'admin', 'developer')
    )
);

-- =============================================================================
-- GRANTS
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_drivers TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE public.vehicles IS 'Vozni park firme - kamioni i druga vozila';
COMMENT ON TABLE public.vehicle_drivers IS 'Many-to-many veza između vozila i vozača';
COMMENT ON COLUMN public.vehicles.registration IS 'Registarska oznaka vozila, jedinstvena po firmi';
COMMENT ON COLUMN public.vehicles.status IS 'Status vozila: active (u upotrebi), maintenance (na servisu), retired (povučeno)';
COMMENT ON COLUMN public.vehicle_drivers.is_primary IS 'Da li je ovo primarno/glavno vozilo za ovog vozača';
