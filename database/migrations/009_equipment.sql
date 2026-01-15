-- =============================================================================
-- EQUIPMENT MIGRATION
-- Run this in Supabase SQL Editor AFTER 008_fix_regions_rls.sql
-- =============================================================================
-- This migration:
-- 1. Creates equipment table for company equipment definitions
-- 2. Adds RLS policies for company-based access
-- 3. Replaces localStorage storage with proper database persistence
-- =============================================================================

-- 1. Create equipment table
CREATE TABLE IF NOT EXISTS public.equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    custom_image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT fk_equipment_company FOREIGN KEY (company_code)
        REFERENCES companies(code) ON DELETE CASCADE,
    CONSTRAINT unique_equipment_name_per_company UNIQUE (company_code, name)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_equipment_company_code ON equipment(company_code) WHERE deleted_at IS NULL;

-- =============================================================================
-- RLS POLICIES FOR EQUIPMENT TABLE
-- =============================================================================

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- Users can view equipment from their company
CREATE POLICY "Users can view company equipment" ON public.equipment
FOR SELECT USING (
    (company_code = get_my_company_code() OR get_my_role() IN ('admin', 'developer'))
    AND deleted_at IS NULL
);

-- Only company_admin can create equipment
CREATE POLICY "Company admin can create equipment" ON public.equipment
FOR INSERT WITH CHECK (
    (
        get_my_role() = 'company_admin'
        AND company_code = get_my_company_code()
    )
    OR get_my_role() IN ('admin', 'developer')
);

-- Only company_admin can update equipment
CREATE POLICY "Company admin can update equipment" ON public.equipment
FOR UPDATE USING (
    (
        get_my_role() = 'company_admin'
        AND company_code = get_my_company_code()
    )
    OR get_my_role() IN ('admin', 'developer')
) WITH CHECK (
    (
        get_my_role() = 'company_admin'
        AND company_code = get_my_company_code()
    )
    OR get_my_role() IN ('admin', 'developer')
);

-- Only company_admin can delete equipment
CREATE POLICY "Company admin can delete equipment" ON public.equipment
FOR DELETE USING (
    (
        get_my_role() = 'company_admin'
        AND company_code = get_my_company_code()
    )
    OR get_my_role() IN ('admin', 'developer')
);

-- =============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- =============================================================================

CREATE OR REPLACE FUNCTION update_equipment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS equipment_updated_at ON public.equipment;
CREATE TRIGGER equipment_updated_at
    BEFORE UPDATE ON public.equipment
    FOR EACH ROW
    EXECUTE FUNCTION update_equipment_updated_at();

-- =============================================================================
-- VERIFICATION QUERIES (run these after migration)
-- =============================================================================

-- Check equipment table created:
-- SELECT * FROM equipment;

-- Check indexes created:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'equipment';

-- Test RLS as company_admin:
-- SELECT * FROM equipment WHERE company_code = 'ECO-XXXX';

-- =============================================================================
-- ROLLBACK (if needed)
-- =============================================================================
-- DROP TRIGGER IF EXISTS equipment_updated_at ON equipment;
-- DROP FUNCTION IF EXISTS update_equipment_updated_at();
-- DROP POLICY IF EXISTS "Users can view company equipment" ON equipment;
-- DROP POLICY IF EXISTS "Company admin can create equipment" ON equipment;
-- DROP POLICY IF EXISTS "Company admin can update equipment" ON equipment;
-- DROP POLICY IF EXISTS "Company admin can delete equipment" ON equipment;
-- DROP TABLE IF EXISTS equipment;
