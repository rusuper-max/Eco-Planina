-- Migration: Notification System
-- Description: Creates notifications table and related RLS policies

-- ============================================
-- 1. Create notifications table
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- ============================================
-- 2. Add notification_preferences column to users
-- ============================================
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
    "new_request": true,
    "request_processed": true,
    "driver_assigned": true,
    "new_assignment": true,
    "assignment_cancelled": true,
    "urgent_request": true,
    "new_client": true,
    "new_message": true
}'::jsonb;

-- ============================================
-- 3. Enable RLS
-- ============================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS Policies for notifications
-- ============================================

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1));

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1));

-- Admins and system can insert notifications for any user
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (
    -- Allow service role or admin users
    (SELECT role FROM public.users WHERE auth_id = auth.uid() LIMIT 1) IN ('admin', 'developer')
    OR auth.uid() IS NOT NULL
);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1));

-- ============================================
-- 5. Helper function to create notifications
-- ============================================
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_type VARCHAR(50),
    p_title VARCHAR(255),
    p_message TEXT DEFAULT NULL,
    p_data JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id UUID;
    v_user_prefs JSONB;
BEGIN
    -- Get user's notification preferences
    SELECT notification_preferences INTO v_user_prefs
    FROM public.users
    WHERE id = p_user_id;

    -- Check if user has this notification type enabled (default to true if not set)
    IF v_user_prefs IS NULL OR (v_user_prefs->>p_type)::boolean IS NOT FALSE THEN
        INSERT INTO public.notifications (user_id, type, title, message, data)
        VALUES (p_user_id, p_type, p_title, p_message, p_data)
        RETURNING id INTO v_notification_id;

        RETURN v_notification_id;
    END IF;

    RETURN NULL;
END;
$$;

-- ============================================
-- 6. Trigger function for new pickup requests
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_new_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_manager RECORD;
    v_client_name VARCHAR(255);
    v_is_urgent BOOLEAN;
BEGIN
    -- Get client name
    SELECT name INTO v_client_name FROM public.users WHERE id = NEW.client_id;

    -- Check if urgent (pickup within 24 hours)
    v_is_urgent := (NEW.preferred_date <= (NOW() + INTERVAL '24 hours'));

    -- Notify all managers in the same company
    FOR v_manager IN
        SELECT id FROM public.users
        WHERE role IN ('manager', 'company_admin')
        AND company_code = NEW.company_code
        AND deleted_at IS NULL
    LOOP
        IF v_is_urgent THEN
            PERFORM public.create_notification(
                v_manager.id,
                'urgent_request',
                'Hitan zahtev!',
                'Klijent ' || v_client_name || ' je kreirao hitan zahtev za preuzimanje.',
                jsonb_build_object('request_id', NEW.id, 'client_name', v_client_name)
            );
        ELSE
            PERFORM public.create_notification(
                v_manager.id,
                'new_request',
                'Novi zahtev',
                'Klijent ' || v_client_name || ' je kreirao novi zahtev za preuzimanje.',
                jsonb_build_object('request_id', NEW.id, 'client_name', v_client_name)
            );
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;

-- Create trigger for new requests
DROP TRIGGER IF EXISTS trigger_notify_new_request ON public.pickup_requests;
CREATE TRIGGER trigger_notify_new_request
    AFTER INSERT ON public.pickup_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_new_request();

-- ============================================
-- 7. Trigger function for processed requests
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_request_processed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only notify when status changes to 'processed'
    IF NEW.status = 'processed' AND (OLD.status IS NULL OR OLD.status != 'processed') THEN
        PERFORM public.create_notification(
            NEW.client_id,
            'request_processed',
            'Zahtev obradjen',
            'Vaš zahtev za preuzimanje je obradjen.',
            jsonb_build_object('request_id', NEW.id)
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger for processed requests
DROP TRIGGER IF EXISTS trigger_notify_request_processed ON public.pickup_requests;
CREATE TRIGGER trigger_notify_request_processed
    AFTER UPDATE ON public.pickup_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_request_processed();

-- ============================================
-- 8. Trigger function for driver assignment
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_driver_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_driver_name VARCHAR(255);
    v_client_name VARCHAR(255);
BEGIN
    -- Only notify when driver is newly assigned
    IF NEW.assigned_driver_id IS NOT NULL AND (OLD.assigned_driver_id IS NULL OR OLD.assigned_driver_id != NEW.assigned_driver_id) THEN
        -- Get names
        SELECT name INTO v_driver_name FROM public.users WHERE id = NEW.assigned_driver_id;
        SELECT name INTO v_client_name FROM public.users WHERE id = NEW.client_id;

        -- Notify driver about new assignment
        PERFORM public.create_notification(
            NEW.assigned_driver_id,
            'new_assignment',
            'Novi zadatak',
            'Dodeljen vam je novi zadatak za preuzimanje od klijenta ' || v_client_name || '.',
            jsonb_build_object('request_id', NEW.id, 'client_name', v_client_name)
        );

        -- Notify client about driver assignment
        PERFORM public.create_notification(
            NEW.client_id,
            'driver_assigned',
            'Vozac dodeljen',
            'Vozac ' || v_driver_name || ' je dodeljen za vaš zahtev.',
            jsonb_build_object('request_id', NEW.id, 'driver_name', v_driver_name)
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger for driver assignment
DROP TRIGGER IF EXISTS trigger_notify_driver_assigned ON public.pickup_requests;
CREATE TRIGGER trigger_notify_driver_assigned
    AFTER UPDATE ON public.pickup_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_driver_assigned();

-- ============================================
-- 9. Trigger for new client registration
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_new_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_manager RECORD;
BEGIN
    -- Only for client role
    IF NEW.role = 'client' AND NEW.company_code IS NOT NULL THEN
        -- Notify all managers in the same company
        FOR v_manager IN
            SELECT id FROM public.users
            WHERE role IN ('manager', 'company_admin')
            AND company_code = NEW.company_code
            AND deleted_at IS NULL
            AND id != NEW.id
        LOOP
            PERFORM public.create_notification(
                v_manager.id,
                'new_client',
                'Novi klijent',
                'Novi klijent ' || NEW.name || ' se registrovao.',
                jsonb_build_object('client_id', NEW.id, 'client_name', NEW.name)
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger for new clients
DROP TRIGGER IF EXISTS trigger_notify_new_client ON public.users;
CREATE TRIGGER trigger_notify_new_client
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_new_client();

-- ============================================
-- 10. Grant permissions
-- ============================================
GRANT ALL ON public.notifications TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;
