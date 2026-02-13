-- =============================================
-- Migracija 080: Fix SECURITY DEFINER na fuel views
-- =============================================
-- Obe view-a su defaultovale na SECURITY DEFINER,
-- što zaobilazi RLS politike na fuel_logs tabeli.
-- Prebacujemo na SECURITY INVOKER da se poštuju RLS pravila.

-- Fix fuel_stats_monthly
CREATE OR REPLACE VIEW public.fuel_stats_monthly
WITH (security_invoker = on)
AS
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

-- Fix fuel_stats_by_vehicle
CREATE OR REPLACE VIEW public.fuel_stats_by_vehicle
WITH (security_invoker = on)
AS
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
