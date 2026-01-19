-- =============================================================================
-- Driver Location Tracking
-- Stores real-time location updates from driver mobile apps
-- =============================================================================

-- Create driver_locations table
CREATE TABLE IF NOT EXISTS public.driver_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_code TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2), -- GPS accuracy in meters
    heading DECIMAL(5, 2), -- Direction in degrees (0-360)
    speed DECIMAL(10, 2), -- Speed in m/s
    altitude DECIMAL(10, 2), -- Altitude in meters
    battery_level INTEGER, -- Battery percentage (0-100)
    is_charging BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Only keep one record per driver (upsert pattern)
    CONSTRAINT unique_driver_location UNIQUE (driver_id)
);

-- Create index for fast lookups by company
CREATE INDEX IF NOT EXISTS idx_driver_locations_company
ON public.driver_locations(company_code);

-- Create index for finding recent updates
CREATE INDEX IF NOT EXISTS idx_driver_locations_updated
ON public.driver_locations(updated_at DESC);

-- =============================================================================
-- Function to update driver location (upsert)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_driver_location(
    p_driver_id UUID,
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_accuracy DECIMAL DEFAULT NULL,
    p_heading DECIMAL DEFAULT NULL,
    p_speed DECIMAL DEFAULT NULL,
    p_altitude DECIMAL DEFAULT NULL,
    p_battery_level INTEGER DEFAULT NULL,
    p_is_charging BOOLEAN DEFAULT FALSE
)
RETURNS public.driver_locations
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_code TEXT;
    v_result public.driver_locations;
BEGIN
    -- Get driver's company code
    SELECT company_code INTO v_company_code
    FROM public.users
    WHERE id = p_driver_id AND deleted_at IS NULL;

    IF v_company_code IS NULL THEN
        RAISE EXCEPTION 'Driver not found or deleted';
    END IF;

    -- Upsert location
    INSERT INTO public.driver_locations (
        driver_id,
        company_code,
        latitude,
        longitude,
        accuracy,
        heading,
        speed,
        altitude,
        battery_level,
        is_charging,
        updated_at
    ) VALUES (
        p_driver_id,
        v_company_code,
        p_latitude,
        p_longitude,
        p_accuracy,
        p_heading,
        p_speed,
        p_altitude,
        p_battery_level,
        p_is_charging,
        NOW()
    )
    ON CONFLICT (driver_id)
    DO UPDATE SET
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        accuracy = EXCLUDED.accuracy,
        heading = EXCLUDED.heading,
        speed = EXCLUDED.speed,
        altitude = EXCLUDED.altitude,
        battery_level = EXCLUDED.battery_level,
        is_charging = EXCLUDED.is_charging,
        updated_at = NOW()
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$;

-- =============================================================================
-- RLS Policies for driver_locations
-- =============================================================================

ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Drivers can read/write their own location
CREATE POLICY "Drivers can manage own location"
ON public.driver_locations
FOR ALL
TO authenticated
USING (driver_id = auth.uid())
WITH CHECK (driver_id = auth.uid());

-- Managers and company_admins can view locations in their company
CREATE POLICY "Company staff can view driver locations"
ON public.driver_locations
FOR SELECT
TO authenticated
USING (
    company_code = public.get_my_company_code()
    AND public.get_my_role() IN ('manager', 'company_admin', 'admin', 'developer')
);

-- =============================================================================
-- Real-time subscriptions
-- Enable realtime for this table
-- =============================================================================

-- Note: Run this in Supabase dashboard SQL editor:
-- ALTER PUBLICATION supabase_realtime ADD TABLE driver_locations;

-- Or use this if publication exists:
DO $$
BEGIN
    -- Try to add table to realtime publication
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations';
EXCEPTION
    WHEN duplicate_object THEN
        -- Table already in publication, ignore
        NULL;
    WHEN undefined_object THEN
        -- Publication doesn't exist, create it
        EXECUTE 'CREATE PUBLICATION supabase_realtime FOR TABLE public.driver_locations';
END;
$$;

-- =============================================================================
-- Location history table (optional - for analytics)
-- Stores hourly snapshots of driver locations
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.driver_location_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_code TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying history by driver and date
CREATE INDEX IF NOT EXISTS idx_driver_location_history_driver_date
ON public.driver_location_history(driver_id, recorded_at DESC);

-- Partition by month for better performance (optional)
-- This would require more complex setup

-- =============================================================================
-- Function to archive location (called periodically)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.archive_driver_locations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Copy current locations to history
    INSERT INTO public.driver_location_history (driver_id, company_code, latitude, longitude, recorded_at)
    SELECT driver_id, company_code, latitude, longitude, updated_at
    FROM public.driver_locations
    WHERE updated_at > NOW() - INTERVAL '1 hour';

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN v_count;
END;
$$;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE public.driver_locations IS
'Real-time location tracking for drivers. One record per driver, updated via upsert.';

COMMENT ON TABLE public.driver_location_history IS
'Historical snapshots of driver locations for analytics and route reconstruction.';

COMMENT ON FUNCTION public.update_driver_location IS
'Updates driver location using upsert pattern. Called from mobile app.';
