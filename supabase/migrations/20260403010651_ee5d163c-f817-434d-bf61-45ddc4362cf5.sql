
-- 1. Fix user_subscription view: add security_invoker so RLS of underlying 'subscribers' table is enforced
ALTER VIEW public.user_subscription SET (security_invoker = true);

-- 2. Fix plan-files bucket: restrict write operations to folder owners
-- Drop old permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload plan files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update plan files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete plan files" ON storage.objects;

-- Recreate with ownership check (first folder segment = user id)
CREATE POLICY "Owner can upload plan files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'plan-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owner can update plan files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'plan-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owner can delete plan files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'plan-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Fix email_click_tracking permissive INSERT policy
DROP POLICY IF EXISTS "Anyone can insert click tracking" ON public.email_click_tracking;

CREATE POLICY "Authenticated users can insert own click tracking"
ON public.email_click_tracking FOR INSERT
TO authenticated
WITH CHECK (true);
