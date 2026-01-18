-- =============================================================================
-- ADD DEFAULT WASTE TYPES TO EXISTING COMPANIES
-- Companies that don't have any waste types will get default ones
-- =============================================================================

-- Insert default waste types for companies that don't have any
INSERT INTO public.waste_types (name, icon, company_code)
SELECT 'Karton', '📦', c.code
FROM public.companies c
WHERE c.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM public.waste_types wt
    WHERE wt.company_code = c.code
    AND wt.deleted_at IS NULL
);

INSERT INTO public.waste_types (name, icon, company_code)
SELECT 'Plastika', '♻️', c.code
FROM public.companies c
WHERE c.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM public.waste_types wt
    WHERE wt.company_code = c.code
    AND wt.deleted_at IS NULL
    AND wt.name = 'Plastika'
);

INSERT INTO public.waste_types (name, icon, company_code)
SELECT 'Staklo', '🍾', c.code
FROM public.companies c
WHERE c.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM public.waste_types wt
    WHERE wt.company_code = c.code
    AND wt.deleted_at IS NULL
    AND wt.name = 'Staklo'
);

-- Verify: Show companies and their waste type counts
-- SELECT c.code, c.name, COUNT(wt.id) as waste_type_count
-- FROM companies c
-- LEFT JOIN waste_types wt ON wt.company_code = c.code AND wt.deleted_at IS NULL
-- WHERE c.deleted_at IS NULL
-- GROUP BY c.code, c.name;
