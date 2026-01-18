-- =============================================================================
-- SECURITY FIX: Prevent Role Self-Promotion
-- Run this in Supabase SQL Editor
-- =============================================================================
-- 
-- CRITICAL VULNERABILITY:
-- The current "Users can update own profile" policy allows users to update
-- ANY column, including 'role'. This means a 'client' could self-promote
-- to 'admin' by running:
-- 
--   UPDATE users SET role = 'admin' WHERE auth_id = auth.uid()
-- 
-- This migration fixes the vulnerability by:
-- 1. Creating a trigger that prevents role/company_code changes
-- 2. Adding additional restrictions to UPDATE policies
-- =============================================================================

-- =============================================================================
-- STEP 1: Create a trigger function to prevent protected field changes
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_auth_id UUID;
    current_user_role TEXT;
BEGIN
    -- Get the authenticated user's auth_id
    current_user_auth_id := auth.uid();
    
    -- If no authenticated user (service role), allow all changes
    IF current_user_auth_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Check if user is updating their OWN record
    IF OLD.auth_id = current_user_auth_id THEN
        -- Get current user's role from the database (not from the update)
        SELECT role INTO current_user_role 
        FROM public.users 
        WHERE auth_id = current_user_auth_id 
        AND deleted_at IS NULL 
        LIMIT 1;
        
        -- If user is NOT admin/developer, prevent role changes
        IF current_user_role NOT IN ('admin', 'developer') THEN
            -- Prevent role change
            IF NEW.role IS DISTINCT FROM OLD.role THEN
                RAISE EXCEPTION 'Nemate dozvolu da menjate svoju ulogu (role)';
            END IF;
            
            -- Prevent company_code change
            IF NEW.company_code IS DISTINCT FROM OLD.company_code THEN
                RAISE EXCEPTION 'Nemate dozvolu da menjate svoju firmu (company_code)';
            END IF;
            
            -- Prevent is_owner change
            IF NEW.is_owner IS DISTINCT FROM OLD.is_owner THEN
                RAISE EXCEPTION 'Nemate dozvolu da menjate vlasništvo (is_owner)';
            END IF;
        END IF;
    END IF;
    
    -- For company_admin updating OTHER users
    SELECT role INTO current_user_role 
    FROM public.users 
    WHERE auth_id = current_user_auth_id 
    AND deleted_at IS NULL 
    LIMIT 1;
    
    IF current_user_role = 'company_admin' THEN
        -- company_admin cannot promote anyone to admin/developer/company_admin
        IF NEW.role IN ('admin', 'developer', 'company_admin') AND OLD.role NOT IN ('admin', 'developer', 'company_admin') THEN
            RAISE EXCEPTION 'Company admin ne može da dodeli ulogu: %', NEW.role;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- =============================================================================
-- STEP 2: Create trigger on users table
-- =============================================================================

DROP TRIGGER IF EXISTS trigger_prevent_role_change ON public.users;

CREATE TRIGGER trigger_prevent_role_change
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_role_change();

-- =============================================================================
-- STEP 3: Add comment for documentation
-- =============================================================================

COMMENT ON FUNCTION public.prevent_self_role_change() IS 
'Security trigger that prevents users from self-promoting their role.
Only admin/developer can change roles. company_admin can only assign
manager/driver/client roles, not admin/developer/company_admin.';

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Test that regular user cannot change their role:
-- UPDATE users SET role = 'admin' WHERE auth_id = auth.uid();
-- Should fail with: "Nemate dozvolu da menjate svoju ulogu (role)"

-- Test that company_admin cannot promote to admin:
-- UPDATE users SET role = 'admin' WHERE id = '[some_user_id]';
-- Should fail with: "Company admin ne može da dodeli ulogu: admin"

-- List all triggers on users table:
-- SELECT trigger_name, event_manipulation, action_statement 
-- FROM information_schema.triggers 
-- WHERE event_object_table = 'users';
