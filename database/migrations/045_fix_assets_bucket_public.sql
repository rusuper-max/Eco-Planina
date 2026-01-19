-- =============================================================================
-- Fix assets bucket public access
-- Ensures the assets bucket exists and is properly configured for public access
-- =============================================================================

-- Step 1: Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'assets',
    'assets',
    true,  -- IMPORTANT: This makes the bucket public
    10485760,  -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = true;  -- Ensure existing bucket is set to public

-- Step 2: Drop existing policy if it exists (to avoid duplicates)
DROP POLICY IF EXISTS "Public read access for assets" ON storage.objects;

-- Step 3: Create policy for public read access
CREATE POLICY "Public read access for assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'assets');

-- Step 4: Allow authenticated users to upload to assets bucket
DROP POLICY IF EXISTS "Authenticated users can upload to assets" ON storage.objects;

CREATE POLICY "Authenticated users can upload to assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'assets');

-- Step 5: Allow authenticated users to update their uploads
DROP POLICY IF EXISTS "Authenticated users can update assets" ON storage.objects;

CREATE POLICY "Authenticated users can update assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'assets');

-- Step 6: Allow authenticated users to delete from assets bucket
DROP POLICY IF EXISTS "Authenticated users can delete from assets" ON storage.objects;

CREATE POLICY "Authenticated users can delete from assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'assets');
