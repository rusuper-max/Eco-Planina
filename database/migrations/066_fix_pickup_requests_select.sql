-- =============================================================================
-- FIX: Pickup Requests SELECT Policy
-- =============================================================================
-- Problem: Manager ne vidi aktivne zahteve
-- Uzrok: Politika "Users can view requests with region filter" koristi subquery
--        na users tabelu koja ima RLS, što blokira pristup.
-- Rešenje: Koristiti get_current_user_info() umesto subquery-ja
-- =============================================================================

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view requests with region filter" ON public.pickup_requests;
DROP POLICY IF EXISTS "Users can view company requests" ON public.pickup_requests;
DROP POLICY IF EXISTS "pickup_requests_select" ON public.pickup_requests;

-- =============================================================================
-- Recreate SELECT policy using get_current_user_info()
-- =============================================================================
CREATE POLICY "pickup_requests_select" ON public.pickup_requests
FOR SELECT TO authenticated
USING (
    deleted_at IS NULL
    AND (
        -- Admin/Developer vide sve
        (get_current_user_info()).role IN ('admin', 'developer')
        OR (
            -- Korisnici vide svoju firmu
            company_code = (get_current_user_info()).company_code
            AND (
                -- Company admin vidi sve u firmi
                (get_current_user_info()).role = 'company_admin'
                OR
                -- Manager vidi sve u firmi (kao company_admin)
                (get_current_user_info()).role = 'manager'
                OR
                -- Driver vidi svoju regiju ili nedodeljene
                (
                    (get_current_user_info()).role = 'driver'
                    AND (
                        region_id IS NULL
                        OR region_id = (get_current_user_info()).region_id
                    )
                )
                OR
                -- Supervisor vidi svoje regije
                (
                    (get_current_user_info()).role = 'supervisor'
                    AND region_id = ANY((get_current_user_info()).supervisor_region_ids)
                )
                OR
                -- Client vidi svoje zahteve
                user_id = (get_current_user_info()).user_id
            )
        )
    )
);

-- =============================================================================
-- Verify other pickup_requests policies use correct functions
-- =============================================================================

-- Recreate INSERT policy for clients
DROP POLICY IF EXISTS "Clients can create requests" ON public.pickup_requests;
CREATE POLICY "pickup_requests_client_insert" ON public.pickup_requests
FOR INSERT TO authenticated
WITH CHECK (
    company_code = (get_current_user_info()).company_code
    AND user_id = (get_current_user_info()).user_id
    AND (get_current_user_info()).role = 'client'
);

-- Recreate INSERT policy for managers
DROP POLICY IF EXISTS "Managers can create requests for clients" ON public.pickup_requests;
CREATE POLICY "pickup_requests_manager_insert" ON public.pickup_requests
FOR INSERT TO authenticated
WITH CHECK (
    company_code = (get_current_user_info()).company_code
    AND (get_current_user_info()).role IN ('manager', 'company_admin', 'admin', 'developer')
);

-- Recreate UPDATE policy
DROP POLICY IF EXISTS "Managers can update company requests" ON public.pickup_requests;
CREATE POLICY "pickup_requests_update" ON public.pickup_requests
FOR UPDATE TO authenticated
USING (
    company_code = (get_current_user_info()).company_code
    AND (get_current_user_info()).role IN ('manager', 'supervisor', 'company_admin', 'admin', 'developer')
)
WITH CHECK (
    company_code = (get_current_user_info()).company_code
    AND (get_current_user_info()).role IN ('manager', 'supervisor', 'company_admin', 'admin', 'developer')
);

-- Recreate DELETE policy
DROP POLICY IF EXISTS "Managers can delete company requests" ON public.pickup_requests;
DROP POLICY IF EXISTS "Clients can delete own pending requests" ON public.pickup_requests;

CREATE POLICY "pickup_requests_delete" ON public.pickup_requests
FOR DELETE TO authenticated
USING (
    company_code = (get_current_user_info()).company_code
    AND (
        -- Manager/admin može da briše sve u firmi
        (get_current_user_info()).role IN ('manager', 'supervisor', 'company_admin', 'admin', 'developer')
        OR
        -- Client može da briše samo svoje pending zahteve
        (
            user_id = (get_current_user_info()).user_id
            AND (get_current_user_info()).role = 'client'
            AND status = 'pending'
        )
    )
);

-- =============================================================================
-- Drop supervisor-specific policies (now handled in main policy)
-- =============================================================================
DROP POLICY IF EXISTS "supervisor_view_pickup_requests" ON public.pickup_requests;
DROP POLICY IF EXISTS "supervisor_manage_pickup_requests" ON public.pickup_requests;
