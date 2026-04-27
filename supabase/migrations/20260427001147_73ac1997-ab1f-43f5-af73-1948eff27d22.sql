-- Restrict Realtime broadcast/presence channel subscriptions to authenticated org members.
-- Without this, any authenticated user could subscribe to any channel topic and receive
-- realtime updates broadcast on tables like axia_intake_items / axia_intake_item_history.

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Authenticated users may subscribe / receive only on topics that include their org id
-- (e.g. "org:<uuid>:axia-intake") OR their own user id (e.g. "user:<uuid>:...").
-- Postgres-changes subscriptions performed by the supabase-js client use the
-- channel name as the topic, so we also accept the literal "realtime:*" prefix
-- only for callers that belong to an organization (org membership required).

CREATE POLICY "authenticated org members can read realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Caller must belong to an organization
  public.get_user_org_id() IS NOT NULL
  AND (
    -- Topic scoped to the caller's org id
    topic LIKE ('%' || public.get_user_org_id()::text || '%')
    -- Or scoped to the caller's own user id
    OR topic LIKE ('%' || (auth.uid())::text || '%')
  )
);

CREATE POLICY "authenticated org members can broadcast realtime"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  public.get_user_org_id() IS NOT NULL
  AND (
    topic LIKE ('%' || public.get_user_org_id()::text || '%')
    OR topic LIKE ('%' || (auth.uid())::text || '%')
  )
);
