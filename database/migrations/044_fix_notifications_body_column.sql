-- =============================================================================
-- HOTFIX: Fix notifications table column name mismatch
-- Migration 040 used 'body' column but original table (011) uses 'message'
-- =============================================================================

-- Add body column as an alias (keeps both working)
-- This allows the trigger function to work without breaking existing code
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS body TEXT DEFAULT NULL;

-- Update the function to use 'message' column (the original one)
-- Also keep setting 'body' for consistency
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

        -- Insert notification record (using 'message' which is the original column)
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            body,
            data,
            push_token
        ) VALUES (
            NEW.driver_id,
            v_notification_type,
            v_notification_title,
            v_notification_body,
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

            v_notification_body := 'Skinuti ste sa zahteva: ' || COALESCE(v_request_info.client_name, 'Klijent') || ' - ' || COALESCE(v_request_info.waste_label, 'Zahtev');

            -- Insert unassignment notification
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                body,
                data,
                push_token
            ) VALUES (
                NEW.driver_id,
                'unassignment',
                'Zahtev uklonjen',
                v_notification_body,
                v_notification_body,
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

        v_notification_body := 'Skinuti ste sa zahteva: ' || COALESCE(v_request_info.client_name, 'Klijent') || ' - ' || COALESCE(v_request_info.waste_label, 'Zahtev');

        -- Insert unassignment notification
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            body,
            data,
            push_token
        ) VALUES (
            OLD.driver_id,
            'unassignment',
            'Zahtev uklonjen',
            v_notification_body,
            v_notification_body,
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

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON COLUMN public.notifications.body IS
'Notification body text (duplicate of message for push notification compatibility)';
