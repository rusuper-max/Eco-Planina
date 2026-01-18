-- Migration: Fix Notification Trigger Column
-- Description: Fixes bug in 032 where 'client_id' was used instead of 'user_id' in pickup_requests trigger.

CREATE OR REPLACE FUNCTION public.notify_new_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_manager RECORD;
    v_client_name VARCHAR(255);
    v_creator_name VARCHAR(255);
    v_is_urgent BOOLEAN;
    v_message_title VARCHAR(255);
    v_message_body TEXT;
    v_type VARCHAR(50);
BEGIN
    -- Get client name (FIX: use NEW.user_id instead of NEW.client_id)
    SELECT name INTO v_client_name FROM public.users WHERE id = NEW.user_id;

    -- Check if urgent (pickup within 24 hours)
    v_is_urgent := (NEW.preferred_date <= (NOW() + INTERVAL '24 hours'));
    
    -- Set type
    IF v_is_urgent THEN
        v_type := 'urgent_request';
        v_message_title := 'Hitan zahtev!';
    ELSE
        v_type := 'new_request';
        v_message_title := 'Novi zahtev';
    END IF;

    -- Determine message based on who created it
    IF NEW.created_by_manager IS NOT NULL THEN
        -- Created by manager
        SELECT name INTO v_creator_name FROM public.users WHERE id = NEW.created_by_manager;
        v_message_body := 'Menadžer ' || COALESCE(v_creator_name, 'Unknown') || ' je kreirao zahtev za klijenta ' || v_client_name || '.';
    ELSE
        -- Created by client
        v_message_body := 'Klijent ' || v_client_name || ' je kreirao novi zahtev za preuzimanje.';
    END IF;

    -- Notify managers in the same company
    FOR v_manager IN
        SELECT id, region_id, role FROM public.users
        WHERE role IN ('manager', 'company_admin')
        AND company_code = NEW.company_code
        AND deleted_at IS NULL
        -- Exclude the creator (if it was a manager who created it)
        AND (NEW.created_by_manager IS NULL OR id != NEW.created_by_manager)
    LOOP
        -- REGION FILTERING
        -- 1. Company Admins see EVERYTHING
        -- 2. Managers see only their RELEVANT region
        
        -- If user is a manager (not admin) AND has a specific region assigned
        IF v_manager.role = 'manager' AND v_manager.region_id IS NOT NULL THEN
            -- Strict check: Request MUST match manager's region
            -- If request has region and it differs -> SKIP
            IF NEW.region_id IS NOT NULL AND NEW.region_id != v_manager.region_id THEN
                CONTINUE;
            END IF;
            -- If request has no region -> SKIP (orphaned request, only admins should see)
            IF NEW.region_id IS NULL THEN
                CONTINUE;
            END IF;
        END IF;

        PERFORM public.create_notification(
            v_manager.id,
            v_type,
            v_message_title,
            v_message_body,
            jsonb_build_object('request_id', NEW.id, 'client_name', v_client_name)
        );
    END LOOP;

    RETURN NEW;
END;
$$;
