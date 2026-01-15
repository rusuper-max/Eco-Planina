-- =============================================================================
-- WASTE TYPES CUSTOM IMAGE MIGRATION
-- Run this in Supabase SQL Editor AFTER 012_client_waste_types.sql
-- =============================================================================
-- This migration:
-- 1. Adds custom_image_url column to waste_types table
-- =============================================================================

-- 1. Add custom_image_url column to waste_types table
ALTER TABLE public.waste_types ADD COLUMN IF NOT EXISTS custom_image_url TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.waste_types.custom_image_url IS
'URL to custom image for this waste type. If null, icon emoji is used instead.';

-- =============================================================================
-- VERIFICATION QUERIES (run these after migration)
-- =============================================================================

-- Check column added:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'waste_types' AND column_name = 'custom_image_url';

-- =============================================================================
-- ROLLBACK (if needed)
-- =============================================================================
-- ALTER TABLE public.waste_types DROP COLUMN IF EXISTS custom_image_url;
