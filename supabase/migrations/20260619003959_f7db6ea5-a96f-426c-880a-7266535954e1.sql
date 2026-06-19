
-- Storage policies for plant-files bucket
-- Path convention: {organization_id}/{plant_file_id}/{filename or page-N.png}

CREATE POLICY "plant-files select org members" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'plant-files'
    AND public.is_org_member((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "plant-files insert org members" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'plant-files'
    AND public.is_org_member((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "plant-files update org members" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'plant-files'
    AND public.is_org_member((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "plant-files delete org members" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'plant-files'
    AND public.is_org_member((storage.foldername(name))[1]::uuid)
  );
