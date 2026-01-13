-- =============================================================================
-- DRIVER SYSTEM MIGRATION
-- Run this in Supabase SQL Editor
-- PREREQUISITE: Run 001_supabase_auth_migration.sql first!
-- =============================================================================

-- 1. Add 'driver' to valid roles (update check constraint if exists)
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
CREATE TABLE IF NOT EXISTS public.driver_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    deleted_at TIMESTAMPTZ DEFAULT NULL
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

CREATE INDEX IF NOT EXISTS idx_driver_assignments_driver_status
ON public.driver_assignments(driver_id, status) WHERE deleted_at IS NULL;

-- 4. Enable RLS
ALTER TABLE public.driver_assignments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for driver_assignments
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Drivers can view own assignments" ON public.driver_assignments;
DROP POLICY IF EXISTS "Managers can create assignments" ON public.driver_assignments;
DROP POLICY IF EXISTS "Managers can update assignments" ON public.driver_assignments;
DROP POLICY IF EXISTS "Drivers can update own assignments" ON public.driver_assignments;
DROP POLICY IF EXISTS "Managers can delete assignments" ON public.driver_assignments;

-- Drivers can view their own assignments, managers can view all in company
CREATE POLICY "Drivers can view own assignments"
ON public.driver_assignments FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND (
        driver_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1)
        OR (SELECT role FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1) IN ('manager', 'admin', 'developer')
        OR (
            company_code = (SELECT company_code FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1)
            AND (SELECT role FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1) = 'manager'
        )
    )
);

-- Managers can create assignments for their company
CREATE POLICY "Managers can create assignments"
ON public.driver_assignments FOR INSERT
TO authenticated
WITH CHECK (
    company_code = (SELECT company_code FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1)
    AND (SELECT role FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1) IN ('manager', 'admin', 'developer')
);

-- Managers can update assignments for their company
CREATE POLICY "Managers can update assignments"
ON public.driver_assignments FOR UPDATE
TO authenticated
USING (
    company_code = (SELECT company_code FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1)
    AND (SELECT role FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1) IN ('manager', 'admin', 'developer')
);

-- Drivers can update their own assignments (status changes)
CREATE POLICY "Drivers can update own assignments"
ON public.driver_assignments FOR UPDATE
TO authenticated
USING (
    driver_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1)
    AND (SELECT role FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1) = 'driver'
);

-- Managers can delete assignments
CREATE POLICY "Managers can delete assignments"
ON public.driver_assignments FOR DELETE
TO authenticated
USING (
    company_code = (SELECT company_code FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1)
    AND (SELECT role FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1) IN ('manager', 'admin', 'developer')
);

-- 6. Update users RLS to allow drivers to be viewed by same company
DROP POLICY IF EXISTS "Users can view own company members" ON public.users;

CREATE POLICY "Users can view own company members"
ON public.users FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND (
        id = (SELECT id FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1)
        OR company_code = (SELECT company_code FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1)
        OR (SELECT role FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1) IN ('admin', 'developer')
    )
);

-- 7. Create trigger to update updated_at
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
