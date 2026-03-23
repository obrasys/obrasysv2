
DROP POLICY "Service role can insert notifications" ON public.user_notifications;
CREATE POLICY "Authenticated users can insert own notifications"
  ON public.user_notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IN (SELECT unnest(public.get_org_member_ids())));
