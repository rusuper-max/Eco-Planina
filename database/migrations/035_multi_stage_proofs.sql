-- Migration: Multi-Stage Proof System
-- Description: Add columns to driver_assignments for pickup/delivery proofs and driver weight

-- Add proof URL columns
ALTER TABLE public.driver_assignments ADD COLUMN IF NOT EXISTS pickup_proof_url TEXT;
ALTER TABLE public.driver_assignments ADD COLUMN IF NOT EXISTS delivery_proof_url TEXT;

-- Add driver weight columns
ALTER TABLE public.driver_assignments ADD COLUMN IF NOT EXISTS driver_weight DECIMAL(10,2);
ALTER TABLE public.driver_assignments ADD COLUMN IF NOT EXISTS driver_weight_unit VARCHAR(10) DEFAULT 'kg';

-- Add comments for documentation
COMMENT ON COLUMN public.driver_assignments.pickup_proof_url IS 'Photo proof uploaded by driver when marking request as picked up';
COMMENT ON COLUMN public.driver_assignments.delivery_proof_url IS 'Photo proof uploaded by driver when marking request as delivered';
COMMENT ON COLUMN public.driver_assignments.driver_weight IS 'Weight entered by driver at delivery (can be overridden by manager)';
COMMENT ON COLUMN public.driver_assignments.driver_weight_unit IS 'Unit for driver weight: kg or t';
