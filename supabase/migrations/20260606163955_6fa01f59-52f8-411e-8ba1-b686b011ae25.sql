
-- Lote 2.1: Add organization_id to axia_suggestions_log for org-level isolation
ALTER TABLE public.axia_suggestions_log
  ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Backfill from organization_members (best-effort: existing rows get the user's active org)
UPDATE public.axia_suggestions_log AS a
SET organization_id = m.organization_id
FROM public.organization_members AS m
WHERE a.organization_id IS NULL
  AND m.user_id = a.user_id
  AND m.member_status = 'active';

CREATE INDEX IF NOT EXISTS axia_suggestions_log_org_idx
  ON public.axia_suggestions_log (organization_id);

-- Tighten RLS: keep per-user policy and add org-level read for active members
DROP POLICY IF EXISTS "Org members can view org suggestions_log" ON public.axia_suggestions_log;
CREATE POLICY "Org members can view org suggestions_log"
ON public.axia_suggestions_log
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = axia_suggestions_log.organization_id
      AND om.member_status = 'active'
  )
);
