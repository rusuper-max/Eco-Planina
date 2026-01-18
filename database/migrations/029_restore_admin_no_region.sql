-- Migration to restore Company Admins to "No Region" status
-- This fixes the Visual Editor issue where "Uprava" disappeared because admins were assigned to a branch.
-- Company Admins should exist hierarchically ABOVE branches (region_id = NULL).

UPDATE users
SET region_id = NULL
WHERE role = 'company_admin'
AND deleted_at IS NULL;
