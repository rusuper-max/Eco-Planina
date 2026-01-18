-- =============================================================================
-- FIX ACTIVITY LOGS RLS POLICIES
-- Dodaj company_admin ulogu i proveri ostale uloge
-- Run this in Supabase SQL Editor
-- =============================================================================

-- Drop staru politiku
DROP POLICY IF EXISTS "Admins and Managers see company logs" ON public.activity_logs;

-- Kreiraj novu sa svim admin/manager ulogama
CREATE POLICY "Admins and Managers see company logs"
ON public.activity_logs FOR SELECT
TO authenticated
USING (
    company_code = (SELECT company_code FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1)
    AND (SELECT role FROM public.users WHERE auth_id = auth.uid() AND deleted_at IS NULL LIMIT 1) IN ('admin', 'manager', 'company_admin')
);

-- Provera: Pogledaj sve uloge u sistemu
-- SELECT DISTINCT role FROM users;

-- =============================================================================
-- DONE! Sada bi company_admin trebalo da vidi logove
-- =============================================================================
