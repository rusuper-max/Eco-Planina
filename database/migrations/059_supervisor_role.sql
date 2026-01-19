-- =============================================================================
-- SUPERVISOR ROLE - Clean Migration
-- =============================================================================
-- Ova migracija prvo čisti sve stare objekte pa kreira nove
-- =============================================================================

-- =============================================================================
-- STEP 1: CLEANUP - Brisanje svih postojećih supervisor objekata
-- =============================================================================

-- Drop all supervisor policies on all tables
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE policyname ILIKE '%supervisor%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Drop function (all overloads)
DROP FUNCTION IF EXISTS get_supervisor_region_ids(UUID);
DROP FUNCTION IF EXISTS get_supervisor_region_ids();

-- Drop table if exists (will cascade constraints)
DROP TABLE IF EXISTS public.supervisor_regions CASCADE;

-- =============================================================================
-- STEP 2: Update role constraint
-- =============================================================================
DO $$
BEGIN
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.users
ADD CONSTRAINT users_role_check
CHECK (role IN ('developer', 'admin', 'company_admin', 'supervisor', 'manager', 'client', 'driver'));

-- =============================================================================
-- STEP 3: Create supervisor_regions table
-- =============================================================================
CREATE TABLE public.supervisor_regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supervisor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES public.users(id),
    CONSTRAINT unique_supervisor_region UNIQUE (supervisor_id, region_id)
);

CREATE INDEX idx_supervisor_regions_supervisor ON public.supervisor_regions(supervisor_id);
CREATE INDEX idx_supervisor_regions_region ON public.supervisor_regions(region_id);

ALTER TABLE public.supervisor_regions ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 4: Create helper function (simple SQL version)
-- =============================================================================
CREATE FUNCTION get_supervisor_region_ids(p_user_id UUID DEFAULT NULL)
RETURNS UUID[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COALESCE(
        array_agg(sr.region_id),
        ARRAY[]::UUID[]
    )
    FROM public.supervisor_regions sr
    WHERE sr.supervisor_id = COALESCE(p_user_id, (
        SELECT u.id FROM public.users u
        WHERE u.auth_id = auth.uid()
        AND u.deleted_at IS NULL
        LIMIT 1
    ));
$$;

GRANT EXECUTE ON FUNCTION get_supervisor_region_ids(UUID) TO authenticated;

-- =============================================================================
-- STEP 5: RLS for supervisor_regions table
-- =============================================================================
CREATE POLICY "supervisor_regions_admin_all" ON public.supervisor_regions
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role IN ('admin', 'developer')
    )
);

CREATE POLICY "supervisor_regions_company_admin" ON public.supervisor_regions
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.users target ON target.id = supervisor_regions.supervisor_id
        WHERE u.auth_id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role = 'company_admin'
        AND u.company_code = target.company_code
    )
);

CREATE POLICY "supervisor_regions_self_select" ON public.supervisor_regions
FOR SELECT USING (
    supervisor_id = (
        SELECT u.id FROM public.users u
        WHERE u.auth_id = auth.uid()
        AND u.deleted_at IS NULL
        LIMIT 1
    )
);

-- =============================================================================
-- STEP 6: Update company_admin policy on users
-- =============================================================================
DROP POLICY IF EXISTS "Company admin can update company users" ON public.users;

CREATE POLICY "Company admin can update company users" ON public.users
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role IN ('company_admin', 'admin', 'developer')
        AND u.company_code = users.company_code
    )
    AND role NOT IN ('company_admin', 'admin', 'developer')
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.company_code = users.company_code
    )
    AND role IN ('supervisor', 'manager', 'driver', 'client')
);

-- =============================================================================
-- STEP 7: Supervisor policies on users table
-- =============================================================================
CREATE POLICY "supervisor_view_users" ON public.users
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.users me
        WHERE me.auth_id = auth.uid()
        AND me.deleted_at IS NULL
        AND me.role = 'supervisor'
        AND me.company_code = users.company_code
        AND (
            users.id = me.id
            OR users.region_id IN (SELECT unnest(get_supervisor_region_ids(me.id)))
        )
    )
);

CREATE POLICY "supervisor_update_users" ON public.users
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users me
        WHERE me.auth_id = auth.uid()
        AND me.deleted_at IS NULL
        AND me.role = 'supervisor'
        AND me.company_code = users.company_code
        AND users.region_id IN (SELECT unnest(get_supervisor_region_ids(me.id)))
        AND users.role IN ('driver', 'client')
    )
)
WITH CHECK (
    role IN ('driver', 'client')
);

-- =============================================================================
-- STEP 8: Supervisor policies on pickup_requests
-- =============================================================================
CREATE POLICY "supervisor_view_pickup_requests" ON public.pickup_requests
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.users me
        WHERE me.auth_id = auth.uid()
        AND me.deleted_at IS NULL
        AND me.role = 'supervisor'
        AND me.company_code = pickup_requests.company_code
        AND pickup_requests.region_id IN (SELECT unnest(get_supervisor_region_ids(me.id)))
    )
);

CREATE POLICY "supervisor_manage_pickup_requests" ON public.pickup_requests
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users me
        WHERE me.auth_id = auth.uid()
        AND me.deleted_at IS NULL
        AND me.role = 'supervisor'
        AND me.company_code = pickup_requests.company_code
        AND pickup_requests.region_id IN (SELECT unnest(get_supervisor_region_ids(me.id)))
    )
);

-- =============================================================================
-- STEP 9: Supervisor policies on processed_requests
-- =============================================================================
CREATE POLICY "supervisor_view_processed_requests" ON public.processed_requests
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.users me
        WHERE me.auth_id = auth.uid()
        AND me.deleted_at IS NULL
        AND me.role = 'supervisor'
        AND me.company_code = processed_requests.company_code
        AND processed_requests.region_id IN (SELECT unnest(get_supervisor_region_ids(me.id)))
    )
);

CREATE POLICY "supervisor_insert_processed_requests" ON public.processed_requests
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users me
        WHERE me.auth_id = auth.uid()
        AND me.deleted_at IS NULL
        AND me.role = 'supervisor'
        AND me.company_code = processed_requests.company_code
        AND processed_requests.region_id IN (SELECT unnest(get_supervisor_region_ids(me.id)))
    )
);

CREATE POLICY "supervisor_update_processed_requests" ON public.processed_requests
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.users me
        WHERE me.auth_id = auth.uid()
        AND me.deleted_at IS NULL
        AND me.role = 'supervisor'
        AND me.company_code = processed_requests.company_code
        AND processed_requests.region_id IN (SELECT unnest(get_supervisor_region_ids(me.id)))
    )
);

-- =============================================================================
-- STEP 10: Supervisor policies on inventories
-- =============================================================================
CREATE POLICY "supervisor_view_inventories" ON public.inventories
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.users me
        JOIN public.regions r ON r.id IN (SELECT unnest(get_supervisor_region_ids(me.id)))
        WHERE me.auth_id = auth.uid()
        AND me.deleted_at IS NULL
        AND me.role = 'supervisor'
        AND me.company_code = inventories.company_code
        AND r.inventory_id = inventories.id
    )
);

-- =============================================================================
-- STEP 11: Update prevent_self_role_change trigger
-- =============================================================================
CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_auth_id UUID;
    current_user_role TEXT;
BEGIN
    current_user_auth_id := auth.uid();

    IF current_user_auth_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF OLD.auth_id = current_user_auth_id THEN
        SELECT role INTO current_user_role
        FROM public.users
        WHERE auth_id = current_user_auth_id
        AND deleted_at IS NULL
        LIMIT 1;

        IF current_user_role NOT IN ('admin', 'developer') THEN
            IF NEW.role IS DISTINCT FROM OLD.role THEN
                RAISE EXCEPTION 'Nemate dozvolu da menjate svoju ulogu (role)';
            END IF;
            IF NEW.company_code IS DISTINCT FROM OLD.company_code THEN
                RAISE EXCEPTION 'Nemate dozvolu da menjate svoju firmu (company_code)';
            END IF;
            IF NEW.is_owner IS DISTINCT FROM OLD.is_owner THEN
                RAISE EXCEPTION 'Nemate dozvolu da menjate vlasništvo (is_owner)';
            END IF;
        END IF;
    END IF;

    SELECT role INTO current_user_role
    FROM public.users
    WHERE auth_id = current_user_auth_id
    AND deleted_at IS NULL
    LIMIT 1;

    IF current_user_role = 'company_admin' THEN
        IF NEW.role IN ('admin', 'developer', 'company_admin') AND OLD.role NOT IN ('admin', 'developer', 'company_admin') THEN
            RAISE EXCEPTION 'Company admin ne može da dodeli ulogu: %', NEW.role;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- =============================================================================
-- STEP 12: Grants
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supervisor_regions TO authenticated;

-- =============================================================================
-- STEP 13: Comments
-- =============================================================================
COMMENT ON TABLE public.supervisor_regions IS 'Many-to-many: supervisor ima pristup više regiona';
COMMENT ON FUNCTION get_supervisor_region_ids IS 'Vraća UUID[] region_id-ova za supervisor-a';
