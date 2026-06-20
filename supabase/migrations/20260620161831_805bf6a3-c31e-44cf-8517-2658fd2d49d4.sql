DROP POLICY IF EXISTS "Users can manage own room templates" ON public.plan_room_templates;

CREATE POLICY "Org members can view room templates"
ON public.plan_room_templates
FOR SELECT
USING (user_id = ANY (get_org_member_ids()));

CREATE POLICY "Users insert own room templates"
ON public.plan_room_templates
FOR INSERT
WITH CHECK (auth.uid() = user_id AND user_id = ANY (get_org_member_ids()));

CREATE POLICY "Org members update room templates"
ON public.plan_room_templates
FOR UPDATE
USING (user_id = ANY (get_org_member_ids()))
WITH CHECK (user_id = ANY (get_org_member_ids()));

CREATE POLICY "Org members delete room templates"
ON public.plan_room_templates
FOR DELETE
USING (user_id = ANY (get_org_member_ids()));