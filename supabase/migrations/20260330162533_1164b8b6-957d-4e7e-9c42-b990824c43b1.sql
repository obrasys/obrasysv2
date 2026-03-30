-- Allow secure read access to RDO photos for obra members and portal clients
create or replace function public.can_access_rdo_photo(_path text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select exists (
    select 1
    from public.relatorios_diarios rd
    where coalesce(rd.fotos, '{}'::text[]) @> array[_path]
      and (
        exists (
          select 1
          from public.obras o
          where o.id = rd.obra_id
            and o.user_id = any(public.get_org_member_ids())
        )
        or exists (
          select 1
          from public.client_obra_access coa
          where coa.obra_id = rd.obra_id
            and coa.client_user_id = auth.uid()
            and coa.ativo = true
        )
      )
  )
  or split_part(_path, '/', 1) = auth.uid()::text
$$;

-- Replace restrictive owner-only read policy with secure project-based access
DROP POLICY IF EXISTS "Users can view their own RDO photos" ON storage.objects;

CREATE POLICY "Authorized users can view RDO photos"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'rdo-fotos'
  AND public.can_access_rdo_photo(name)
);