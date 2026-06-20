DROP POLICY "Users can insert allocations" ON public.project_resource_allocations;
CREATE POLICY "Users can insert allocations" ON public.project_resource_allocations
  FOR INSERT WITH CHECK (user_id = auth.uid() AND user_id = ANY (get_org_member_ids()));

DROP POLICY "Org members can insert budget events" ON public.budget_events;
CREATE POLICY "Org members can insert budget events" ON public.budget_events
  FOR INSERT WITH CHECK (user_id = auth.uid() AND user_id = ANY (get_org_member_ids()));