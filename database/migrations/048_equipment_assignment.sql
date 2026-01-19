-- =============================================================================
-- EQUIPMENT ASSIGNMENT - Add assigned_to column
-- Run this in Supabase SQL Editor
-- =============================================================================
-- This migration adds the ability to assign equipment to clients
-- =============================================================================

-- 1. Add assigned_to column (references users table)
ALTER TABLE public.equipment
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_equipment_assigned_to ON equipment(assigned_to) WHERE deleted_at IS NULL;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- SELECT id, name, assigned_to FROM equipment;
