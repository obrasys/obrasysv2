
CREATE POLICY "Org members can read commercial proposal files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'commercial-proposals'
  AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
);

CREATE POLICY "Org members can upload commercial proposal files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'commercial-proposals'
  AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
);

CREATE POLICY "Org members can update commercial proposal files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'commercial-proposals'
  AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
);

CREATE POLICY "Org members can delete commercial proposal files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'commercial-proposals'
  AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
);
