-- =============================================================================
-- ADD UNIQUE CONSTRAINT ON request_code
-- =============================================================================
-- Prevents duplicate request_code values in pickup_requests table.
-- This is a safety measure - the frontend already generates unique codes,
-- but this ensures database integrity.
--
-- Note: We allow NULL values (for old records) and only enforce uniqueness
-- on non-NULL values within the same company.
-- =============================================================================

-- First, check if there are any duplicates to clean up
-- SELECT request_code, COUNT(*) FROM pickup_requests
-- WHERE request_code IS NOT NULL GROUP BY request_code HAVING COUNT(*) > 1;

-- Add unique constraint (only for non-NULL values within same company)
-- Using a unique index instead of constraint for more flexibility
CREATE UNIQUE INDEX IF NOT EXISTS idx_pickup_requests_unique_code
ON pickup_requests(company_code, request_code)
WHERE request_code IS NOT NULL AND deleted_at IS NULL;

-- Same for processed_requests (just in case)
CREATE UNIQUE INDEX IF NOT EXISTS idx_processed_requests_unique_code
ON processed_requests(company_code, request_code)
WHERE request_code IS NOT NULL AND deleted_at IS NULL;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- Test that duplicates are now blocked:
-- INSERT INTO pickup_requests (company_code, request_code, ...)
-- VALUES ('ECO-TEST', 'TESTXX', ...);
-- INSERT INTO pickup_requests (company_code, request_code, ...)
-- VALUES ('ECO-TEST', 'TESTXX', ...);  -- Should fail
-- =============================================================================
