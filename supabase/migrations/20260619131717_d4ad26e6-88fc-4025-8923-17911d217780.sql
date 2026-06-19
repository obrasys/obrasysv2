DROP FUNCTION public.get_user_org_id(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT organization_id FROM public.organization_members
  WHERE user_id = _user_id
  ORDER BY created_at ASC
  LIMIT 1
$function$;

-- Reapply policies from migration 20260618201941 that were dropped via CASCADE
CREATE POLICY "plant_files_org_select" ON public.plant_files
FOR SELECT USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "plant_files_org_insert" ON public.plant_files
FOR INSERT WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "plant_files_org_update" ON public.plant_files
FOR UPDATE USING (organization_id = public.get_user_org_id(auth.uid()))
WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "plant_files_org_delete" ON public.plant_files
FOR DELETE USING (organization_id = public.get_user_org_id(auth.uid()));

-- Reapply storage policies from migration 20260618201715
CREATE POLICY "plant_files_storage_select" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'plant-files'
  AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
);

CREATE POLICY "plant_files_storage_insert" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'plant-files'
  AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
);

CREATE POLICY "plant_files_storage_update" ON storage.objects
FOR UPDATE TO authenticated USING (
  bucket_id = 'plant-files'
  AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
);

CREATE POLICY "plant_files_storage_delete" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'plant-files'
  AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
);