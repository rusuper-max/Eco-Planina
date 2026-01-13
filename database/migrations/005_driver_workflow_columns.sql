-- =============================================================================
-- DRIVER WORKFLOW ENHANCEMENT - Add columns for two-step pickup flow
-- Run this in Supabase SQL Editor
-- =============================================================================

-- Add new columns to driver_assignments for two-step workflow
-- picked_up = vozač je pokupio od klijenta
-- delivered = vozač je dostavio/ispraznio

ALTER TABLE public.driver_assignments
ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Store denormalized request data for history (since pickup_requests gets deleted)
ALTER TABLE public.driver_assignments
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS client_address TEXT,
ADD COLUMN IF NOT EXISTS waste_type TEXT,
ADD COLUMN IF NOT EXISTS waste_label TEXT,
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Update status check constraint to include new statuses
-- First drop existing constraint if any
ALTER TABLE public.driver_assignments
DROP CONSTRAINT IF EXISTS driver_assignments_status_check;

-- Add new constraint with all valid statuses
ALTER TABLE public.driver_assignments
ADD CONSTRAINT driver_assignments_status_check
CHECK (status IN ('assigned', 'in_progress', 'picked_up', 'delivered', 'completed', 'cancelled'));

-- Create index for faster history queries
CREATE INDEX IF NOT EXISTS idx_driver_assignments_driver_status
ON public.driver_assignments(driver_id, status);

CREATE INDEX IF NOT EXISTS idx_driver_assignments_delivered_at
ON public.driver_assignments(delivered_at DESC)
WHERE delivered_at IS NOT NULL;

-- =============================================================================
-- DONE!
-- =============================================================================
