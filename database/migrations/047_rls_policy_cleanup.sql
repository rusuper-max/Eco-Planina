-- =============================================================================
-- RLS POLICY CLEANUP - CONSERVATIVE VERSION
-- Run this in Supabase SQL Editor
-- =============================================================================
-- This migration ONLY removes:
-- 1. Duplicate policies (keeping the more restrictive one)
-- 2. Overly permissive policies with "true" that bypass security
--
-- It does NOT create new policies - just cleans up garbage
-- =============================================================================

-- =============================================================================
-- PICKUP_REQUESTS - Remove overly permissive "true" policies
-- =============================================================================
-- These allow ANYONE to do ANYTHING - security risk!

DROP POLICY IF EXISTS "Temp managers insert" ON public.pickup_requests;
DROP POLICY IF EXISTS "Temp open insert" ON public.pickup_requests;
DROP POLICY IF EXISTS "Users can create requests" ON public.pickup_requests;
DROP POLICY IF EXISTS "Users can delete requests" ON public.pickup_requests;
DROP POLICY IF EXISTS "Users can update requests" ON public.pickup_requests;

-- Keep these (they have proper checks):
-- "Clients can create requests" - checks company_code and user_id
-- "Clients can delete own pending requests" - checks user_id and status
-- "Managers can create requests for clients" - checks role and company
-- "Managers can delete company requests" - checks company and role
-- "Managers can update company requests" - checks company and role
-- "pickup_requests_select" - proper role-based SELECT

-- =============================================================================
-- COMPANIES - Remove duplicate UPDATE policy
-- =============================================================================
-- "Users can update own company" has qual = "true" which is too permissive
-- Keep "Company admin can update own company" which has proper checks

DROP POLICY IF EXISTS "Users can update own company" ON public.companies;

-- =============================================================================
-- WASTE_TYPES - Remove duplicate SELECT policy
-- =============================================================================
-- "Users can read waste types from their company" duplicates "wt_select"
-- Keep "wt_select" which checks deleted_at IS NULL

DROP POLICY IF EXISTS "Users can read waste types from their company" ON public.waste_types;

-- =============================================================================
-- MESSAGES - Remove duplicate policies
-- =============================================================================
-- "Users can read own messages" has qual = "true" (sees everything!)
-- Keep "Users can view own messages" which checks sender/receiver
--
-- "Users can update messages" has qual = "true"
-- Keep "Users can update received messages" which checks receiver_id

DROP POLICY IF EXISTS "Users can read own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages" ON public.messages;

-- =============================================================================
-- USERS - Remove duplicate INSERT policies
-- =============================================================================
-- Both do the same thing, keep one

DROP POLICY IF EXISTS "Anyone can register" ON public.users;
-- Keep "Allow user registration"

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- Run this after migration to see remaining policies:
--
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd;
--
-- Expected removals:
-- - pickup_requests: 5 policies removed (Temp managers insert, Temp open insert,
--                    Users can create/delete/update requests)
-- - companies: 1 policy removed (Users can update own company)
-- - waste_types: 1 policy removed (Users can read waste types from their company)
-- - messages: 2 policies removed (Users can read own messages, Users can update messages)
-- - users: 1 policy removed (Anyone can register)
--
-- Total: ~10 garbage policies removed, all functional policies preserved
-- =============================================================================
