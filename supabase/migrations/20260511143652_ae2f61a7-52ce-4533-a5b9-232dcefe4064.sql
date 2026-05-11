-- 1. Atributos técnicos elétricos em plan_placed_elements
ALTER TABLE public.plan_placed_elements
  ADD COLUMN IF NOT EXISTS installation_height text,
  ADD COLUMN IF NOT EXISTS circuit_number text,
  ADD COLUMN IF NOT EXISTS distribution_board text,
  ADD COLUMN IF NOT EXISTS voltage numeric,
  ADD COLUMN IF NOT EXISTS power_w numeric,
  ADD COLUMN IF NOT EXISTS cable_section_mm2 numeric,
  ADD COLUMN IF NOT EXISTS breaker_rating_a numeric,
  ADD COLUMN IF NOT EXISTS is_existing boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS room_name text,
  ADD COLUMN IF NOT EXISTS technical_note text,
  ADD COLUMN IF NOT EXISTS data_source text DEFAULT 'user_manual_input',
  ADD COLUMN IF NOT EXISTS sheet_subtype text,
  ADD COLUMN IF NOT EXISTS review_required boolean DEFAULT false;

-- 2. Mesmos atributos em specialty_detected_elements
ALTER TABLE public.specialty_detected_elements
  ADD COLUMN IF NOT EXISTS installation_height text,
  ADD COLUMN IF NOT EXISTS circuit_number text,
  ADD COLUMN IF NOT EXISTS distribution_board text,
  ADD COLUMN IF NOT EXISTS voltage numeric,
  ADD COLUMN IF NOT EXISTS power_w numeric,
  ADD COLUMN IF NOT EXISTS cable_section_mm2 numeric,
  ADD COLUMN IF NOT EXISTS breaker_rating_a numeric,
  ADD COLUMN IF NOT EXISTS is_existing boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS room_name text,
  ADD COLUMN IF NOT EXISTS technical_note text,
  ADD COLUMN IF NOT EXISTS data_source text DEFAULT 'user_manual_input',
  ADD COLUMN IF NOT EXISTS sheet_subtype text;

-- 3. Tabela de circuitos elétricos extraídos (info técnica, não orçamentável diretamente)
CREATE TABLE IF NOT EXISTS public.plan_electrical_circuits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_import_id uuid REFERENCES public.plan_imports(id) ON DELETE CASCADE,
  specialty_plan_id uuid REFERENCES public.specialty_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  circuit_number text,
  description text,
  distribution_board text,
  voltage numeric,
  power_w numeric,
  cable_section_mm2 numeric,
  breaker_rating_a numeric,
  source_sheet_subtype text,
  data_source text NOT NULL DEFAULT 'electrical_diagram',
  technical_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plan_electrical_circuits_owner CHECK (
    plan_import_id IS NOT NULL OR specialty_plan_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_plan_electrical_circuits_plan
  ON public.plan_electrical_circuits(plan_import_id);
CREATE INDEX IF NOT EXISTS idx_plan_electrical_circuits_specialty
  ON public.plan_electrical_circuits(specialty_plan_id);

ALTER TABLE public.plan_electrical_circuits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org can view electrical circuits" ON public.plan_electrical_circuits;
CREATE POLICY "Org can view electrical circuits"
  ON public.plan_electrical_circuits FOR SELECT
  USING (user_id = ANY(public.get_org_member_ids()));

DROP POLICY IF EXISTS "Org can insert electrical circuits" ON public.plan_electrical_circuits;
CREATE POLICY "Org can insert electrical circuits"
  ON public.plan_electrical_circuits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Org can update electrical circuits" ON public.plan_electrical_circuits;
CREATE POLICY "Org can update electrical circuits"
  ON public.plan_electrical_circuits FOR UPDATE
  USING (user_id = ANY(public.get_org_member_ids()));

DROP POLICY IF EXISTS "Org can delete electrical circuits" ON public.plan_electrical_circuits;
CREATE POLICY "Org can delete electrical circuits"
  ON public.plan_electrical_circuits FOR DELETE
  USING (user_id = ANY(public.get_org_member_ids()));

DROP TRIGGER IF EXISTS trg_plan_electrical_circuits_updated_at ON public.plan_electrical_circuits;
CREATE TRIGGER trg_plan_electrical_circuits_updated_at
  BEFORE UPDATE ON public.plan_electrical_circuits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Atualizar vista de quantitativos para incluir elementos colocados (símbolos elétricos/especialidades)
CREATE OR REPLACE VIEW public.plan_quantitativos_v
WITH (security_invoker = true)
AS
SELECT * FROM (
  -- (mantém todas as fontes existentes)
  SELECT m.id, m.plan_import_id, pi.obra_id, m.user_id,
    'medicao'::text AS source, m.tipo AS source_subtype,
    COALESCE(m.etiqueta, initcap(m.tipo)) AS descricao,
    m.tipo AS categoria,
    COALESCE(NULLIF(m.camada, ''::text), 'sem_camada'::text) AS camada,
    COALESCE(m.valor_ajustado, m.valor_bruto) AS valor, m.unidade,
    COALESCE(m.confidence, 'provavel'::text) AS confidence,
    COALESCE(m.measurement_origin, 'manual'::text) AS origem,
    m.estado_validacao, m.floor_id, m.page_id, m.cor, m.action_type,
    m.room_id, NULL::text AS symbol_type_id, m.created_at, m.updated_at
  FROM plan_measurements m JOIN plan_imports pi ON pi.id = m.plan_import_id

  UNION ALL
  SELECT r.id, r.plan_import_id, pi.obra_id, r.user_id,
    'compartimento'::text, 'pavimento'::text,
    COALESCE(r.nome, 'Compartimento'::text),
    COALESCE(r.tipo_compartimento, 'habitacao'::text),
    'pavimento'::text, COALESCE(r.area_m2, 0::numeric), 'm2'::text,
    COALESCE(r.confidence, 'provavel'::text), COALESCE(r.origem, 'manual'::text),
    CASE WHEN COALESCE(r.area_m2, 0::numeric) = 0 THEN 'pendente' ELSE r.estado_validacao END,
    r.floor_id, r.page_id, '#22c55e'::text, NULL::text, r.id, NULL::text,
    r.created_at, r.updated_at
  FROM plan_rooms r JOIN plan_imports pi ON pi.id = r.plan_import_id

  UNION ALL
  SELECT r.id, r.plan_import_id, pi.obra_id, r.user_id,
    'compartimento'::text, 'teto'::text,
    COALESCE(r.nome, 'Compartimento'::text) || ' — Teto'::text,
    COALESCE(r.tipo_compartimento, 'habitacao'::text),
    'teto'::text, COALESCE(r.area_m2, 0::numeric), 'm2'::text,
    COALESCE(r.confidence, 'provavel'::text), COALESCE(r.origem, 'manual'::text),
    CASE WHEN COALESCE(r.area_m2, 0::numeric) = 0 THEN 'pendente' ELSE r.estado_validacao END,
    r.floor_id, r.page_id, '#a3e635'::text, NULL::text, r.id, NULL::text,
    r.created_at, r.updated_at
  FROM plan_rooms r JOIN plan_imports pi ON pi.id = r.plan_import_id

  UNION ALL
  SELECT r.id, r.plan_import_id, pi.obra_id, r.user_id,
    'compartimento'::text, 'rodape'::text,
    COALESCE(r.nome, 'Compartimento'::text) || ' — Rodapé'::text,
    COALESCE(r.tipo_compartimento, 'habitacao'::text),
    'rodape'::text, COALESCE(r.perimetro_m, 0::numeric), 'm'::text,
    COALESCE(r.confidence, 'provavel'::text), COALESCE(r.origem, 'manual'::text),
    CASE WHEN COALESCE(r.perimetro_m, 0::numeric) = 0 THEN 'pendente' ELSE r.estado_validacao END,
    r.floor_id, r.page_id, '#84cc16'::text, NULL::text, r.id, NULL::text,
    r.created_at, r.updated_at
  FROM plan_rooms r JOIN plan_imports pi ON pi.id = r.plan_import_id

  UNION ALL
  SELECT s.id, s.plan_import_id, pi.obra_id, s.user_id,
    'escada'::text, 'corrimao'::text, 'Escada — Corrimão'::text,
    'escada'::text, 'acabamento'::text,
    COALESCE(s.handrail_length_m, s.steps_count::numeric * s.tread_depth_m), 'm'::text,
    COALESCE(s.confidence, 'provavel'::text),
    CASE WHEN s.handrail_length_m IS NULL THEN 'derivado' ELSE 'manual' END,
    'pendente'::text, s.origin_floor_id, s.page_id, '#ef4444'::text, NULL::text,
    NULL::uuid, NULL::text, s.created_at, s.updated_at
  FROM plan_stairs s JOIN plan_imports pi ON pi.id = s.plan_import_id
  WHERE s.has_handrail = true AND COALESCE(s.handrail_length_m, s.steps_count::numeric * s.tread_depth_m) > 0

  UNION ALL
  SELECT s.id, s.plan_import_id, pi.obra_id, s.user_id,
    'escada'::text, 'guarda_corpo'::text, 'Escada — Guarda-corpo'::text,
    'escada'::text, 'seguranca'::text,
    COALESCE(s.guardrail_length_m, s.steps_count::numeric * s.tread_depth_m), 'm'::text,
    COALESCE(s.confidence, 'provavel'::text),
    CASE WHEN s.guardrail_length_m IS NULL THEN 'derivado' ELSE 'manual' END,
    'pendente'::text, s.origin_floor_id, s.page_id, '#b91c1c'::text, NULL::text,
    NULL::uuid, NULL::text, s.created_at, s.updated_at
  FROM plan_stairs s JOIN plan_imports pi ON pi.id = s.plan_import_id
  WHERE s.has_guardrail = true AND COALESCE(s.guardrail_length_m, s.steps_count::numeric * s.tread_depth_m) > 0

  UNION ALL
  SELECT ai.id, NULL::uuid, ai.obra_id, ai.user_id,
    'outros'::text, COALESCE(ai.category, 'geral'::text),
    ai.description, COALESCE(ai.category, 'geral'::text), 'adicional'::text,
    ai.quantity, ai.unit, 'confirmado'::text, 'manual'::text, 'validado'::text,
    ai.floor_id, NULL::uuid, '#64748b'::text, NULL::text, ai.room_id, NULL::text,
    ai.created_at, ai.updated_at
  FROM plan_additional_items ai

  -- NOVO: símbolos colocados (Axia + manual) — contam como elementos elétricos/especialidades
  UNION ALL
  SELECT pe.id, pe.plan_import_id, pi.obra_id, pe.user_id,
    'especialidade'::text AS source,
    pe.symbol_type_id AS source_subtype,
    COALESCE(NULLIF(pe.note, ''), pe.symbol_type_id) AS descricao,
    pe.category AS categoria,
    COALESCE(NULLIF(pe.subcategory, ''), pe.category) AS camada,
    COALESCE(pe.quantity, 1)::numeric AS valor,
    'un'::text AS unidade,
    'provavel'::text AS confidence,
    pe.origin AS origem,
    CASE WHEN COALESCE(pe.review_required, false) THEN 'pendente' ELSE 'validado' END AS estado_validacao,
    NULL::uuid AS floor_id,
    NULL::uuid AS page_id,
    '#f59e0b'::text AS cor,
    NULL::text AS action_type,
    NULL::uuid AS room_id,
    pe.symbol_type_id,
    pe.created_at, pe.updated_at
  FROM plan_placed_elements pe
  JOIN plan_imports pi ON pi.id = pe.plan_import_id
) q;