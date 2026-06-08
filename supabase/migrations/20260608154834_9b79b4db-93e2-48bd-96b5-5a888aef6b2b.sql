
DROP POLICY IF EXISTS "mce_storage_select" ON storage.objects;

CREATE POLICY "mce_storage_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'mce-attachments'
  AND ((storage.foldername(name))[1])::uuid = ANY (public.get_org_member_ids())
);
