
DROP POLICY IF EXISTS "Org members can update closing sheets" ON public.closing_sheets;

CREATE POLICY "Org members can update closing sheets"
ON public.closing_sheets
FOR UPDATE
USING (
  user_id = ANY (get_org_member_ids())
  AND (
    status <> 'locked'
    OR closing_type = 'initial'
  )
);
