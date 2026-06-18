
CREATE TABLE IF NOT EXISTS public.axia_ai_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  user_id uuid,
  module text,
  task_type text,
  provider_used text,
  model_used text,
  status text,
  latency_ms integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.axia_ai_logs TO authenticated;
GRANT ALL ON public.axia_ai_logs TO service_role;

ALTER TABLE public.axia_ai_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own axia logs"
ON public.axia_ai_logs FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_super_admin());

CREATE INDEX IF NOT EXISTS idx_axia_ai_logs_org ON public.axia_ai_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_axia_ai_logs_user ON public.axia_ai_logs(user_id, created_at DESC);
