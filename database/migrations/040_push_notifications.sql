-- =============================================================================
-- Push Notifications Support
-- Adds push_token column to users table for Expo Push Notifications
-- =============================================================================

-- Add push_token column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS push_token TEXT DEFAULT NULL;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS push_token_updated_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for faster lookups when sending notifications
CREATE INDEX IF NOT EXISTS idx_users_push_token
ON public.users(push_token)
WHERE push_token IS NOT NULL AND deleted_at IS NULL;

-- =============================================================================
-- Function to send push notification to a user
-- This can be called from triggers or manually
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_push_tokens_for_company(p_company_code TEXT, p_role TEXT DEFAULT NULL)
RETURNS TABLE(user_id UUID, push_token TEXT, user_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.push_token, u.name
    FROM public.users u
    WHERE u.company_code = p_company_code
      AND u.push_token IS NOT NULL
      AND u.deleted_at IS NULL
      AND (p_role IS NULL OR u.role = p_role);
END;
$$;

-- =============================================================================
-- Function to get driver's push token for assignment notification
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_driver_push_token(p_driver_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token TEXT;
BEGIN
    SELECT push_token INTO v_token
    FROM public.users
    WHERE id = p_driver_id
      AND deleted_at IS NULL;

    RETURN v_token;
END;
$$;

-- =============================================================================
-- Trigger to notify driver when assigned to a request
-- Handles: new assignment, unassignment, and retroactive assignment
-- Note: This creates a record in notifications table, actual push sending
-- is done via Edge Function or external service
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notify_driver_on_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_driver_token TEXT;
    v_request_info RECORD;
    v_notification_type TEXT;
    v_notification_title TEXT;
    v_notification_body TEXT;
    v_is_retroactive BOOLEAN := FALSE;
BEGIN
    -- Handle INSERT (new assignment or retroactive assignment)
    IF TG_OP = 'INSERT' THEN
        -- Get driver's push token
        SELECT push_token INTO v_driver_token
        FROM public.users
        WHERE id = NEW.driver_id AND deleted_at IS NULL;

        -- Get request info for notification content
        SELECT
            pr.client_name,
            pr.client_address,
            pr.waste_label,
            pr.urgency,
            pr.status
        INTO v_request_info
        FROM public.pickup_requests pr
        WHERE pr.id = NEW.request_id;

        -- Check if this is a retroactive assignment (request already processed)
        IF v_request_info.status IN ('completed', 'processed', 'delivered') THEN
            v_is_retroactive := TRUE;
            v_notification_type := 'retroactive_assignment';
            v_notification_title := 'Naknadna dodela';
            v_notification_body := 'Naknadno ste dodeljeni na: ' || COALESCE(v_request_info.client_name, 'Klijent') || ' - ' || COALESCE(v_request_info.waste_label, 'Zahtev');
        ELSE
            v_notification_type := 'assignment';
            v_notification_title := 'Novi zahtev dodeljen';
            v_notification_body := COALESCE(v_request_info.client_name, 'Klijent') || ' - ' || COALESCE(v_request_info.waste_label, 'Zahtev');
        END IF;

        -- Insert notification record (for in-app display and push sending)
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            body,
            data,
            push_token
        ) VALUES (
            NEW.driver_id,
            v_notification_type,
            v_notification_title,
            v_notification_body,
            jsonb_build_object(
                'assignment_id', NEW.id,
                'request_id', NEW.request_id,
                'client_name', v_request_info.client_name,
                'client_address', v_request_info.client_address,
                'waste_label', v_request_info.waste_label,
                'urgency', v_request_info.urgency,
                'is_retroactive', v_is_retroactive
            ),
            v_driver_token
        );

        RETURN NEW;
    END IF;

    -- Handle UPDATE (status change to unassigned/removed)
    IF TG_OP = 'UPDATE' THEN
        -- Check if driver was unassigned (status changed to cancelled/removed)
        IF NEW.status IN ('cancelled', 'removed', 'unassigned') AND OLD.status NOT IN ('cancelled', 'removed', 'unassigned') THEN
            -- Get driver's push token
            SELECT push_token INTO v_driver_token
            FROM public.users
            WHERE id = NEW.driver_id AND deleted_at IS NULL;

            -- Get request info
            SELECT
                pr.client_name,
                pr.client_address,
                pr.waste_label
            INTO v_request_info
            FROM public.pickup_requests pr
            WHERE pr.id = NEW.request_id;

            -- Insert unassignment notification
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                body,
                data,
                push_token
            ) VALUES (
                NEW.driver_id,
                'unassignment',
                'Zahtev uklonjen',
                'Skinuti ste sa zahteva: ' || COALESCE(v_request_info.client_name, 'Klijent') || ' - ' || COALESCE(v_request_info.waste_label, 'Zahtev'),
                jsonb_build_object(
                    'assignment_id', NEW.id,
                    'request_id', NEW.request_id,
                    'client_name', v_request_info.client_name,
                    'client_address', v_request_info.client_address,
                    'waste_label', v_request_info.waste_label,
                    'reason', 'Menadžer vas je uklonio sa ovog zahteva'
                ),
                v_driver_token
            );
        END IF;

        RETURN NEW;
    END IF;

    -- Handle DELETE (driver completely removed from assignment)
    IF TG_OP = 'DELETE' THEN
        -- Get driver's push token
        SELECT push_token INTO v_driver_token
        FROM public.users
        WHERE id = OLD.driver_id AND deleted_at IS NULL;

        -- Get request info
        SELECT
            pr.client_name,
            pr.client_address,
            pr.waste_label
        INTO v_request_info
        FROM public.pickup_requests pr
        WHERE pr.id = OLD.request_id;

        -- Insert unassignment notification
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            body,
            data,
            push_token
        ) VALUES (
            OLD.driver_id,
            'unassignment',
            'Zahtev uklonjen',
            'Skinuti ste sa zahteva: ' || COALESCE(v_request_info.client_name, 'Klijent') || ' - ' || COALESCE(v_request_info.waste_label, 'Zahtev'),
            jsonb_build_object(
                'assignment_id', OLD.id,
                'request_id', OLD.request_id,
                'client_name', v_request_info.client_name,
                'client_address', v_request_info.client_address,
                'waste_label', v_request_info.waste_label,
                'reason', 'Menadžer vas je uklonio sa ovog zahteva'
            ),
            v_driver_token
        );

        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

-- Create triggers (drop first if exists)
DROP TRIGGER IF EXISTS trigger_notify_driver_on_assignment ON public.driver_assignments;
DROP TRIGGER IF EXISTS trigger_notify_driver_on_unassignment ON public.driver_assignments;
DROP TRIGGER IF EXISTS trigger_notify_driver_on_delete ON public.driver_assignments;

-- Trigger for INSERT (new assignments)
CREATE TRIGGER trigger_notify_driver_on_assignment
AFTER INSERT ON public.driver_assignments
FOR EACH ROW
EXECUTE FUNCTION public.notify_driver_on_assignment();

-- Trigger for UPDATE (status changes like unassignment)
CREATE TRIGGER trigger_notify_driver_on_unassignment
AFTER UPDATE ON public.driver_assignments
FOR EACH ROW
EXECUTE FUNCTION public.notify_driver_on_assignment();

-- Trigger for DELETE (complete removal)
CREATE TRIGGER trigger_notify_driver_on_delete
AFTER DELETE ON public.driver_assignments
FOR EACH ROW
EXECUTE FUNCTION public.notify_driver_on_assignment();

-- =============================================================================
-- Add push_token column to notifications table if not exists
-- =============================================================================

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS push_token TEXT DEFAULT NULL;

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS send_error TEXT DEFAULT NULL;

-- =============================================================================
-- Comments for documentation
-- =============================================================================

COMMENT ON COLUMN public.users.push_token IS
'Expo Push Token for sending push notifications to this user''s device';

COMMENT ON COLUMN public.users.push_token_updated_at IS
'When the push token was last updated (tokens can change)';

COMMENT ON FUNCTION public.notify_driver_on_assignment() IS
'Trigger function that creates a notification record when a driver is assigned to a request.
The actual push notification is sent via Edge Function polling this table or Supabase webhooks.';
