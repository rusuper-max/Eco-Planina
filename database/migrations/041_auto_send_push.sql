-- =============================================================================
-- Auto Send Push Notifications
-- Uses pg_net to call Edge Function when a notification is inserted
-- =============================================================================

-- Enable pg_net extension (should already be enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- =============================================================================
-- Function to send push notification via Edge Function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.send_push_notification_async()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_supabase_url TEXT;
    v_service_key TEXT;
    v_request_id BIGINT;
BEGIN
    -- Only process if push_token is present
    IF NEW.push_token IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get Supabase URL from environment (set in vault or as a constant)
    v_supabase_url := 'https://vmsfsstxxndpxbsdylog.supabase.co';

    -- Get service role key from vault
    SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_service_role_key'
    LIMIT 1;

    -- If no key in vault, try environment variable approach
    IF v_service_key IS NULL THEN
        -- For local testing, we'll skip the HTTP call
        RAISE NOTICE 'Service role key not found in vault, skipping push notification';
        RETURN NEW;
    END IF;

    -- Make async HTTP request to Edge Function
    SELECT net.http_post(
        url := v_supabase_url || '/functions/v1/send-push-notification',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_service_key
        ),
        body := jsonb_build_object('notification_id', NEW.id)
    ) INTO v_request_id;

    RAISE NOTICE 'Push notification request sent, request_id: %', v_request_id;

    RETURN NEW;
END;
$$;

-- Create trigger for auto-sending (drop first if exists)
DROP TRIGGER IF EXISTS trigger_send_push_on_insert ON public.notifications;

CREATE TRIGGER trigger_send_push_on_insert
AFTER INSERT ON public.notifications
FOR EACH ROW
WHEN (NEW.push_token IS NOT NULL AND NEW.sent_at IS NULL)
EXECUTE FUNCTION public.send_push_notification_async();

-- =============================================================================
-- Alternative: Simple cron-based approach using pg_cron
-- This polls for unsent notifications every 10 seconds
-- =============================================================================

-- Note: pg_cron jobs should be set up in Supabase dashboard or using:
-- SELECT cron.schedule(
--     'process-push-notifications',
--     '*/10 * * * * *', -- Every 10 seconds (not supported, use different approach)
--     $$
--     SELECT net.http_post(
--         'https://vmsfsstxxndpxbsdylog.supabase.co/functions/v1/send-push-notification',
--         '{"process_pending": true}'::jsonb,
--         headers => '{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_KEY"}'::jsonb
--     )
--     $$
-- );

COMMENT ON FUNCTION public.send_push_notification_async() IS
'Async trigger that sends push notifications via Edge Function using pg_net.
Requires service_role_key to be stored in vault.decrypted_secrets.';
