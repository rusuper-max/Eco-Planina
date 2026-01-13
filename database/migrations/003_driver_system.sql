-- =============================================================================
-- DRIVER SYSTEM MIGRATION
-- Run this in Supabase SQL Editor
-- =============================================================================

-- 1. Add 'driver' to valid roles (update check constraint if exists)
-- First, we need to allow 'driver' role in the users table
-- Note: The role column likely already exists, we just need to ensure 'driver' is valid

-- If there's a check constraint on role, we need to update it
-- This may need adjustment based on your existing schema
DO $$
BEGIN
    -- Try to drop existing constraint if it exists
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

-- Add constraint that includes 'driver' role
ALTER TABLE public.users
ADD CONSTRAINT users_role_check
CHECK (role IN ('developer', 'admin', 'manager', 'client', 'driver'));

-- 2. Create driver_assignments table
-- This tracks which requests are assigned to which drivers
CREATE TABLE IF NOT EXISTS public.driver_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES public.pickup_requests(id) ON DELETE CASCADE,
    company_code VARCHAR(20) NOT NULL,
    assigned_by UUID REFERENCES public.users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'cancelled')),
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,

    -- Ensure same request isn't assigned multiple times to active drivers
    UNIQUE(request_id, driver_id, status)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_assignments_driver_id
ON public.driver_assignments(driver_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_driver_assignments_request_id
ON public.driver_assignments(request_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_driver_assignments_company_code
ON public.driver_assignments(company_code) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_driver_assignments_status
ON public.driver_assignments(status) WHERE deleted_at IS NULL;

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_driver_assignments_driver_status
ON public.driver_assignments(driver_id, status) WHERE deleted_at IS NULL;

-- 4. Enable RLS
ALTER TABLE public.driver_assignments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for driver_assignments

-- Drivers can view their own assignments
CREATE POLICY "Drivers can view own assignments"
ON public.driver_assignments FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND (
        driver_id = get_my_user_id()
        OR get_my_role() IN ('manager', 'admin', 'developer')
        OR (company_code = get_my_company_code() AND get_my_role() = 'manager')
    )
);

-- Managers can create assignments for their company
CREATE POLICY "Managers can create assignments"
ON public.driver_assignments FOR INSERT
TO authenticated
WITH CHECK (
    company_code = get_my_company_code()
    AND get_my_role() IN ('manager', 'admin', 'developer')
);

-- Managers can update assignments for their company
CREATE POLICY "Managers can update assignments"
ON public.driver_assignments FOR UPDATE
TO authenticated
USING (
    company_code = get_my_company_code()
    AND get_my_role() IN ('manager', 'admin', 'developer')
);

-- Drivers can update their own assignments (status changes)
CREATE POLICY "Drivers can update own assignments"
ON public.driver_assignments FOR UPDATE
TO authenticated
USING (
    driver_id = get_my_user_id()
    AND get_my_role() = 'driver'
);

-- Managers can delete assignments
CREATE POLICY "Managers can delete assignments"
ON public.driver_assignments FOR DELETE
TO authenticated
USING (
    company_code = get_my_company_code()
    AND get_my_role() IN ('manager', 'admin', 'developer')
);

-- 6. Update users RLS to allow drivers to be viewed by same company
-- (This policy might already exist, but we ensure drivers are included)
DROP POLICY IF EXISTS "Users can view own company members" ON public.users;

CREATE POLICY "Users can view own company members"
ON public.users FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND (
        id = get_my_user_id()
        OR company_code = get_my_company_code()
        OR get_my_role() IN ('admin', 'developer')
    )
);

-- 7. Create function to get company drivers
CREATE OR REPLACE FUNCTION public.get_company_drivers(p_company_code TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    phone TEXT,
    active_assignments BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT
        u.id,
        u.name,
        u.phone,
        COUNT(da.id) FILTER (WHERE da.status IN ('assigned', 'in_progress')) as active_assignments
    FROM public.users u
    LEFT JOIN public.driver_assignments da ON da.driver_id = u.id AND da.deleted_at IS NULL
    WHERE u.company_code = p_company_code
    AND u.role = 'driver'
    AND u.deleted_at IS NULL
    GROUP BY u.id, u.name, u.phone
    ORDER BY u.name;
$$;

-- 8. Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_driver_assignment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_driver_assignment_timestamp ON public.driver_assignments;

CREATE TRIGGER trigger_update_driver_assignment_timestamp
BEFORE UPDATE ON public.driver_assignments
FOR EACH ROW
EXECUTE FUNCTION update_driver_assignment_timestamp();

-- =============================================================================
-- DONE! Now drivers can:
-- 1. Register with role='driver' using company ECO code
-- 2. See only assignments assigned to them
-- 3. Update assignment status (in_progress, completed)
--
-- Managers can:
-- 1. View all drivers in their company
-- 2. Assign requests to drivers
-- 3. Unassign/reassign requests
-- =============================================================================
