-- =============================================================================
-- ENSURE DEFAULT REGION FOR ALL COMPANIES
-- Every company must have at least one region (filijala)
-- =============================================================================

-- Create default region for companies that don't have any
INSERT INTO public.regions (name, company_code)
SELECT
    c.name,  -- Use company name as default region name
    c.code
FROM public.companies c
WHERE c.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM public.regions r
    WHERE r.company_code = c.code
    AND r.deleted_at IS NULL
);

-- Assign users without region to their company's first region
UPDATE public.users u
SET region_id = (
    SELECT r.id
    FROM public.regions r
    WHERE r.company_code = u.company_code
    AND r.deleted_at IS NULL
    ORDER BY r.created_at ASC
    LIMIT 1
)
WHERE u.region_id IS NULL
AND u.company_code IS NOT NULL
AND u.role != 'company_admin'  -- company_admin sees all regions, doesn't need assignment
AND u.deleted_at IS NULL;

-- Verify: Show companies without regions (should be 0)
-- SELECT c.code, c.name
-- FROM companies c
-- WHERE c.deleted_at IS NULL
-- AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.company_code = c.code AND r.deleted_at IS NULL);

-- Verify: Show users without region (should be 0, except company_admins)
-- SELECT u.id, u.name, u.role, u.company_code
-- FROM users u
-- WHERE u.region_id IS NULL
-- AND u.company_code IS NOT NULL
-- AND u.role != 'company_admin'
-- AND u.deleted_at IS NULL;
