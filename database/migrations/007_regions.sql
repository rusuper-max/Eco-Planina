-- =============================================================================
-- REGIONS MIGRATION
-- Run this in Supabase SQL Editor AFTER 006_company_admin_role.sql
-- =============================================================================
-- This migration:
-- 1. Creates regions table for company branches/locations
-- 2. Adds region_id to users and pickup_requests
-- 3. Updates RLS policies for region-based filtering
-- =============================================================================

-- 1. Create regions table
CREATE TABLE IF NOT EXISTS public.regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT fk_regions_company FOREIGN KEY (company_code) 
        REFERENCES companies(code) ON DELETE CASCADE,
    CONSTRAINT unique_region_name_per_company UNIQUE (company_code, name)
);

-- 2. Add region_id to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id);

-- 3. Add region_id to pickup_requests
ALTER TABLE public.pickup_requests ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id);

-- 4. Add region_id to processed_requests (for history)
ALTER TABLE public.processed_requests ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_regions_company_code ON regions(company_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_region_id ON users(region_id) WHERE region_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pickup_requests_region_id ON pickup_requests(region_id) WHERE region_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_processed_requests_region_id ON processed_requests(region_id) WHERE region_id IS NOT NULL;

-- =============================================================================
-- RLS POLICIES FOR REGIONS TABLE
-- =============================================================================

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

-- Company admin and super admins can view all regions in their company
CREATE POLICY "Users can view company regions" ON public.regions
FOR SELECT USING (
    (company_code = get_my_company_code() OR get_my_role() IN ('admin', 'developer'))
    AND deleted_at IS NULL
);

-- Only company_admin can create regions
CREATE POLICY "Company admin can create regions" ON public.regions
FOR INSERT WITH CHECK (
    company_code = get_my_company_code()
    AND get_my_role() IN ('company_admin', 'admin', 'developer')
);

-- Only company_admin can update regions
CREATE POLICY "Company admin can update regions" ON public.regions
FOR UPDATE USING (
    company_code = get_my_company_code()
    AND get_my_role() IN ('company_admin', 'admin', 'developer')
);

-- Only company_admin can delete (soft) regions
CREATE POLICY "Company admin can delete regions" ON public.regions
FOR DELETE USING (
    company_code = get_my_company_code()
    AND get_my_role() IN ('company_admin', 'admin', 'developer')
);

-- =============================================================================
-- UPDATE PICKUP_REQUESTS RLS FOR REGION FILTERING
-- =============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view company requests" ON public.pickup_requests;

-- New policy: Managers see only their region, company_admin sees all
CREATE POLICY "Users can view requests with region filter" ON public.pickup_requests
FOR SELECT USING (
    deleted_at IS NULL
    AND (
        -- Super admins see everything
        get_my_role() IN ('admin', 'developer')
        OR (
            -- Company members see their company
            company_code = get_my_company_code()
            AND (
                -- Company admin sees all regions
                get_my_role() = 'company_admin'
                OR
                -- Managers/drivers see their region or unassigned
                (get_my_role() IN ('manager', 'driver') AND (
                    region_id IS NULL 
                    OR region_id = (SELECT region_id FROM users WHERE auth_id = auth.uid() LIMIT 1)
                ))
                OR
                -- Clients see their own requests
                user_id = get_my_user_id()
            )
        )
    )
);

-- =============================================================================
-- UPDATE USERS RLS FOR REGION FILTERING
-- =============================================================================

-- Drop old company view policy
DROP POLICY IF EXISTS "Users can view own company members" ON public.users;

-- New policy: Managers see only their region colleagues
CREATE POLICY "Users can view company members with region" ON public.users
FOR SELECT USING (
    deleted_at IS NULL
    AND (
        -- Super admins see all
        get_my_role() IN ('admin', 'developer')
        OR (
            -- Company members
            company_code = get_my_company_code()
            AND (
                -- Company admin sees all in company
                get_my_role() = 'company_admin'
                OR
                -- Others see their region or company admins
                role = 'company_admin'
                OR region_id IS NULL
                OR region_id = (SELECT region_id FROM users WHERE auth_id = auth.uid() LIMIT 1)
            )
        )
    )
);

-- =============================================================================
-- HELPER FUNCTION: Get user's region ID
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_region_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT region_id FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1;
$$;

-- =============================================================================
-- VERIFICATION QUERIES (run these after migration)
-- =============================================================================

-- Check regions table created:
-- SELECT * FROM regions;

-- Check indexes created:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'regions';

-- Test RLS as company_admin (should see all):
-- SET ROLE authenticated; SET request.jwt.claim.sub = '<company_admin_auth_id>';
-- SELECT * FROM pickup_requests WHERE company_code = 'ECO-XXXX';

-- =============================================================================
-- ROLLBACK (if needed)
-- =============================================================================
-- DROP POLICY IF EXISTS "Users can view requests with region filter" ON pickup_requests;
-- DROP POLICY IF EXISTS "Users can view company members with region" ON users;
-- ALTER TABLE pickup_requests DROP COLUMN region_id;
-- ALTER TABLE processed_requests DROP COLUMN region_id;
-- ALTER TABLE users DROP COLUMN region_id;
-- DROP TABLE regions;
