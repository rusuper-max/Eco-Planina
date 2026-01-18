-- Migration to fix companies without regions and assign orphan users
-- This ensures that "drugarov nalog" and similar legacy accounts get a region properly assigned.

DO $$
DECLARE
    comp RECORD;
    new_region_id UUID;
    orphan_count INTEGER;
BEGIN
    -- For every active company
    FOR comp IN SELECT * FROM companies WHERE deleted_at IS NULL LOOP
        
        -- Check if it has active regions
        IF NOT EXISTS (SELECT 1 FROM regions WHERE company_code = comp.code AND deleted_at IS NULL) THEN
            RAISE NOTICE 'Fixing company % (%), no regions found.', comp.name, comp.code;
            
            -- Create default region
            INSERT INTO regions (company_code, name)
            VALUES (comp.code, comp.name) -- Region name same as company name
            RETURNING id INTO new_region_id;
            
            RAISE NOTICE 'Created default region: %', new_region_id;
        ELSE
            -- Company has regions, get the oldest one as default
            SELECT id INTO new_region_id 
            FROM regions 
            WHERE company_code = comp.code AND deleted_at IS NULL 
            ORDER BY created_at ASC 
            LIMIT 1;
        END IF;

        -- Find users without region in this company and assign them to the default region
        UPDATE users 
        SET region_id = new_region_id
        WHERE company_code = comp.code 
        AND region_id IS NULL 
        AND deleted_at IS NULL;
        
        GET DIAGNOSTICS orphan_count = ROW_COUNT;
        
        IF orphan_count > 0 THEN
            RAISE NOTICE 'Assigned % orphan users in company % to region %', orphan_count, comp.name, new_region_id;
        END IF;

    END LOOP;
END $$;
