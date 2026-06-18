
CREATE TABLE public.budget_lineage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  orcamento_id uuid NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  commercial_proposal_id uuid REFERENCES public.commercial_proposals(id) ON DELETE SET NULL,
  budget_version_id uuid REFERENCES public.budget_versions(id) ON DELETE SET NULL,
  base_budget_id uuid REFERENCES public.orcamentos(id) ON DELETE SET NULL,
  closing_sheet_id uuid REFERENCES public.closing_sheets(id) ON DELETE SET NULL,
  adjudicated_at timestamptz,
  adjudicated_by uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_lineage TO authenticated;
GRANT ALL ON public.budget_lineage TO service_role;

ALTER TABLE public.budget_lineage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view lineage"
ON public.budget_lineage FOR SELECT TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can insert lineage"
ON public.budget_lineage FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can update lineage"
ON public.budget_lineage FOR UPDATE TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()))
WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can delete lineage"
ON public.budget_lineage FOR DELETE TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE INDEX idx_bl_org ON public.budget_lineage(organization_id);
CREATE INDEX idx_bl_orcamento ON public.budget_lineage(orcamento_id);
CREATE INDEX idx_bl_obra ON public.budget_lineage(obra_id);

CREATE TRIGGER trg_bl_updated_at
BEFORE UPDATE ON public.budget_lineage
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: when orcamento becomes 'adjudicado', register lineage row
CREATE OR REPLACE FUNCTION public.handle_orcamento_adjudicado_lineage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_proposal_id uuid;
BEGIN
  IF NEW.status = 'adjudicado' AND (OLD.status IS DISTINCT FROM 'adjudicado') THEN
    v_org_id := public.get_user_org_id(NEW.user_id);
    IF v_org_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT id INTO v_proposal_id
    FROM public.commercial_proposals
    WHERE orcamento_id = NEW.id AND status = 'accepted'
    ORDER BY version DESC
    LIMIT 1;

    INSERT INTO public.budget_lineage (
      organization_id, orcamento_id, obra_id, commercial_proposal_id,
      base_budget_id, adjudicated_at, adjudicated_by, metadata
    ) VALUES (
      v_org_id, NEW.id, NEW.obra_id, v_proposal_id,
      NEW.id, now(), auth.uid(),
      jsonb_build_object('valor_adjudicado', NEW.valor_adjudicado)
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orcamento_adjudicado_lineage ON public.orcamentos;
CREATE TRIGGER trg_orcamento_adjudicado_lineage
AFTER UPDATE OF status ON public.orcamentos
FOR EACH ROW EXECUTE FUNCTION public.handle_orcamento_adjudicado_lineage();
