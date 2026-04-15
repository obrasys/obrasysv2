
-- ============================================================
-- ICF MODULE — Full Schema
-- ============================================================

-- 1. icf_configuracoes
CREATE TABLE public.icf_configuracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL DEFAULT public.get_user_org_id(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  nome text NOT NULL,
  versao integer NOT NULL DEFAULT 1,
  ativo boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','validado','congelado')),
  espessura_nucleo numeric(10,3) NOT NULL DEFAULT 0.15,
  classe_betao text NOT NULL DEFAULT 'C30/37',
  classe_aco text NOT NULL DEFAULT 'A500',
  recobrimento_mm numeric(10,2),
  altura_piso_padrao numeric(10,2),
  tipologia_fundacao text,
  tipologia_laje text,
  fator_perdas numeric(10,4) NOT NULL DEFAULT 0,
  fator_transpasse numeric(10,4) NOT NULL DEFAULT 0,
  regras_desconto_vaos jsonb DEFAULT '{}',
  notas_tecnicas text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_icf_config_empresa_obra ON public.icf_configuracoes(empresa_id, obra_id);
CREATE INDEX idx_icf_config_obra_ativo ON public.icf_configuracoes(obra_id, ativo);
CREATE INDEX idx_icf_config_empresa_status ON public.icf_configuracoes(empresa_id, status);

ALTER TABLE public.icf_configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "icf_config_select" ON public.icf_configuracoes FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_config_insert" ON public.icf_configuracoes FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_config_update" ON public.icf_configuracoes FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_config_delete" ON public.icf_configuracoes FOR DELETE TO authenticated
  USING (empresa_id = public.get_user_org_id());

CREATE TRIGGER update_icf_configuracoes_updated_at
  BEFORE UPDATE ON public.icf_configuracoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. icf_panos_parede
CREATE TABLE public.icf_panos_parede (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL DEFAULT public.get_user_org_id(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  configuracao_id uuid NOT NULL REFERENCES public.icf_configuracoes(id) ON DELETE CASCADE,
  referencia text NOT NULL,
  piso_inicial text,
  piso_final text,
  altura_util numeric(10,2) NOT NULL,
  comprimento numeric(10,2) NOT NULL,
  espessura_nucleo numeric(10,3) NOT NULL DEFAULT 0.15,
  area_bruta numeric(12,3) GENERATED ALWAYS AS (comprimento * altura_util) STORED,
  area_vaos numeric(12,3) NOT NULL DEFAULT 0,
  area_liquida numeric(12,3),
  volume_betao numeric(12,3),
  tipo_armadura text DEFAULT 'padrao',
  armadura_vertical text DEFAULT 'Ø10/20',
  armadura_horizontal text DEFAULT 'Ø8/20',
  reforco_transversal text,
  fator_cumprimento numeric(10,4) NOT NULL DEFAULT 1,
  ordem integer DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_icf_panos_empresa_obra ON public.icf_panos_parede(empresa_id, obra_id);
CREATE INDEX idx_icf_panos_config ON public.icf_panos_parede(configuracao_id);
CREATE INDEX idx_icf_panos_obra_piso ON public.icf_panos_parede(obra_id, piso_inicial);

ALTER TABLE public.icf_panos_parede ENABLE ROW LEVEL SECURITY;

CREATE POLICY "icf_panos_select" ON public.icf_panos_parede FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_panos_insert" ON public.icf_panos_parede FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_panos_update" ON public.icf_panos_parede FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_panos_delete" ON public.icf_panos_parede FOR DELETE TO authenticated
  USING (empresa_id = public.get_user_org_id());

-- Trigger to calculate area_liquida and volume_betao on panos
CREATE OR REPLACE FUNCTION public.icf_calc_pano()
  RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  NEW.area_liquida := GREATEST((NEW.comprimento * NEW.altura_util) - NEW.area_vaos, 0);
  NEW.volume_betao := NEW.area_liquida * NEW.espessura_nucleo;
  RETURN NEW;
END;
$$;

CREATE TRIGGER icf_pano_calc
  BEFORE INSERT OR UPDATE ON public.icf_panos_parede
  FOR EACH ROW EXECUTE FUNCTION public.icf_calc_pano();

CREATE TRIGGER update_icf_panos_updated_at
  BEFORE UPDATE ON public.icf_panos_parede
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. icf_vaos
CREATE TABLE public.icf_vaos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL DEFAULT public.get_user_org_id(),
  pano_id uuid NOT NULL REFERENCES public.icf_panos_parede(id) ON DELETE CASCADE,
  tipo_vao text DEFAULT 'janela',
  largura numeric(10,2) NOT NULL,
  altura numeric(10,2) NOT NULL,
  quantidade integer NOT NULL DEFAULT 1,
  area_total numeric(12,3),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_icf_vaos_pano ON public.icf_vaos(pano_id);
CREATE INDEX idx_icf_vaos_empresa ON public.icf_vaos(empresa_id, pano_id);

ALTER TABLE public.icf_vaos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "icf_vaos_select" ON public.icf_vaos FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_vaos_insert" ON public.icf_vaos FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_vaos_update" ON public.icf_vaos FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_vaos_delete" ON public.icf_vaos FOR DELETE TO authenticated
  USING (empresa_id = public.get_user_org_id());

-- Trigger to calc area_total on vaos
CREATE OR REPLACE FUNCTION public.icf_calc_vao()
  RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  NEW.area_total := NEW.largura * NEW.altura * NEW.quantidade;
  RETURN NEW;
END;
$$;

CREATE TRIGGER icf_vao_calc
  BEFORE INSERT OR UPDATE ON public.icf_vaos
  FOR EACH ROW EXECUTE FUNCTION public.icf_calc_vao();

-- Trigger to sync area_vaos on pano when vaos change
CREATE OR REPLACE FUNCTION public.icf_sync_pano_vaos()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_pano_id uuid;
  v_total numeric;
BEGIN
  v_pano_id := COALESCE(NEW.pano_id, OLD.pano_id);
  SELECT COALESCE(SUM(area_total), 0) INTO v_total FROM public.icf_vaos WHERE pano_id = v_pano_id;
  UPDATE public.icf_panos_parede SET area_vaos = v_total WHERE id = v_pano_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER icf_sync_vaos_after
  AFTER INSERT OR UPDATE OR DELETE ON public.icf_vaos
  FOR EACH ROW EXECUTE FUNCTION public.icf_sync_pano_vaos();

-- 4. icf_fundacoes
CREATE TABLE public.icf_fundacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL DEFAULT public.get_user_org_id(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  configuracao_id uuid NOT NULL REFERENCES public.icf_configuracoes(id) ON DELETE CASCADE,
  tipo_fundacao text NOT NULL DEFAULT 'sapata_continua' CHECK (tipo_fundacao IN ('sapata_continua','sapata_isolada','outra')),
  referencia text,
  comprimento numeric(10,2) NOT NULL DEFAULT 0.70,
  largura numeric(10,2) NOT NULL DEFAULT 0.70,
  altura numeric(10,2) NOT NULL DEFAULT 0.45,
  quantidade integer NOT NULL DEFAULT 1,
  volume_betao numeric(12,3),
  aco_estimado_kg numeric(12,3),
  tensao_admissivel_terreno numeric(10,2) DEFAULT 300,
  tensao_calculo numeric(10,2) DEFAULT 200,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_icf_fund_empresa_obra ON public.icf_fundacoes(empresa_id, obra_id);
CREATE INDEX idx_icf_fund_config ON public.icf_fundacoes(configuracao_id);

ALTER TABLE public.icf_fundacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "icf_fund_select" ON public.icf_fundacoes FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_fund_insert" ON public.icf_fundacoes FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_fund_update" ON public.icf_fundacoes FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_fund_delete" ON public.icf_fundacoes FOR DELETE TO authenticated
  USING (empresa_id = public.get_user_org_id());

-- Trigger to calc volume on fundacoes
CREATE OR REPLACE FUNCTION public.icf_calc_fundacao()
  RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  NEW.volume_betao := NEW.comprimento * NEW.largura * NEW.altura * NEW.quantidade;
  RETURN NEW;
END;
$$;

CREATE TRIGGER icf_fundacao_calc
  BEFORE INSERT OR UPDATE ON public.icf_fundacoes
  FOR EACH ROW EXECUTE FUNCTION public.icf_calc_fundacao();

CREATE TRIGGER update_icf_fundacoes_updated_at
  BEFORE UPDATE ON public.icf_fundacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. icf_lajes
CREATE TABLE public.icf_lajes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL DEFAULT public.get_user_org_id(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  configuracao_id uuid NOT NULL REFERENCES public.icf_configuracoes(id) ON DELETE CASCADE,
  referencia text,
  piso text,
  tipologia_laje text DEFAULT 'vigotas_in_situ',
  area numeric(12,2) NOT NULL,
  espessura_total numeric(10,3) DEFAULT 0.17,
  volume numeric(12,3),
  aco_estimado_kg numeric(12,3),
  peso_proprio_kn_m2 numeric(10,3) DEFAULT 2.53,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_icf_lajes_empresa_obra ON public.icf_lajes(empresa_id, obra_id);
CREATE INDEX idx_icf_lajes_config ON public.icf_lajes(configuracao_id);

ALTER TABLE public.icf_lajes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "icf_lajes_select" ON public.icf_lajes FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_lajes_insert" ON public.icf_lajes FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_lajes_update" ON public.icf_lajes FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_lajes_delete" ON public.icf_lajes FOR DELETE TO authenticated
  USING (empresa_id = public.get_user_org_id());

-- Trigger to calc volume on lajes
CREATE OR REPLACE FUNCTION public.icf_calc_laje()
  RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  NEW.volume := NEW.area * NEW.espessura_total;
  RETURN NEW;
END;
$$;

CREATE TRIGGER icf_laje_calc
  BEFORE INSERT OR UPDATE ON public.icf_lajes
  FOR EACH ROW EXECUTE FUNCTION public.icf_calc_laje();

CREATE TRIGGER update_icf_lajes_updated_at
  BEFORE UPDATE ON public.icf_lajes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. icf_audit_log
CREATE TABLE public.icf_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL DEFAULT public.get_user_org_id(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  evento text NOT NULL,
  entidade_tipo text NOT NULL,
  entidade_id uuid,
  dados_anteriores jsonb,
  dados_novos jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_icf_audit_empresa ON public.icf_audit_log(empresa_id);
CREATE INDEX idx_icf_audit_entidade ON public.icf_audit_log(entidade_tipo, entidade_id);

ALTER TABLE public.icf_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "icf_audit_select" ON public.icf_audit_log FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_audit_insert" ON public.icf_audit_log FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_org_id());

-- 7. View resumo
CREATE OR REPLACE VIEW public.icf_resumo_obra AS
SELECT
  c.obra_id,
  c.id AS configuracao_id,
  c.empresa_id,
  c.nome AS config_nome,
  c.status AS config_status,
  COALESCE(p.comprimento_total, 0) AS comprimento_total_paredes,
  COALESCE(p.area_total, 0) AS area_total_paredes,
  COALESCE(p.area_vaos_total, 0) AS area_total_vaos,
  COALESCE(p.area_liquida_total, 0) AS area_liquida_total,
  COALESCE(p.volume_total, 0) AS volume_total_paredes,
  COALESCE(f.volume_total, 0) AS volume_total_fundacoes,
  COALESCE(l.volume_total, 0) AS volume_total_lajes,
  COALESCE(p.volume_total, 0) + COALESCE(f.volume_total, 0) + COALESCE(l.volume_total, 0) AS volume_total_obra,
  COALESCE(f.aco_total, 0) AS aco_total_fundacoes,
  COALESCE(l.aco_total, 0) AS aco_total_lajes,
  COALESCE(p.area_total, 0) + COALESCE(l.area_total, 0) AS area_estrutural_total,
  CASE WHEN COALESCE(p.area_total, 0) + COALESCE(l.area_total, 0) > 0
    THEN ROUND((COALESCE(p.volume_total, 0) + COALESCE(f.volume_total, 0) + COALESCE(l.volume_total, 0)) / (COALESCE(p.area_total, 0) + COALESCE(l.area_total, 0)), 4)
    ELSE 0
  END AS indice_m3_m2,
  CASE WHEN COALESCE(p.area_total, 0) + COALESCE(l.area_total, 0) > 0
    THEN ROUND((COALESCE(f.aco_total, 0) + COALESCE(l.aco_total, 0)) / (COALESCE(p.area_total, 0) + COALESCE(l.area_total, 0)), 2)
    ELSE 0
  END AS indice_kg_m2
FROM public.icf_configuracoes c
LEFT JOIN LATERAL (
  SELECT
    SUM(comprimento) AS comprimento_total,
    SUM(area_bruta) AS area_total,
    SUM(area_vaos) AS area_vaos_total,
    SUM(area_liquida) AS area_liquida_total,
    SUM(volume_betao) AS volume_total
  FROM public.icf_panos_parede WHERE configuracao_id = c.id
) p ON true
LEFT JOIN LATERAL (
  SELECT
    SUM(volume_betao) AS volume_total,
    SUM(aco_estimado_kg) AS aco_total
  FROM public.icf_fundacoes WHERE configuracao_id = c.id
) f ON true
LEFT JOIN LATERAL (
  SELECT
    SUM(volume) AS volume_total,
    SUM(aco_estimado_kg) AS aco_total,
    SUM(area) AS area_total
  FROM public.icf_lajes WHERE configuracao_id = c.id
) l ON true;
