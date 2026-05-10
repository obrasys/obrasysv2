
CREATE TABLE IF NOT EXISTS public.axia_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  user_id uuid NOT NULL,
  obra_id uuid,
  plan_import_id uuid,
  page_id uuid,
  function_name text NOT NULL,
  model text,
  input_size_bytes integer,
  status text NOT NULL DEFAULT 'pending',
  latency_ms integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_axia_call_logs_org_created ON public.axia_call_logs (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_axia_call_logs_plan ON public.axia_call_logs (plan_import_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_axia_call_logs_user ON public.axia_call_logs (user_id, created_at DESC);

ALTER TABLE public.axia_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all axia logs"
  ON public.axia_call_logs FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Org members can view their org axia logs"
  ON public.axia_call_logs FOR SELECT
  TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

CREATE POLICY "Users can insert their own axia logs"
  ON public.axia_call_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can insert axia logs"
  ON public.axia_call_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Users can update their own axia logs"
  ON public.axia_call_logs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
