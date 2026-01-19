-- Create public bucket for brand assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to brand assets
CREATE POLICY "Public read access for brand assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'brand-assets');

-- Allow super admins to manage brand assets
CREATE POLICY "Super admins can manage brand assets"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'brand-assets' AND public.is_super_admin())
WITH CHECK (bucket_id = 'brand-assets' AND public.is_super_admin());