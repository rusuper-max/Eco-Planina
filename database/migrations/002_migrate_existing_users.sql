-- =============================================================================
-- USER MIGRATION SCRIPT
-- Run this AFTER deploying the Edge Function and new AuthContext
-- This creates Supabase Auth users for all existing users
-- =============================================================================

-- IMPORTANT: This script should be run through a secure Edge Function
-- that has access to the service role key, NOT directly in SQL Editor
-- because it needs to create auth users with passwords

-- Instead, use this Edge Function approach:

/*
MIGRATION STEPS:

1. First, deploy the Edge Function (supabase/functions/migrate-users/index.ts)

2. Call the Edge Function to migrate users:
   curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/migrate-users \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json"

3. After migration, you can optionally remove the password column:
   ALTER TABLE public.users DROP COLUMN IF EXISTS password;

The Edge Function will:
- Loop through all users without auth_id
- Create a Supabase Auth user for each
- Link the auth_id back to public.users
- Use their existing password (hashed by Supabase Auth)
*/

-- After migration is complete, run this to verify:
SELECT
    COUNT(*) as total_users,
    COUNT(auth_id) as migrated_users,
    COUNT(*) - COUNT(auth_id) as pending_migration
FROM public.users
WHERE deleted_at IS NULL;

-- Check for any users that still need migration:
SELECT id, name, phone, role, company_code
FROM public.users
WHERE auth_id IS NULL AND deleted_at IS NULL;
