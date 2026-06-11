
-- 1) Restrict plan_measurements policies to authenticated role only
DROP POLICY IF EXISTS "Org members can view measurements" ON public.plan_measurements;
DROP POLICY IF EXISTS "Org members can create measurements" ON public.plan_measurements;
DROP POLICY IF EXISTS "Org members can update measurements" ON public.plan_measurements;
DROP POLICY IF EXISTS "Org members can delete measurements" ON public.plan_measurements;

CREATE POLICY "Org members can view measurements"
ON public.plan_measurements
FOR SELECT TO authenticated
USING (user_id = ANY (get_org_member_ids()));

CREATE POLICY "Org members can create measurements"
ON public.plan_measurements
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Org members can update measurements"
ON public.plan_measurements
FOR UPDATE TO authenticated
USING (user_id = ANY (get_org_member_ids()));

CREATE POLICY "Org members can delete measurements"
ON public.plan_measurements
FOR DELETE TO authenticated
USING (user_id = ANY (get_org_member_ids()));

-- 2) Fix mutable search_path on trigger function
CREATE OR REPLACE FUNCTION public.plan_foundation_suggestions_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;
