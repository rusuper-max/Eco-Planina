-- =============================================================================
-- USER SETTINGS - Add settings column for user preferences
-- Run this in Supabase SQL Editor
-- =============================================================================

-- Add settings JSONB column to users table for storing user preferences
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::JSONB;

-- Add comment explaining the column
COMMENT ON COLUMN public.users.settings IS 'User preferences and settings stored as JSONB. Example: {"allow_bulk_map_assignment": true}';

-- Create index for faster JSONB queries if needed
CREATE INDEX IF NOT EXISTS idx_users_settings ON public.users USING gin (settings);

-- =============================================================================
-- DONE! Now users can have custom settings stored in the settings column
-- Example settings:
--   - allow_bulk_map_assignment: boolean (default true) - whether to show bulk assign modal when clicking clusters on map
-- =============================================================================
