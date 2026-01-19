-- =============================================================================
-- CHAT PARTNERS FUNCTION - Bypass RLS for deleted users
-- Run this in Supabase SQL Editor
-- =============================================================================
-- This function allows fetching chat partners even if they are soft-deleted,
-- so that chat conversations don't show "Nepoznato" for deleted users.
-- =============================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS get_chat_partners(UUID[]);

-- Create function to get chat partners including deleted users
CREATE OR REPLACE FUNCTION get_chat_partners(partner_ids UUID[])
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    role VARCHAR(50),
    phone VARCHAR(50),
    deleted_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        u.id,
        u.name,
        u.role,
        u.phone,
        u.deleted_at
    FROM users u
    WHERE u.id = ANY(partner_ids);
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_chat_partners(UUID[]) TO authenticated;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- SELECT * FROM get_chat_partners(ARRAY['some-uuid-here']::UUID[]);
