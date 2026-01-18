-- =============================================================================
-- CLIENT HISTORY HIDE
-- Run this in Supabase SQL Editor
-- =============================================================================
-- Allows clients to hide processed requests from their own history view
-- without affecting manager's view (independent visibility)
-- =============================================================================

-- Add client_hidden_at column to processed_requests
ALTER TABLE public.processed_requests
ADD COLUMN IF NOT EXISTS client_hidden_at TIMESTAMPTZ DEFAULT NULL;

-- Comment for clarity
COMMENT ON COLUMN public.processed_requests.client_hidden_at IS
'When client hides this request from their history. NULL = visible to client.';

-- RLS Policy: Allow clients to update only client_hidden_at on their own requests
DROP POLICY IF EXISTS "Clients can hide their own processed requests" ON public.processed_requests;

CREATE POLICY "Clients can hide their own processed requests" ON public.processed_requests
FOR UPDATE TO authenticated
USING (
    -- Client can only update their own requests
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role = 'client'
        AND u.id = processed_requests.client_id
    )
)
WITH CHECK (
    -- Same check for the new row
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role = 'client'
        AND u.id = processed_requests.client_id
    )
);

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- Check the new column exists:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'processed_requests' AND column_name = 'client_hidden_at';
--
-- Check policies:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'processed_requests';
-- =============================================================================
