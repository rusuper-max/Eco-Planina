-- Robust fix for missing regions and orphan users
-- 1. Ensures every company has a default region.
-- 2. Fixes users pointing to deleted regions.
-- 3. Assigns all "homeless" users (except admins) to the default region.

DO $$
DECLARE
    comp RECORD;
    new_region_id UUID;
    orphan_count INTEGER;
    fixed_refs_count INTEGER;
BEGIN
    -- For every active company
    FOR comp IN SELECT * FROM companies WHERE deleted_at IS NULL LOOP
        
        RAISE NOTICE 'Checking company: % (%)', comp.name, comp.code;

        -- 1. Get or Create Default Region
        SELECT id INTO new_region_id 
        FROM regions 
        WHERE company_code = comp.code 
        AND deleted_at IS NULL 
        ORDER BY created_at ASC 
        LIMIT 1;

        IF new_region_id IS NULL THEN
            RAISE NOTICE ' -> No active region found. Creating one...';
            INSERT INTO regions (company_code, name)
            VALUES (comp.code, comp.name)
            RETURNING id INTO new_region_id;
        ELSE
            RAISE NOTICE ' -> Found existing default region: %', new_region_id;
        END IF;

        -- 2. Fix users with invalid region references (pointing to deleted regions)
        UPDATE users u
        SET region_id = NULL
        WHERE company_code = comp.code
        AND region_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM regions r 
            WHERE r.id = u.region_id 
            AND r.deleted_at IS NULL
        );
        
        GET DIAGNOSTICS fixed_refs_count = ROW_COUNT;
        IF fixed_refs_count > 0 THEN
            RAISE NOTICE ' -> Fixed % users with invalid region IDs', fixed_refs_count;
        END IF;

        -- 3. Assign "homeless" users to default region (Preserve Admin NULL status)
        UPDATE users 
        SET region_id = new_region_id
        WHERE company_code = comp.code 
        AND region_id IS NULL 
        AND role != 'company_admin' -- Don't touch admins
        AND deleted_at IS NULL;
        
        GET DIAGNOSTICS orphan_count = ROW_COUNT;
        
        IF orphan_count > 0 THEN
            RAISE NOTICE ' -> Assigned % users to region %', orphan_count, new_region_id;
        ELSE
            RAISE NOTICE ' -> No orphan users found to assign.';
        END IF;

    END LOOP;
END $$;
