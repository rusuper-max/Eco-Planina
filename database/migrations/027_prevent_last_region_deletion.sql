-- Migration to prevent deleting the last region of a company
-- This ensures that every company always has at least one active branch/region

-- 1. Trigger function for HARD DELETE
CREATE OR REPLACE FUNCTION check_last_region_deletion()
RETURNS TRIGGER AS $$
DECLARE
    region_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO region_count
    FROM regions
    WHERE company_code = OLD.company_code
    AND deleted_at IS NULL
    AND id != OLD.id; -- Exclude the one being deleted

    IF region_count = 0 THEN
        RAISE EXCEPTION 'Ne možete obrisati poslednju filijalu. Svaka firma mora imati bar jednu filijalu.';
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger function for SOFT DELETE (update deleted_at)
CREATE OR REPLACE FUNCTION check_last_region_soft_delete()
RETURNS TRIGGER AS $$
DECLARE
    region_count INTEGER;
BEGIN
    -- Check if we are soft deleting (deleted_at IS NULL -> IS NOT NULL)
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        SELECT COUNT(*) INTO region_count
        FROM regions
        WHERE company_code = NEW.company_code
        AND deleted_at IS NULL
        AND id != NEW.id; -- Exclude the one being deleted

        IF region_count = 0 THEN
             RAISE EXCEPTION 'Ne možete obrisati poslednju filijalu. Svaka firma mora imati bar jednu filijalu.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach triggers
DROP TRIGGER IF EXISTS prevent_last_region_delete ON regions;
CREATE TRIGGER prevent_last_region_delete
BEFORE DELETE ON regions
FOR EACH ROW
EXECUTE FUNCTION check_last_region_deletion();

DROP TRIGGER IF EXISTS prevent_last_region_soft_delete ON regions;
CREATE TRIGGER prevent_last_region_soft_delete
BEFORE UPDATE ON regions
FOR EACH ROW
EXECUTE FUNCTION check_last_region_soft_delete();
