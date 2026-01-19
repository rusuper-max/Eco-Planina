-- =============================================================================
-- Public read access for assets bucket
-- Allows anyone to read files from the assets bucket (for slider images, etc.)
-- =============================================================================

-- Enable public read access for the assets bucket
CREATE POLICY "Public read access for assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'assets');

-- Note: If the bucket doesn't exist, create it first in Supabase Dashboard
-- or run: INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', true);
