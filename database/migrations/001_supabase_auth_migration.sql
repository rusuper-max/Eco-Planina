-- =============================================================================
-- SUPABASE AUTH MIGRATION - STEP 1: Schema Changes
-- Run this in Supabase SQL Editor
-- =============================================================================

-- 1. Add auth_id column to link users table with Supabase Auth
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Create index on auth_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);

-- 3. Add soft delete columns to all main tables
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.pickup_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.processed_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 4. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_users_company_code ON public.users(company_code);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_company_code ON public.pickup_requests(company_code);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_user_id ON public.pickup_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_status ON public.pickup_requests(status);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_created_at ON public.pickup_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_processed_requests_company_code ON public.processed_requests(company_code);
CREATE INDEX IF NOT EXISTS idx_processed_requests_client_id ON public.processed_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_processed_requests_processed_at ON public.processed_requests(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_company_code ON public.messages(company_code);
CREATE INDEX IF NOT EXISTS idx_companies_code ON public.companies(code);

-- 5. Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pickup_requests_company_status
ON public.pickup_requests(company_code, status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_company_role
ON public.users(company_code, role) WHERE deleted_at IS NULL;

-- =============================================================================
-- STEP 2: Create helper function to get current user's company_code
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_company_code()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT company_code FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1;
$$;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1;
$$;

-- Helper function to get current user's id (from users table, not auth)
CREATE OR REPLACE FUNCTION public.get_my_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1;
$$;

-- =============================================================================
-- STEP 3: Drop existing RLS policies (they use USING(true))
-- =============================================================================

-- Users table
DROP POLICY IF EXISTS "Users can view own company" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.users;
DROP POLICY IF EXISTS "Enable update for all users" ON public.users;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.users;

-- Pickup requests
DROP POLICY IF EXISTS "Users can view own company requests" ON public.pickup_requests;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.pickup_requests;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.pickup_requests;
DROP POLICY IF EXISTS "Enable update for all users" ON public.pickup_requests;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.pickup_requests;

-- Processed requests
DROP POLICY IF EXISTS "Enable read access for all users" ON public.processed_requests;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.processed_requests;
DROP POLICY IF EXISTS "Enable update for all users" ON public.processed_requests;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.processed_requests;

-- Messages
DROP POLICY IF EXISTS "Enable read access for all users" ON public.messages;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.messages;
DROP POLICY IF EXISTS "Enable update for all users" ON public.messages;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.messages;

-- Companies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.companies;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.companies;
DROP POLICY IF EXISTS "Enable update for all users" ON public.companies;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.companies;

-- Master codes
DROP POLICY IF EXISTS "Enable read access for all users" ON public.master_codes;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.master_codes;
DROP POLICY IF EXISTS "Enable update for all users" ON public.master_codes;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.master_codes;

-- =============================================================================
-- STEP 4: Create proper RLS policies
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_codes ENABLE ROW LEVEL SECURITY;

-- =====================
-- USERS TABLE POLICIES
-- =====================

-- Admins can see all users
CREATE POLICY "Admins can view all users" ON public.users
FOR SELECT USING (
  get_my_role() IN ('admin', 'developer')
  AND deleted_at IS NULL
);

-- Users can see others in their company
CREATE POLICY "Users can view own company members" ON public.users
FOR SELECT USING (
  company_code = get_my_company_code()
  AND deleted_at IS NULL
);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
FOR UPDATE USING (
  auth_id = auth.uid()
) WITH CHECK (
  auth_id = auth.uid()
);

-- Admins can update any user
CREATE POLICY "Admins can update any user" ON public.users
FOR UPDATE USING (
  get_my_role() IN ('admin', 'developer')
);

-- Admins can delete users (soft delete)
CREATE POLICY "Admins can delete users" ON public.users
FOR DELETE USING (
  get_my_role() IN ('admin', 'developer')
);

-- Allow insert during registration (handled by service role in Edge Function)
CREATE POLICY "Service role can insert users" ON public.users
FOR INSERT WITH CHECK (true);

-- ==========================
-- PICKUP REQUESTS POLICIES
-- ==========================

-- Users can see requests from their company
CREATE POLICY "Users can view company requests" ON public.pickup_requests
FOR SELECT USING (
  (company_code = get_my_company_code() OR get_my_role() IN ('admin', 'developer'))
  AND deleted_at IS NULL
);

-- Clients can create requests for their company
CREATE POLICY "Clients can create requests" ON public.pickup_requests
FOR INSERT WITH CHECK (
  company_code = get_my_company_code()
  AND user_id = get_my_user_id()
);

-- Managers can update requests in their company
CREATE POLICY "Managers can update company requests" ON public.pickup_requests
FOR UPDATE USING (
  company_code = get_my_company_code()
  AND get_my_role() IN ('manager', 'admin', 'developer')
);

-- Managers can delete requests in their company
CREATE POLICY "Managers can delete company requests" ON public.pickup_requests
FOR DELETE USING (
  company_code = get_my_company_code()
  AND get_my_role() IN ('manager', 'admin', 'developer')
);

-- =============================
-- PROCESSED REQUESTS POLICIES
-- =============================

-- Users can see processed requests from their company
CREATE POLICY "Users can view company processed requests" ON public.processed_requests
FOR SELECT USING (
  (company_code = get_my_company_code() OR get_my_role() IN ('admin', 'developer'))
  AND deleted_at IS NULL
);

-- Managers can create processed requests
CREATE POLICY "Managers can create processed requests" ON public.processed_requests
FOR INSERT WITH CHECK (
  company_code = get_my_company_code()
  AND get_my_role() IN ('manager', 'admin', 'developer')
);

-- Managers can delete processed requests
CREATE POLICY "Managers can delete processed requests" ON public.processed_requests
FOR DELETE USING (
  company_code = get_my_company_code()
  AND get_my_role() IN ('manager', 'admin', 'developer')
);

-- ====================
-- MESSAGES POLICIES
-- ====================

-- Users can see messages they sent or received
CREATE POLICY "Users can view own messages" ON public.messages
FOR SELECT USING (
  (sender_id = get_my_user_id() OR receiver_id = get_my_user_id())
  AND deleted_at IS NULL
);

-- Users can send messages
CREATE POLICY "Users can send messages" ON public.messages
FOR INSERT WITH CHECK (
  sender_id = get_my_user_id()
);

-- Users can update (mark as read) their received messages
CREATE POLICY "Users can update received messages" ON public.messages
FOR UPDATE USING (
  receiver_id = get_my_user_id()
);

-- Users can delete their own conversations
CREATE POLICY "Users can delete own messages" ON public.messages
FOR DELETE USING (
  sender_id = get_my_user_id() OR receiver_id = get_my_user_id()
);

-- ====================
-- COMPANIES POLICIES
-- ====================

-- Users can see their own company
CREATE POLICY "Users can view own company" ON public.companies
FOR SELECT USING (
  (code = get_my_company_code() OR get_my_role() IN ('admin', 'developer'))
  AND deleted_at IS NULL
);

-- Managers can update their company
CREATE POLICY "Managers can update own company" ON public.companies
FOR UPDATE USING (
  code = get_my_company_code()
  AND get_my_role() IN ('manager', 'admin', 'developer')
);

-- Admins can delete companies
CREATE POLICY "Admins can delete companies" ON public.companies
FOR DELETE USING (
  get_my_role() IN ('admin', 'developer')
);

-- Allow insert during registration (service role)
CREATE POLICY "Service role can insert companies" ON public.companies
FOR INSERT WITH CHECK (true);

-- =======================
-- MASTER CODES POLICIES
-- =======================

-- Only admins can see master codes
CREATE POLICY "Admins can view master codes" ON public.master_codes
FOR SELECT USING (
  get_my_role() IN ('admin', 'developer')
);

-- Only admins can manage master codes
CREATE POLICY "Admins can insert master codes" ON public.master_codes
FOR INSERT WITH CHECK (
  get_my_role() IN ('admin', 'developer')
);

CREATE POLICY "Admins can update master codes" ON public.master_codes
FOR UPDATE USING (
  get_my_role() IN ('admin', 'developer')
);

CREATE POLICY "Admins can delete master codes" ON public.master_codes
FOR DELETE USING (
  get_my_role() IN ('admin', 'developer')
);

-- Special policy: Allow checking master code during registration (before auth)
-- This needs to be public for registration flow
CREATE POLICY "Anyone can check available master codes" ON public.master_codes
FOR SELECT USING (
  status = 'available'
);
