-- DEBUG: Proveri da li postoje processed_requests sa driver_id
-- Pokreni ovo u Supabase SQL Editor da vidiš stanje u bazi

-- 1. Pregled svih processed_requests sa driver_id (ne null)
SELECT
    id,
    request_code,
    client_name,
    driver_id,
    driver_name,
    processed_at,
    deleted_at
FROM processed_requests
WHERE driver_id IS NOT NULL
ORDER BY processed_at DESC
LIMIT 20;

-- 2. Pregled vozača u users tabeli
SELECT id, name, role, company_code
FROM users
WHERE role = 'driver' AND deleted_at IS NULL;

-- 3. Proveri da li se driver_id poklapa sa nekim vozačem
SELECT
    pr.id as request_id,
    pr.request_code,
    pr.client_name,
    pr.driver_id,
    pr.driver_name as stored_driver_name,
    u.name as actual_driver_name,
    u.id as user_id
FROM processed_requests pr
LEFT JOIN users u ON pr.driver_id = u.id
WHERE pr.driver_id IS NOT NULL
ORDER BY pr.processed_at DESC
LIMIT 10;
