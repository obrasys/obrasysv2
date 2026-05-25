
-- 1) Bloqueio no orçamento base
ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_reason text;

-- 2) budget_versions
CREATE TABLE IF NOT EXISTS public.budget_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid,
  obra_id uuid,
  source_budget_id uuid NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  parent_version_id uuid REFERENCES public.budget_versions(id) ON DELETE SET NULL,
  version_type text NOT NULL CHECK (version_type IN ('base_dry','target','initial_closing','final_closing')),
  version_number integer NOT NULL DEFAULT 1,
  version_name text,
  reason text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','under_review','approved','locked','active','superseded','closed','archived')),
  total_base numeric NOT NULL DEFAULT 0,
  total_target numeric NOT NULL DEFAULT 0,
  total_awarded numeric NOT NULL DEFAULT 0,
  total_purchased numeric NOT NULL DEFAULT 0,
  total_remaining numeric NOT NULL DEFAULT 0,
  variance_from_base numeric NOT NULL DEFAULT 0,
  variance_from_previous numeric NOT NULL DEFAULT 0,
  approved_by uuid,
  approved_at timestamptz,
  locked_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_versions_source ON public.budget_versions(source_budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_versions_obra ON public.budget_versions(obra_id);
CREATE INDEX IF NOT EXISTS idx_budget_versions_user ON public.budget_versions(user_id);

-- Apenas uma versão target ativa por orçamento (cobre o caso sem obra)
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_target_per_budget
  ON public.budget_versions(source_budget_id)
  WHERE version_type = 'target' AND status = 'active';

ALTER TABLE public.budget_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view budget versions"
  ON public.budget_versions FOR SELECT
  USING (user_id = ANY (public.get_org_member_ids()));

CREATE POLICY "Org members can insert budget versions"
  ON public.budget_versions FOR INSERT
  WITH CHECK (user_id = ANY (public.get_org_member_ids()));

CREATE POLICY "Org members can update budget versions"
  ON public.budget_versions FOR UPDATE
  USING (user_id = ANY (public.get_org_member_ids()));

CREATE POLICY "Org members can delete budget versions"
  ON public.budget_versions FOR DELETE
  USING (user_id = ANY (public.get_org_member_ids()));

CREATE TRIGGER trg_budget_versions_updated_at
  BEFORE UPDATE ON public.budget_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) budget_version_items
CREATE TABLE IF NOT EXISTS public.budget_version_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_version_id uuid NOT NULL REFERENCES public.budget_versions(id) ON DELETE CASCADE,
  source_artigo_id uuid,
  source_capitulo_id uuid,
  chapter_code text,
  chapter_name text,
  codigo text,
  description text NOT NULL,
  unit text,
  base_quantity numeric NOT NULL DEFAULT 0,
  base_unit_price numeric NOT NULL DEFAULT 0,
  base_total numeric NOT NULL DEFAULT 0,
  target_quantity numeric NOT NULL DEFAULT 0,
  target_unit_price numeric NOT NULL DEFAULT 0,
  target_total numeric NOT NULL DEFAULT 0,
  awarded_amount numeric NOT NULL DEFAULT 0,
  purchased_amount numeric NOT NULL DEFAULT 0,
  remaining_amount numeric NOT NULL DEFAULT 0,
  variance_from_base numeric NOT NULL DEFAULT 0,
  variance_from_previous numeric NOT NULL DEFAULT 0,
  contracting_status text NOT NULL DEFAULT 'open'
    CHECK (contracting_status IN ('open','in_quote','awarded','purchased','closed')),
  package_id uuid,
  supplier_id uuid,
  notes text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bvi_version ON public.budget_version_items(budget_version_id);
CREATE INDEX IF NOT EXISTS idx_bvi_source_artigo ON public.budget_version_items(source_artigo_id);

ALTER TABLE public.budget_version_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view version items"
  ON public.budget_version_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.budget_versions bv
    WHERE bv.id = budget_version_id AND bv.user_id = ANY (public.get_org_member_ids())
  ));

CREATE POLICY "Org members can insert version items"
  ON public.budget_version_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.budget_versions bv
    WHERE bv.id = budget_version_id AND bv.user_id = ANY (public.get_org_member_ids())
  ));

CREATE POLICY "Org members can update version items"
  ON public.budget_version_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.budget_versions bv
    WHERE bv.id = budget_version_id AND bv.user_id = ANY (public.get_org_member_ids())
  ));

CREATE POLICY "Org members can delete version items"
  ON public.budget_version_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.budget_versions bv
    WHERE bv.id = budget_version_id AND bv.user_id = ANY (public.get_org_member_ids())
  ));

CREATE TRIGGER trg_bvi_updated_at
  BEFORE UPDATE ON public.budget_version_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) closing_sheets
CREATE TABLE IF NOT EXISTS public.closing_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid,
  obra_id uuid,
  source_budget_id uuid REFERENCES public.orcamentos(id) ON DELETE SET NULL,
  budget_version_id uuid REFERENCES public.budget_versions(id) ON DELETE SET NULL,
  closing_type text NOT NULL CHECK (closing_type IN ('initial','final')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','locked')),
  total_direct_cost numeric NOT NULL DEFAULT 0,
  total_indirect_cost numeric NOT NULL DEFAULT 0,
  site_costs numeric NOT NULL DEFAULT 0,
  structure_costs numeric NOT NULL DEFAULT 0,
  contingency_amount numeric NOT NULL DEFAULT 0,
  margin_amount numeric NOT NULL DEFAULT 0,
  margin_percent numeric NOT NULL DEFAULT 0,
  sale_price numeric NOT NULL DEFAULT 0,
  expected_result numeric NOT NULL DEFAULT 0,
  final_result numeric,
  snapshot jsonb,
  approved_by uuid,
  approved_at timestamptz,
  locked_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_closing_sheets_budget ON public.closing_sheets(source_budget_id);
CREATE INDEX IF NOT EXISTS idx_closing_sheets_obra ON public.closing_sheets(obra_id);

ALTER TABLE public.closing_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view closing sheets"
  ON public.closing_sheets FOR SELECT
  USING (user_id = ANY (public.get_org_member_ids()));

CREATE POLICY "Org members can insert closing sheets"
  ON public.closing_sheets FOR INSERT
  WITH CHECK (user_id = ANY (public.get_org_member_ids()));

CREATE POLICY "Org members can update closing sheets"
  ON public.closing_sheets FOR UPDATE
  USING (user_id = ANY (public.get_org_member_ids()) AND status <> 'locked');

CREATE POLICY "Org members can delete closing sheets"
  ON public.closing_sheets FOR DELETE
  USING (user_id = ANY (public.get_org_member_ids()) AND status <> 'locked');

CREATE TRIGGER trg_closing_sheets_updated_at
  BEFORE UPDATE ON public.closing_sheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Trigger de bloqueio de edição no orçamento base seco aprovado
CREATE OR REPLACE FUNCTION public.prevent_locked_budget_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_locked boolean;
  v_orcamento_id uuid;
BEGIN
  IF public.is_super_admin() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_NAME = 'orcamentos' THEN
    IF TG_OP = 'UPDATE' THEN
      -- Só permitir alterar os próprios campos de bloqueio/estado
      IF OLD.is_locked = true
         AND (NEW.is_locked = OLD.is_locked)
         AND (NEW.status = OLD.status)
         AND (NEW.titulo IS DISTINCT FROM OLD.titulo
              OR NEW.valor_total IS DISTINCT FROM OLD.valor_total
              OR NEW.margem_lucro IS DISTINCT FROM OLD.margem_lucro
              OR NEW.custos_indiretos IS DISTINCT FROM OLD.custos_indiretos)
      THEN
        RAISE EXCEPTION 'Orçamento bloqueado: as alterações devem ser feitas no Budget Objetivo.';
      END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_NAME = 'capitulos_orcamento' THEN
    v_orcamento_id := COALESCE(NEW.orcamento_id, OLD.orcamento_id);
    SELECT is_locked INTO v_locked FROM public.orcamentos WHERE id = v_orcamento_id;
    IF v_locked THEN
      RAISE EXCEPTION 'Orçamento bloqueado: capítulos não podem ser alterados.';
    END IF;
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_NAME = 'artigos_orcamento' THEN
    SELECT o.is_locked INTO v_locked
    FROM public.capitulos_orcamento c
    JOIN public.orcamentos o ON o.id = c.orcamento_id
    WHERE c.id = COALESCE(NEW.capitulo_id, OLD.capitulo_id);
    IF v_locked THEN
      RAISE EXCEPTION 'Orçamento bloqueado: artigos não podem ser alterados.';
    END IF;
    RETURN COALESCE(NEW, OLD);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_orcamentos ON public.orcamentos;
CREATE TRIGGER trg_lock_orcamentos
  BEFORE UPDATE ON public.orcamentos
  FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_budget_edit();

DROP TRIGGER IF EXISTS trg_lock_capitulos ON public.capitulos_orcamento;
CREATE TRIGGER trg_lock_capitulos
  BEFORE INSERT OR UPDATE OR DELETE ON public.capitulos_orcamento
  FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_budget_edit();

DROP TRIGGER IF EXISTS trg_lock_artigos ON public.artigos_orcamento;
CREATE TRIGGER trg_lock_artigos
  BEFORE INSERT OR UPDATE OR DELETE ON public.artigos_orcamento
  FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_budget_edit();

-- 6) Trigger: closing_sheets bloqueada não pode ser alterada
CREATE OR REPLACE FUNCTION public.prevent_locked_closing_sheet_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_super_admin() THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'locked' THEN
    RAISE EXCEPTION 'Folha de Fecho bloqueada: não pode ser alterada.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_closing_sheets ON public.closing_sheets;
CREATE TRIGGER trg_lock_closing_sheets
  BEFORE UPDATE ON public.closing_sheets
  FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_closing_sheet_edit();

-- 7) RPC: aprovar Base Seco -> bloqueia + cria Folha Fecho Inicial + cria Budget Objetivo v1
CREATE OR REPLACE FUNCTION public.approve_base_dry_budget(p_orcamento_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_orc record;
  v_base_version_id uuid;
  v_target_version_id uuid;
  v_closing_id uuid;
  v_ci numeric;
  v_subtotal numeric;
  v_margem numeric;
  v_sale numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  SELECT * INTO v_orc FROM public.orcamentos WHERE id = p_orcamento_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orçamento não encontrado'; END IF;
  IF v_orc.user_id <> ALL (public.get_org_member_ids()) THEN
    RAISE EXCEPTION 'Sem permissões';
  END IF;
  IF v_orc.is_locked THEN
    RAISE EXCEPTION 'Orçamento já está bloqueado';
  END IF;

  v_ci := COALESCE((v_orc.custos_indiretos->>'estaleiro')::numeric,0)
        + COALESCE((v_orc.custos_indiretos->>'seguros')::numeric,0)
        + COALESCE((v_orc.custos_indiretos->>'licenciamento')::numeric,0);
  v_subtotal := COALESCE(v_orc.valor_total,0) + v_ci;
  v_margem := COALESCE(v_orc.margem_lucro,0) / 100.0;
  v_sale := CASE WHEN v_margem > 0 AND v_margem < 1 THEN v_subtotal / (1 - v_margem) ELSE v_subtotal END;

  -- versão base seco (snapshot)
  INSERT INTO public.budget_versions (
    user_id, organization_id, obra_id, source_budget_id,
    version_type, version_number, version_name, status,
    total_base, total_target, approved_by, approved_at, locked_at
  ) VALUES (
    v_orc.user_id, public.get_user_org_id(), v_orc.obra_id, v_orc.id,
    'base_dry', 1, 'Base Seco', 'locked',
    v_subtotal, v_subtotal, v_uid, now(), now()
  ) RETURNING id INTO v_base_version_id;

  INSERT INTO public.budget_version_items (
    budget_version_id, source_artigo_id, source_capitulo_id,
    chapter_code, chapter_name, codigo, description, unit,
    base_quantity, base_unit_price, base_total,
    target_quantity, target_unit_price, target_total,
    remaining_amount, ordem
  )
  SELECT
    v_base_version_id, a.id, c.id,
    c.numero::text, c.titulo, a.codigo, a.descricao, a.unidade,
    a.quantidade, a.preco_unitario, a.valor_total,
    a.quantidade, a.preco_unitario, a.valor_total,
    a.valor_total, a.ordem
  FROM public.artigos_orcamento a
  JOIN public.capitulos_orcamento c ON c.id = a.capitulo_id
  WHERE c.orcamento_id = v_orc.id;

  -- folha de fecho inicial
  INSERT INTO public.closing_sheets (
    user_id, organization_id, obra_id, source_budget_id, budget_version_id,
    closing_type, status,
    total_direct_cost, total_indirect_cost, site_costs,
    margin_amount, margin_percent, sale_price, expected_result,
    approved_by, approved_at, locked_at,
    snapshot
  ) VALUES (
    v_orc.user_id, public.get_user_org_id(), v_orc.obra_id, v_orc.id, v_base_version_id,
    'initial', 'locked',
    COALESCE(v_orc.valor_total,0), v_ci, COALESCE((v_orc.custos_indiretos->>'estaleiro')::numeric,0),
    v_sale - v_subtotal, v_orc.margem_lucro, v_sale, v_sale - v_subtotal,
    v_uid, now(), now(),
    jsonb_build_object('custos_indiretos', v_orc.custos_indiretos, 'valor_total', v_orc.valor_total, 'margem_lucro', v_orc.margem_lucro)
  ) RETURNING id INTO v_closing_id;

  -- budget objetivo v1 ativo
  INSERT INTO public.budget_versions (
    user_id, organization_id, obra_id, source_budget_id, parent_version_id,
    version_type, version_number, version_name, status,
    total_base, total_target, total_remaining,
    created_by
  ) VALUES (
    v_orc.user_id, public.get_user_org_id(), v_orc.obra_id, v_orc.id, v_base_version_id,
    'target', 1, 'Budget Objetivo v1', 'active',
    v_subtotal, v_subtotal, v_subtotal,
    v_uid
  ) RETURNING id INTO v_target_version_id;

  INSERT INTO public.budget_version_items (
    budget_version_id, source_artigo_id, source_capitulo_id,
    chapter_code, chapter_name, codigo, description, unit,
    base_quantity, base_unit_price, base_total,
    target_quantity, target_unit_price, target_total,
    remaining_amount, ordem
  )
  SELECT
    v_target_version_id, a.id, c.id,
    c.numero::text, c.titulo, a.codigo, a.descricao, a.unidade,
    a.quantidade, a.preco_unitario, a.valor_total,
    a.quantidade, a.preco_unitario, a.valor_total,
    a.valor_total, a.ordem
  FROM public.artigos_orcamento a
  JOIN public.capitulos_orcamento c ON c.id = a.capitulo_id
  WHERE c.orcamento_id = v_orc.id;

  -- bloquear orçamento
  UPDATE public.orcamentos
  SET status = 'aprovado',
      is_locked = true,
      locked_at = now(),
      locked_reason = 'Aprovado e congelado como Base Seco. Use o Budget Objetivo para alterações.'
  WHERE id = p_orcamento_id;

  RETURN jsonb_build_object(
    'base_version_id', v_base_version_id,
    'target_version_id', v_target_version_id,
    'initial_closing_id', v_closing_id
  );
END;
$$;

-- 8) RPC: criar nova versão do Budget Objetivo a partir da ativa
CREATE OR REPLACE FUNCTION public.create_new_target_version(p_source_budget_id uuid, p_reason text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_active record;
  v_new_id uuid;
  v_next_no integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  SELECT * INTO v_active FROM public.budget_versions
  WHERE source_budget_id = p_source_budget_id
    AND version_type = 'target' AND status = 'active'
  LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sem versão ativa para evoluir'; END IF;

  IF v_active.user_id <> ALL (public.get_org_member_ids()) THEN
    RAISE EXCEPTION 'Sem permissões';
  END IF;

  SELECT COALESCE(MAX(version_number),0)+1 INTO v_next_no
  FROM public.budget_versions
  WHERE source_budget_id = p_source_budget_id AND version_type = 'target';

  -- Marcar atual como substituída
  UPDATE public.budget_versions SET status = 'superseded' WHERE id = v_active.id;

  -- Criar nova
  INSERT INTO public.budget_versions (
    user_id, organization_id, obra_id, source_budget_id, parent_version_id,
    version_type, version_number, version_name, status, reason,
    total_base, total_target, total_awarded, total_purchased, total_remaining,
    created_by
  ) VALUES (
    v_active.user_id, v_active.organization_id, v_active.obra_id, p_source_budget_id, v_active.id,
    'target', v_next_no, 'Budget Objetivo v'||v_next_no, 'active', p_reason,
    v_active.total_base, v_active.total_target, v_active.total_awarded, v_active.total_purchased, v_active.total_remaining,
    v_uid
  ) RETURNING id INTO v_new_id;

  -- Copiar items
  INSERT INTO public.budget_version_items (
    budget_version_id, source_artigo_id, source_capitulo_id,
    chapter_code, chapter_name, codigo, description, unit,
    base_quantity, base_unit_price, base_total,
    target_quantity, target_unit_price, target_total,
    awarded_amount, purchased_amount, remaining_amount,
    variance_from_base, contracting_status, package_id, supplier_id, notes, ordem
  )
  SELECT
    v_new_id, source_artigo_id, source_capitulo_id,
    chapter_code, chapter_name, codigo, description, unit,
    base_quantity, base_unit_price, base_total,
    target_quantity, target_unit_price, target_total,
    awarded_amount, purchased_amount, remaining_amount,
    variance_from_base, contracting_status, package_id, supplier_id, notes, ordem
  FROM public.budget_version_items WHERE budget_version_id = v_active.id;

  RETURN v_new_id;
END;
$$;
