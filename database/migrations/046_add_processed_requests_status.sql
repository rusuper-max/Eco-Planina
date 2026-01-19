-- Migration: Add status column to processed_requests
-- Allows distinguishing between completed and rejected requests

-- Add status column with default 'completed' (for existing records)
ALTER TABLE public.processed_requests
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed';

-- Update column comment
COMMENT ON COLUMN public.processed_requests.status IS
'Request status: completed (successfully processed), rejected (declined by manager)';

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_processed_requests_status
ON public.processed_requests(status)
WHERE deleted_at IS NULL;

-- Verify
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'processed_requests' AND column_name = 'status';
