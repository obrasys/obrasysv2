
CREATE TABLE public.plan_analysis_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_import_id uuid NOT NULL REFERENCES public.plan_imports(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  obra_id uuid,
  version integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL,
  source text NOT NULL DEFAULT 'icf-plant-analysis',
  analysis_payload jsonb NOT NULL,
  summary jsonb,
  confidence numeric,
  requires_review boolean NOT NULL DEFAULT false,
  human_reviewed boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plan_analysis_versions_confidence_range CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  CONSTRAINT plan_analysis_versions_unique_version UNIQUE (plan_import_id, version)
);

CREATE INDEX idx_plan_analysis_versions_plan_import ON public.plan_analysis_versions(plan_import_id);
CREATE INDEX idx_plan_analysis_versions_org ON public.plan_analysis_versions(organization_id);
CREATE INDEX idx_plan_analysis_versions_obra ON public.plan_analysis_versions(obra_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_analysis_versions TO authenticated;
GRANT ALL ON public.plan_analysis_versions TO service_role;

ALTER TABLE public.plan_analysis_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view plan analysis versions"
ON public.plan_analysis_versions FOR SELECT TO authenticated
USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can insert plan analysis versions"
ON public.plan_analysis_versions FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND organization_id = public.get_user_org_id());

CREATE POLICY "Org members can update plan analysis versions"
ON public.plan_analysis_versions FOR UPDATE TO authenticated
USING (organization_id = public.get_user_org_id())
WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Creator can delete own plan analysis versions"
ON public.plan_analysis_versions FOR DELETE TO authenticated
USING (created_by = auth.uid());

CREATE TRIGGER trg_plan_analysis_versions_updated_at
BEFORE UPDATE ON public.plan_analysis_versions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.plan_analysis_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_import_id uuid REFERENCES public.plan_imports(id) ON DELETE CASCADE,
  plan_analysis_version_id uuid REFERENCES public.plan_analysis_versions(id) ON DELETE SET NULL,
  organization_id uuid NOT NULL,
  obra_id uuid,
  user_id uuid,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'info',
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plan_analysis_logs_status_check CHECK (status IN ('info','success','warning','error'))
);

CREATE INDEX idx_plan_analysis_logs_plan_import ON public.plan_analysis_logs(plan_import_id);
CREATE INDEX idx_plan_analysis_logs_org ON public.plan_analysis_logs(organization_id);
CREATE INDEX idx_plan_analysis_logs_event ON public.plan_analysis_logs(event_type);
CREATE INDEX idx_plan_analysis_logs_created ON public.plan_analysis_logs(created_at DESC);

GRANT SELECT, INSERT ON public.plan_analysis_logs TO authenticated;
GRANT ALL ON public.plan_analysis_logs TO service_role;

ALTER TABLE public.plan_analysis_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view plan analysis logs"
ON public.plan_analysis_logs FOR SELECT TO authenticated
USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org members can insert plan analysis logs"
ON public.plan_analysis_logs FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_user_org_id());
