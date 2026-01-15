-- =============================================================================
-- ADD PROCESSED_BY TRACKING TO PROCESSED_REQUESTS
-- Run this in Supabase SQL Editor
-- =============================================================================
-- This migration adds columns to track which manager processed each request
-- Enables Company Admin to see manager performance analytics
-- =============================================================================

-- Add columns for tracking who processed the request
ALTER TABLE public.processed_requests
ADD COLUMN IF NOT EXISTS processed_by_id UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS processed_by_name TEXT;

-- Create index for faster manager analytics queries
CREATE INDEX IF NOT EXISTS idx_processed_requests_processed_by
ON public.processed_requests(processed_by_id)
WHERE deleted_at IS NULL;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'processed_requests' AND column_name LIKE 'processed_by%';
