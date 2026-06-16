DROP POLICY IF EXISTS "Authenticated users can insert own notifications" ON public.user_notifications;

CREATE POLICY "Users can insert only own notifications"
ON public.user_notifications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());