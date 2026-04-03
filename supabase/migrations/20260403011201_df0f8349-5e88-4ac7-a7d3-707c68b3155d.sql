
-- 1. Block direct INSERT/UPDATE on subscribers for authenticated users
CREATE POLICY "Block direct insert for authenticated"
ON public.subscribers FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Block direct update for authenticated"
ON public.subscribers FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

-- 2. Make plan-files bucket private and restrict SELECT to owners
UPDATE storage.buckets SET public = false WHERE id = 'plan-files';

DROP POLICY IF EXISTS "Anyone can view plan files" ON storage.objects;

CREATE POLICY "Owner can view plan files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'plan-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
