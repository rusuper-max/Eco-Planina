-- =============================================================================
-- DEBUG INVENTORY ITEMS - Check why items don't show in UI
-- =============================================================================
-- Run this to diagnose inventory_items visibility issues
-- =============================================================================

-- 1. Check if inventory_items have valid inventory references
SELECT
    'inventory_items count' as check_name,
    COUNT(*) as count
FROM inventory_items;

-- 2. Check if those inventory_ids exist in inventories table
SELECT
    'items with valid inventory' as check_name,
    COUNT(*) as count
FROM inventory_items ii
WHERE EXISTS (
    SELECT 1 FROM inventories i
    WHERE i.id = ii.inventory_id
    AND i.deleted_at IS NULL
);

-- 3. Check items with INVALID/missing inventory reference
SELECT
    'items with INVALID inventory (orphaned)' as check_name,
    COUNT(*) as count
FROM inventory_items ii
WHERE NOT EXISTS (
    SELECT 1 FROM inventories i
    WHERE i.id = ii.inventory_id
    AND i.deleted_at IS NULL
);

-- 4. List orphaned items with their inventory_ids
SELECT
    ii.id as item_id,
    ii.inventory_id,
    ii.waste_type_id,
    ii.quantity_kg,
    'ORPHANED - no matching inventory' as status
FROM inventory_items ii
WHERE NOT EXISTS (
    SELECT 1 FROM inventories i
    WHERE i.id = ii.inventory_id
    AND i.deleted_at IS NULL
);

-- 5. List all inventories with company_code
SELECT
    id,
    name,
    company_code,
    deleted_at,
    created_at
FROM inventories
ORDER BY created_at DESC;

-- 6. Check regions and their inventory assignments
SELECT
    r.id as region_id,
    r.name as region_name,
    r.inventory_id,
    i.name as inventory_name,
    i.company_code,
    CASE
        WHEN r.inventory_id IS NULL THEN 'NO INVENTORY ASSIGNED'
        WHEN i.id IS NULL THEN 'INVALID INVENTORY_ID'
        ELSE 'OK'
    END as status
FROM regions r
LEFT JOIN inventories i ON i.id = r.inventory_id AND i.deleted_at IS NULL
WHERE r.deleted_at IS NULL
ORDER BY r.name;

-- 7. Show inventory_items with full join details
SELECT
    ii.id as item_id,
    ii.quantity_kg,
    ii.inventory_id,
    i.name as inventory_name,
    i.company_code,
    wt.name as waste_type_name,
    CASE
        WHEN i.id IS NULL THEN 'MISSING INVENTORY'
        WHEN i.company_code IS NULL THEN 'MISSING COMPANY_CODE'
        ELSE 'OK'
    END as status
FROM inventory_items ii
LEFT JOIN inventories i ON i.id = ii.inventory_id AND i.deleted_at IS NULL
LEFT JOIN waste_types wt ON wt.id = ii.waste_type_id
ORDER BY ii.quantity_kg DESC;

-- =============================================================================
-- FIX: If regions have inventory_id but inventories don't exist,
-- we need to either:
-- A) Create the missing inventories, or
-- B) Clear the orphaned inventory_items
-- =============================================================================

