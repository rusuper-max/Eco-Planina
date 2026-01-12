# Supabase Auth Migration Guide

## Overview
This migration moves from plain-text password authentication to secure Supabase Auth with:
- Automatic password hashing (bcrypt)
- Proper RLS policies based on `auth.uid()`
- Soft deletes for audit trail
- Database indexes for performance

## Migration Steps

### Step 1: Run Database Migration SQL
1. Go to Supabase Dashboard → SQL Editor
2. Copy and run `migrations/001_supabase_auth_migration.sql`
3. This will:
   - Add `auth_id` column to users table
   - Add `deleted_at` columns for soft deletes
   - Create performance indexes
   - Set up proper RLS policies

### Step 2: Deploy Edge Functions
```bash
# Install Supabase CLI if not already
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy Edge Functions
supabase functions deploy auth-register
supabase functions deploy migrate-users
```

### Step 3: Update Environment Variables
Add to your `.env` or Vercel environment:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Step 4: Migrate Existing Users
Call the migration Edge Function with service role key:
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/migrate-users \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### Step 5: Switch to New AuthContext
1. Rename `AuthContext.jsx` to `AuthContext.old.jsx`
2. Rename `AuthContext.new.jsx` to `AuthContext.jsx`
3. Deploy new frontend

### Step 6: Verify Migration
Run in SQL Editor:
```sql
SELECT
    COUNT(*) as total_users,
    COUNT(auth_id) as migrated_users,
    COUNT(*) - COUNT(auth_id) as pending_migration
FROM public.users
WHERE deleted_at IS NULL;
```

### Step 7: (Optional) Remove Password Column
After confirming all users are migrated:
```sql
ALTER TABLE public.users DROP COLUMN IF EXISTS password;
```

## Rollback Plan
If something goes wrong:
1. Rename `AuthContext.jsx` back to `AuthContext.new.jsx`
2. Rename `AuthContext.old.jsx` to `AuthContext.jsx`
3. Users with auth_id will still work with legacy system (both check exists)

## Security Improvements
- Passwords now hashed with bcrypt (via Supabase Auth)
- RLS policies enforce company-based data isolation
- Soft deletes maintain audit trail
- Admin functions protected by role checks

## Performance Improvements
- Indexes on: company_code, user_id, status, created_at
- Composite indexes for common queries
- Soft delete queries optimized with partial indexes
