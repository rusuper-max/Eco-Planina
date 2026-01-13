-- =============================================================================
-- COMPANY ADMIN ROLE MIGRATION
-- Run this in Supabase SQL Editor
-- =============================================================================
-- This migration:
-- 1. Adds is_owner column to identify company owners
-- 2. Migrates existing company creators to company_admin role
-- 3. Updates RLS policies for company_admin permissions
-- =============================================================================

-- 1. Add is_owner flag to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_owner BOOLEAN DEFAULT FALSE;

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_is_owner ON public.users(is_owner) WHERE is_owner = true;

-- =============================================================================
-- MIGRATE EXISTING COMPANY CREATORS TO COMPANY_ADMIN
-- Uses companies.manager_id to identify who created each company
-- =============================================================================

-- First, let's see how many users will be affected (run this for verification)
-- SELECT u.id, u.name, u.phone, u.role, c.name as company_name
-- FROM users u
-- JOIN companies c ON c.manager_id = u.id
-- WHERE u.deleted_at IS NULL AND c.deleted_at IS NULL;

-- Migrate: Set role to 'company_admin' and is_owner to true
UPDATE public.users
SET 
    role = 'company_admin',
    is_owner = true
WHERE id IN (
    SELECT manager_id 
    FROM public.companies 
    WHERE manager_id IS NOT NULL 
    AND deleted_at IS NULL
)
AND deleted_at IS NULL;

-- =============================================================================
-- UPDATE HELPER FUNCTIONS
-- =============================================================================

-- Update get_my_role to handle company_admin
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1;
$$;

-- New helper function to check if user is company owner
CREATE OR REPLACE FUNCTION public.is_company_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(is_owner, false) FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1;
$$;

-- =============================================================================
-- UPDATE RLS POLICIES FOR USERS TABLE
-- =============================================================================

-- Drop old policies that don't account for company_admin
DROP POLICY IF EXISTS "Company admin can manage company users" ON public.users;

-- Company admin can view all users in their company
CREATE POLICY "Company admin can view company users" ON public.users
FOR SELECT USING (
    get_my_role() = 'company_admin'
    AND company_code = get_my_company_code()
    AND deleted_at IS NULL
);

-- Company admin can update users in their company (except other company_admins)
CREATE POLICY "Company admin can update company users" ON public.users
FOR UPDATE USING (
    get_my_role() = 'company_admin'
    AND company_code = get_my_company_code()
    AND role != 'company_admin'  -- Can't demote other admins
) WITH CHECK (
    company_code = get_my_company_code()
    AND role IN ('manager', 'driver', 'client')  -- Can only set these roles
);

-- Company admin can soft-delete users in their company (except other company_admins)
CREATE POLICY "Company admin can delete company users" ON public.users
FOR DELETE USING (
    get_my_role() = 'company_admin'
    AND company_code = get_my_company_code()
    AND role != 'company_admin'
);

-- =============================================================================
-- UPDATE RLS POLICIES FOR COMPANIES TABLE
-- =============================================================================

-- Drop old policy
DROP POLICY IF EXISTS "Managers can update own company" ON public.companies;

-- Only company_admin can update company settings
CREATE POLICY "Company admin can update own company" ON public.companies
FOR UPDATE USING (
    code = get_my_company_code()
    AND get_my_role() IN ('company_admin', 'admin', 'developer')
);

-- =============================================================================
-- VERIFICATION QUERIES (run after migration)
-- =============================================================================

-- Check migrated users:
-- SELECT id, name, role, is_owner, company_code FROM users WHERE role = 'company_admin';

-- Count by role:
-- SELECT role, COUNT(*) FROM users WHERE deleted_at IS NULL GROUP BY role;

-- =============================================================================
-- ROLLBACK (if needed)
-- =============================================================================
-- UPDATE users SET role = 'manager', is_owner = false WHERE role = 'company_admin';
-- ALTER TABLE users DROP COLUMN is_owner;
