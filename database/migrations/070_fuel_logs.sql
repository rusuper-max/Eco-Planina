-- =============================================
-- Migracija 070: Fuel Logs (Praćenje goriva)
-- =============================================
-- Tabela za evidenciju potrošnje goriva po vozilima i vozačima

-- Kreiraj fuel_logs tabelu
CREATE TABLE IF NOT EXISTS public.fuel_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    company_code TEXT NOT NULL,

    -- Podaci o točenju goriva
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    liters DECIMAL(10,2) NOT NULL CHECK (liters > 0),
    price_per_liter DECIMAL(10,2),
    total_price DECIMAL(10,2),
    fuel_type TEXT DEFAULT 'diesel' CHECK (fuel_type IN ('diesel', 'petrol', 'lpg', 'electric')),

    -- Kilometraža
    odometer_km INTEGER CHECK (odometer_km >= 0),

    -- Dokumentacija
    receipt_image_url TEXT,
    gas_station TEXT,
    notes TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id)
);

-- Indeksi za brže pretrage (IF NOT EXISTS za idempotentnost)
CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle ON public.fuel_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_driver ON public.fuel_logs(driver_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_company ON public.fuel_logs(company_code);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_date ON public.fuel_logs(date DESC);

-- Kompozitni indeks za izveštaje
CREATE INDEX IF NOT EXISTS idx_fuel_logs_reporting ON public.fuel_logs(company_code, date DESC, vehicle_id);

-- Enable RLS
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;

-- RLS Politike (DROP IF EXISTS za idempotentnost)
-- 1. Admini i developeri vide sve
DROP POLICY IF EXISTS "fuel_logs_admin_all" ON public.fuel_logs;
CREATE POLICY "fuel_logs_admin_all" ON public.fuel_logs
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'developer')
        )
    );

-- 2. Company admini/supervizori/menadžeri vide logove svoje kompanije
DROP POLICY IF EXISTS "fuel_logs_company_select" ON public.fuel_logs;
CREATE POLICY "fuel_logs_company_select" ON public.fuel_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.company_code = fuel_logs.company_code
            AND u.role IN ('company_admin', 'supervisor', 'manager')
        )
    );

-- 3. Vozači vide svoje logove
DROP POLICY IF EXISTS "fuel_logs_driver_select" ON public.fuel_logs;
CREATE POLICY "fuel_logs_driver_select" ON public.fuel_logs
    FOR SELECT
    TO authenticated
    USING (
        driver_id = auth.uid()
    );

-- 4. Vozači mogu kreirati logove za sebe
DROP POLICY IF EXISTS "fuel_logs_driver_insert" ON public.fuel_logs;
CREATE POLICY "fuel_logs_driver_insert" ON public.fuel_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'driver'
            AND u.company_code = fuel_logs.company_code
        )
        AND driver_id = auth.uid()
    );

-- 5. Company admini mogu menjati/brisati logove svoje kompanije
DROP POLICY IF EXISTS "fuel_logs_company_manage" ON public.fuel_logs;
CREATE POLICY "fuel_logs_company_manage" ON public.fuel_logs
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.company_code = fuel_logs.company_code
            AND u.role = 'company_admin'
        )
    );

-- View za agregiranu statistiku goriva
CREATE OR REPLACE VIEW public.fuel_stats_by_vehicle AS
SELECT
    fl.vehicle_id,
    v.registration,
    v.brand,
    v.model,
    fl.company_code,
    COUNT(*) as refuel_count,
    SUM(fl.liters) as total_liters,
    SUM(fl.total_price) as total_cost,
    AVG(fl.price_per_liter) as avg_price_per_liter,
    MIN(fl.odometer_km) as min_odometer,
    MAX(fl.odometer_km) as max_odometer,
    CASE
        WHEN MAX(fl.odometer_km) - MIN(fl.odometer_km) > 0
        THEN ROUND((SUM(fl.liters) / (MAX(fl.odometer_km) - MIN(fl.odometer_km)) * 100)::numeric, 2)
        ELSE NULL
    END as avg_consumption_per_100km,
    MIN(fl.date) as first_refuel_date,
    MAX(fl.date) as last_refuel_date
FROM public.fuel_logs fl
LEFT JOIN public.vehicles v ON v.id = fl.vehicle_id
GROUP BY fl.vehicle_id, v.registration, v.brand, v.model, fl.company_code;

-- View za mesečnu statistiku
CREATE OR REPLACE VIEW public.fuel_stats_monthly AS
SELECT
    fl.company_code,
    fl.vehicle_id,
    v.registration,
    DATE_TRUNC('month', fl.date) as month,
    COUNT(*) as refuel_count,
    SUM(fl.liters) as total_liters,
    SUM(fl.total_price) as total_cost,
    AVG(fl.price_per_liter) as avg_price
FROM public.fuel_logs fl
LEFT JOIN public.vehicles v ON v.id = fl.vehicle_id
GROUP BY fl.company_code, fl.vehicle_id, v.registration, DATE_TRUNC('month', fl.date);

-- Funkcija za izračunavanje potrošnje između dva točenja
CREATE OR REPLACE FUNCTION public.calculate_fuel_consumption(
    p_vehicle_id UUID,
    p_from_date DATE DEFAULT NULL,
    p_to_date DATE DEFAULT NULL
)
RETURNS TABLE (
    date DATE,
    liters DECIMAL,
    odometer_km INTEGER,
    km_since_last INTEGER,
    consumption_per_100km DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH ordered_logs AS (
        SELECT
            fl.date,
            fl.liters,
            fl.odometer_km,
            LAG(fl.odometer_km) OVER (ORDER BY fl.date, fl.created_at) as prev_odometer
        FROM public.fuel_logs fl
        WHERE fl.vehicle_id = p_vehicle_id
        AND (p_from_date IS NULL OR fl.date >= p_from_date)
        AND (p_to_date IS NULL OR fl.date <= p_to_date)
        ORDER BY fl.date, fl.created_at
    )
    SELECT
        ol.date,
        ol.liters,
        ol.odometer_km,
        (ol.odometer_km - ol.prev_odometer)::INTEGER as km_since_last,
        CASE
            WHEN ol.odometer_km - ol.prev_odometer > 0
            THEN ROUND((ol.liters / (ol.odometer_km - ol.prev_odometer) * 100)::numeric, 2)
            ELSE NULL
        END as consumption_per_100km
    FROM ordered_logs ol;
END;
$$;

-- Grant pristup funkciji
GRANT EXECUTE ON FUNCTION public.calculate_fuel_consumption TO authenticated;

-- Komentar za dokumentaciju
COMMENT ON TABLE public.fuel_logs IS 'Evidencija točenja goriva po vozilima i vozačima';
COMMENT ON COLUMN public.fuel_logs.fuel_type IS 'Tip goriva: diesel, petrol, lpg, electric';
COMMENT ON COLUMN public.fuel_logs.odometer_km IS 'Stanje kilometraže pri točenju';
