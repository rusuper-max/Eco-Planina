-- =====================================================
-- EcoPlanina Admin System - Database Schema
-- =====================================================
-- Run this script in Supabase SQL Editor
-- =====================================================

-- 1. Create master_codes table
CREATE TABLE IF NOT EXISTS master_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_by_company UUID REFERENCES companies(id),
  pib VARCHAR(20),
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'used')),
  note TEXT
);

-- 2. Add columns to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS pib VARCHAR(20);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS master_code_id UUID REFERENCES master_codes(id);

-- 3. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_master_codes_code ON master_codes(code);
CREATE INDEX IF NOT EXISTS idx_master_codes_status ON master_codes(status);
CREATE INDEX IF NOT EXISTS idx_companies_pib ON companies(pib);

-- 4. Enable RLS on master_codes
ALTER TABLE master_codes ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for master_codes

-- Admin/GOD can view all codes
CREATE POLICY "Admins can view all master codes"
ON master_codes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('god', 'admin')
  )
);

-- Admin/GOD can insert new codes
CREATE POLICY "Admins can create master codes"
ON master_codes FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('god', 'admin')
  )
);

-- Admin/GOD can update codes
CREATE POLICY "Admins can update master codes"
ON master_codes FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('god', 'admin')
  )
);

-- Anyone can check if code exists (for registration)
CREATE POLICY "Anyone can check code availability"
ON master_codes FOR SELECT
TO anon, authenticated
USING (status = 'available');

-- =====================================================
-- IMPORTANT: Create your GOD account manually
-- =====================================================
-- Run this after creating the tables, replacing values:
--
-- INSERT INTO users (name, phone, password, role, company_code)
-- VALUES ('Your Name', 'your_phone', 'your_password', 'god', NULL);
--
-- =====================================================
