
CREATE TABLE public.commercial_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  orcamento_id uuid NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  version integer NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','expired')),
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  valid_until date,
  pdf_path text,
  notes text,
  sent_at timestamptz,
  sent_to text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (orcamento_id, version)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commercial_proposals TO authenticated;
GRANT ALL ON public.commercial_proposals TO service_role;

ALTER TABLE public.commercial_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view commercial proposals"
ON public.commercial_proposals FOR SELECT
TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can insert commercial proposals"
ON public.commercial_proposals FOR INSERT
TO authenticated
WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can update commercial proposals"
ON public.commercial_proposals FOR UPDATE
TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()))
WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can delete commercial proposals"
ON public.commercial_proposals FOR DELETE
TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE INDEX idx_cp_org ON public.commercial_proposals(organization_id);
CREATE INDEX idx_cp_orcamento ON public.commercial_proposals(orcamento_id);
CREATE INDEX idx_cp_status ON public.commercial_proposals(status);

CREATE TRIGGER trg_cp_updated_at
BEFORE UPDATE ON public.commercial_proposals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
