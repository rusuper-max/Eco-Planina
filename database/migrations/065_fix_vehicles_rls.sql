-- =============================================================================
-- FIX: Vehicles RLS Policies
-- =============================================================================
-- Problem: vehicles_insert policy blocks inserts
-- Solution: Recreate policies (same pattern as 062_fix_inventory_rls.sql)
-- =============================================================================

-- Drop existing vehicle policies
DROP POLICY IF EXISTS "vehicles_select" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_insert" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_update" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_delete" ON public.vehicles;

-- =============================================================================
-- Recreate policies using get_current_user_info()
-- =============================================================================

-- SELECT: svi iz firme vide vozila
CREATE POLICY "vehicles_select" ON public.vehicles
FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND (
        company_code = (get_current_user_info()).company_code
        OR (get_current_user_info()).role IN ('admin', 'developer')
    )
);

-- INSERT: manager, supervisor, company_admin mogu kreirati
CREATE POLICY "vehicles_insert" ON public.vehicles
FOR INSERT TO authenticated
WITH CHECK (
    company_code = (get_current_user_info()).company_code
    AND (get_current_user_info()).role IN ('manager', 'supervisor', 'company_admin', 'admin', 'developer')
);

-- UPDATE: manager, supervisor, company_admin mogu ažurirati
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

-- DELETE: manager, supervisor, company_admin mogu brisati
CREATE POLICY "vehicles_delete" ON public.vehicles
FOR DELETE TO authenticated
USING (
    company_code = (get_current_user_info()).company_code
    AND (get_current_user_info()).role IN ('manager', 'supervisor', 'company_admin', 'admin', 'developer')
);

-- =============================================================================
-- Vehicle Drivers policies
-- =============================================================================
DROP POLICY IF EXISTS "vehicle_drivers_select" ON public.vehicle_drivers;
DROP POLICY IF EXISTS "vehicle_drivers_insert" ON public.vehicle_drivers;
DROP POLICY IF EXISTS "vehicle_drivers_update" ON public.vehicle_drivers;
DROP POLICY IF EXISTS "vehicle_drivers_delete" ON public.vehicle_drivers;

-- SELECT: svi iz firme vide dodele
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

-- INSERT: manager, supervisor, company_admin mogu dodeljivati
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

-- UPDATE
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
);

-- DELETE
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
