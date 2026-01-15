-- =============================================================================
-- REGION-BASED SETTINGS MIGRATION
-- Run this in Supabase SQL Editor AFTER 009_equipment.sql
-- =============================================================================
-- This migration:
-- 1. Adds region_id to equipment table for branch-specific equipment
-- 2. Creates waste_types table (instead of JSONB in companies)
-- 3. Updates RLS policies for region-based filtering
-- =============================================================================

-- =============================================================================
-- 1. ADD REGION_ID TO EQUIPMENT TABLE
-- =============================================================================

-- Add region_id column (nullable - NULL means company-wide)
ALTER TABLE public.equipment
ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_equipment_region_id ON equipment(region_id) WHERE deleted_at IS NULL;

-- Drop old RLS policy and create new one with region filtering
DROP POLICY IF EXISTS "Users can view company equipment" ON public.equipment;

CREATE POLICY "Users can view company equipment with region" ON public.equipment
FOR SELECT USING (
    deleted_at IS NULL
    AND (
        -- Super admins see all
        get_my_role() IN ('admin', 'developer')
        OR (
            -- Must be same company
            company_code = get_my_company_code()
            AND (
                -- Company admin sees all company equipment
                get_my_role() = 'company_admin'
                OR
                -- Others see: company-wide (region_id IS NULL) OR their region
                region_id IS NULL
                OR region_id = get_my_region_id()
            )
        )
    )
);

-- Update INSERT policy to include region_id
DROP POLICY IF EXISTS "Company admin can create equipment" ON public.equipment;

CREATE POLICY "Managers and admins can create equipment" ON public.equipment
FOR INSERT WITH CHECK (
    (
        get_my_role() = 'company_admin'
        AND company_code = get_my_company_code()
        -- Company admin can create company-wide equipment (region_id = NULL)
    )
    OR (
        get_my_role() = 'manager'
        AND company_code = get_my_company_code()
        -- Manager MUST specify their region_id
        AND region_id = get_my_region_id()
    )
    OR get_my_role() IN ('admin', 'developer')
);

-- Update policy
DROP POLICY IF EXISTS "Company admin can update equipment" ON public.equipment;

CREATE POLICY "Managers and admins can update equipment" ON public.equipment
FOR UPDATE USING (
    (
        get_my_role() = 'company_admin'
        AND company_code = get_my_company_code()
    )
    OR (
        get_my_role() = 'manager'
        AND company_code = get_my_company_code()
        AND region_id = get_my_region_id()
    )
    OR get_my_role() IN ('admin', 'developer')
) WITH CHECK (
    (
        get_my_role() = 'company_admin'
        AND company_code = get_my_company_code()
    )
    OR (
        get_my_role() = 'manager'
        AND company_code = get_my_company_code()
        AND region_id = get_my_region_id()
    )
    OR get_my_role() IN ('admin', 'developer')
);

-- Delete policy
DROP POLICY IF EXISTS "Company admin can delete equipment" ON public.equipment;

CREATE POLICY "Managers and admins can delete equipment" ON public.equipment
FOR DELETE USING (
    (
        get_my_role() = 'company_admin'
        AND company_code = get_my_company_code()
    )
    OR (
        get_my_role() = 'manager'
        AND company_code = get_my_company_code()
        AND region_id = get_my_region_id()
    )
    OR get_my_role() IN ('admin', 'developer')
);

-- =============================================================================
-- 2. CREATE WASTE_TYPES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.waste_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_code VARCHAR(20) NOT NULL,
    region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10) DEFAULT '📦',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT fk_waste_types_company FOREIGN KEY (company_code)
        REFERENCES companies(code) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_waste_types_company_code ON waste_types(company_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_waste_types_region_id ON waste_types(region_id) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.waste_types ENABLE ROW LEVEL SECURITY;

-- SELECT policy - same as equipment
CREATE POLICY "Users can view company waste_types with region" ON public.waste_types
FOR SELECT USING (
    deleted_at IS NULL
    AND (
        get_my_role() IN ('admin', 'developer')
        OR (
            company_code = get_my_company_code()
            AND (
                get_my_role() = 'company_admin'
                OR region_id IS NULL
                OR region_id = get_my_region_id()
            )
        )
    )
);

-- INSERT policy
CREATE POLICY "Managers and admins can create waste_types" ON public.waste_types
FOR INSERT WITH CHECK (
    (
        get_my_role() = 'company_admin'
        AND company_code = get_my_company_code()
    )
    OR (
        get_my_role() = 'manager'
        AND company_code = get_my_company_code()
        AND region_id = get_my_region_id()
    )
    OR get_my_role() IN ('admin', 'developer')
);

-- UPDATE policy
CREATE POLICY "Managers and admins can update waste_types" ON public.waste_types
FOR UPDATE USING (
    (
        get_my_role() = 'company_admin'
        AND company_code = get_my_company_code()
    )
    OR (
        get_my_role() = 'manager'
        AND company_code = get_my_company_code()
        AND region_id = get_my_region_id()
    )
    OR get_my_role() IN ('admin', 'developer')
) WITH CHECK (
    (
        get_my_role() = 'company_admin'
        AND company_code = get_my_company_code()
    )
    OR (
        get_my_role() = 'manager'
        AND company_code = get_my_company_code()
        AND region_id = get_my_region_id()
    )
    OR get_my_role() IN ('admin', 'developer')
);

-- DELETE policy
CREATE POLICY "Managers and admins can delete waste_types" ON public.waste_types
FOR DELETE USING (
    (
        get_my_role() = 'company_admin'
        AND company_code = get_my_company_code()
    )
    OR (
        get_my_role() = 'manager'
        AND company_code = get_my_company_code()
        AND region_id = get_my_region_id()
    )
    OR get_my_role() IN ('admin', 'developer')
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_waste_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS waste_types_updated_at ON public.waste_types;
CREATE TRIGGER waste_types_updated_at
    BEFORE UPDATE ON public.waste_types
    FOR EACH ROW
    EXECUTE FUNCTION update_waste_types_updated_at();

-- =============================================================================
-- 3. MIGRATE EXISTING WASTE_TYPES FROM COMPANIES.waste_types JSONB
-- =============================================================================

-- This migrates existing JSONB waste_types to the new table
-- Only migrate entries that have a valid name
INSERT INTO waste_types (company_code, name, icon, region_id)
SELECT
    c.code as company_code,
    COALESCE(wt->>'name', wt->>'label', 'Nepoznato') as name,
    COALESCE(wt->>'icon', '📦') as icon,
    NULL as region_id  -- Company-wide (no region)
FROM companies c,
     jsonb_array_elements(c.waste_types) as wt
WHERE c.waste_types IS NOT NULL
  AND jsonb_array_length(c.waste_types) > 0
  AND c.deleted_at IS NULL
  AND (wt->>'name' IS NOT NULL OR wt->>'label' IS NOT NULL)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check equipment with region:
-- SELECT e.*, r.name as region_name FROM equipment e LEFT JOIN regions r ON e.region_id = r.id WHERE e.deleted_at IS NULL;

-- Check waste_types migrated:
-- SELECT * FROM waste_types WHERE deleted_at IS NULL;

-- =============================================================================
-- ROLLBACK (if needed)
-- =============================================================================
-- DROP TRIGGER IF EXISTS waste_types_updated_at ON waste_types;
-- DROP FUNCTION IF EXISTS update_waste_types_updated_at();
-- DROP TABLE IF EXISTS waste_types;
-- ALTER TABLE equipment DROP COLUMN IF EXISTS region_id;
