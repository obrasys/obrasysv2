
-- Clean orphan references first to avoid FK violations
UPDATE public.artigos_orcamento ao
SET linked_rule_id = NULL
WHERE linked_rule_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.parametric_rules pr WHERE pr.id = ao.linked_rule_id);

UPDATE public.artigos_orcamento ao
SET linked_element_id = NULL
WHERE linked_element_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.constructive_elements ce WHERE ce.id = ao.linked_element_id);

ALTER TABLE public.artigos_orcamento
  ADD CONSTRAINT artigos_orcamento_linked_rule_id_fkey
  FOREIGN KEY (linked_rule_id) REFERENCES public.parametric_rules(id) ON DELETE SET NULL;

ALTER TABLE public.artigos_orcamento
  ADD CONSTRAINT artigos_orcamento_linked_element_id_fkey
  FOREIGN KEY (linked_element_id) REFERENCES public.constructive_elements(id) ON DELETE SET NULL;

-- Allow authenticated org users (non-suppliers) to discover active suppliers in the marketplace
CREATE POLICY "supplier_profiles_active_marketplace_read"
ON public.supplier_profiles
FOR SELECT
TO authenticated
USING (status = 'active');
