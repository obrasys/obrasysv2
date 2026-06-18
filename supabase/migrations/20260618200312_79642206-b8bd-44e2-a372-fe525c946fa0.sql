
CREATE TABLE public.axia_budget_review_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  orcamento_id uuid REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  budget_version_id uuid REFERENCES public.budget_versions(id) ON DELETE CASCADE,
  artigo_id uuid,
  capitulo_id uuid,
  item_type text NOT NULL CHECK (item_type IN ('missing_price','suspect_quantity','ambiguous_unit','doc_mismatch','human_question','missing_chapter','other')),
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','modified','dismissed')),
  title text NOT NULL,
  description text,
  axia_suggestion jsonb,
  original_value jsonb,
  user_action jsonb,
  source_document_id uuid,
  source_page integer,
  source_line text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.axia_budget_review_items TO authenticated;
GRANT ALL ON public.axia_budget_review_items TO service_role;

ALTER TABLE public.axia_budget_review_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view review items"
ON public.axia_budget_review_items FOR SELECT
TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can insert review items"
ON public.axia_budget_review_items FOR INSERT
TO authenticated
WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can update review items"
ON public.axia_budget_review_items FOR UPDATE
TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()))
WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can delete review items"
ON public.axia_budget_review_items FOR DELETE
TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE INDEX idx_abri_org ON public.axia_budget_review_items(organization_id);
CREATE INDEX idx_abri_orcamento ON public.axia_budget_review_items(orcamento_id);
CREATE INDEX idx_abri_version ON public.axia_budget_review_items(budget_version_id);
CREATE INDEX idx_abri_status ON public.axia_budget_review_items(status);
CREATE INDEX idx_abri_severity ON public.axia_budget_review_items(severity);

CREATE TRIGGER trg_abri_updated_at
BEFORE UPDATE ON public.axia_budget_review_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
