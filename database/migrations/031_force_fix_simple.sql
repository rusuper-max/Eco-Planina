-- SIMPLIFIED FORCE FIX
-- No loops, just direct Set-Based SQL operations to guarantee consistency.

-- 1. Create missing regions for ANY company that has none.
-- (This handles "drugarov nalog" if previous scripts missed it)
INSERT INTO regions (company_code, name)
SELECT c.code, c.name 
FROM companies c
WHERE c.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM regions r 
    WHERE r.company_code = c.code 
    AND r.deleted_at IS NULL
);

-- 2. Force Assign ALL "homeless" users to their company's first region.
-- (Excluding Company Admins who should verify as "Uprava")
UPDATE users u
SET region_id = (
    SELECT r.id 
    FROM regions r 
    WHERE r.company_code = u.company_code 
    AND r.deleted_at IS NULL 
    ORDER BY r.created_at ASC 
    LIMIT 1
)
WHERE u.region_id IS NULL -- They have no home
AND u.role != 'company_admin' -- Don't touch the boss
AND u.deleted_at IS NULL -- Only active users
AND u.company_code IS NOT NULL; -- Must belong to a company

-- 3. Cleanup: Check for users pointing to deleted regions and fix them too
UPDATE users u
SET region_id = (
    SELECT r.id 
    FROM regions r 
    WHERE r.company_code = u.company_code 
    AND r.deleted_at IS NULL 
    ORDER BY r.created_at ASC 
    LIMIT 1
)
WHERE u.region_id IS NOT NULL 
AND u.role != 'company_admin'
AND u.deleted_at IS NULL
AND NOT EXISTS ( -- Check if their current region is valid
    SELECT 1 FROM regions r 
    WHERE r.id = u.region_id 
    AND r.deleted_at IS NULL
);
