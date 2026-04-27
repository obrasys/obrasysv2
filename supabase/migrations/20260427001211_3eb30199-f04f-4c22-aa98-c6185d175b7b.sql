-- The previous policies blocked existing channel subscriptions whose names do
-- not contain the org or user id (e.g. "axia-intake-history-notifications").
-- Replace with an authenticated-only gate. The underlying tables published to
-- realtime (axia_intake_items, axia_intake_item_history, etc.) all have RLS
-- enabled, so postgres_changes payloads are still filtered per-user by Postgres
-- before being delivered.

DROP POLICY IF EXISTS "authenticated org members can read realtime" ON realtime.messages;
DROP POLICY IF EXISTS "authenticated org members can broadcast realtime" ON realtime.messages;

CREATE POLICY "authenticated users can use realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated users can broadcast realtime"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (true);
