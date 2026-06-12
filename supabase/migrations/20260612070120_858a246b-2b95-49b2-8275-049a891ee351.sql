DROP VIEW IF EXISTS public.plan_quantitativos_v;

CREATE VIEW public.plan_quantitativos_v
WITH (security_invoker = true)
AS
SELECT * FROM (
  SELECT
    m.id, m.plan_import_id, pi.obra_id, m.user_id,
    'medicao'::text AS source, m.tipo AS source_subtype,
    COALESCE(m.etiqueta, initcap(m.tipo)) AS descricao,
    m.tipo AS categoria,
    COALESCE(NULLIF(m.camada, ''), 'sem_camada') AS camada,
    COALESCE(m.valor_ajustado, m.valor_bruto) AS valor,
    m.unidade,
    COALESCE(m.confidence, 'provavel') AS confidence,
    COALESCE(m.measurement_origin, 'manual') AS origem,
    m.estado_validacao,
    m.floor_id, m.page_id, m.cor, m.action_type, m.room_id,
    NULL::text AS symbol_type_id,
    m.created_at, m.updated_at,
    COALESCE(m.disciplina_origem, pi.disciplina::text) AS disciplina_origem,
    COALESCE(m.folha_origem, pp.sheet_title, pp.drawing_code) AS folha_origem,
    COALESCE(m.tipo_folha_origem, pp.sheet_type) AS tipo_folha_origem,
    m.compartimento_origem,
    COALESCE(m.estado_quantitativo, 'confirmado') AS estado_quantitativo,
    COALESCE(m.piso_origem, pp.detected_floor) AS piso_origem_label
  FROM plan_measurements m
  JOIN plan_imports pi ON pi.id = m.plan_import_id
  LEFT JOIN plan_pages pp ON pp.id = m.page_id

  UNION ALL
  SELECT r.id, r.plan_import_id, pi.obra_id, r.user_id,
    'compartimento', 'pavimento',
    COALESCE(r.nome, 'Compartimento'),
    COALESCE(r.tipo_compartimento, 'habitacao'),
    'pavimento',
    COALESCE(r.area_m2, 0), 'm2',
    COALESCE(r.confidence, 'provavel'),
    COALESCE(r.origem, 'manual'),
    CASE WHEN COALESCE(r.area_m2, 0) = 0 THEN 'pendente' ELSE r.estado_validacao END,
    r.floor_id, r.page_id, '#22c55e', NULL, r.id, NULL,
    r.created_at, r.updated_at,
    pi.disciplina::text, pp.sheet_title, pp.sheet_type, r.nome, 'confirmado', pp.detected_floor
  FROM plan_rooms r
  JOIN plan_imports pi ON pi.id = r.plan_import_id
  LEFT JOIN plan_pages pp ON pp.id = r.page_id

  UNION ALL
  SELECT r.id, r.plan_import_id, pi.obra_id, r.user_id,
    'compartimento', 'teto',
    COALESCE(r.nome, 'Compartimento') || ' — Teto',
    COALESCE(r.tipo_compartimento, 'habitacao'),
    'teto',
    COALESCE(r.area_m2, 0), 'm2',
    COALESCE(r.confidence, 'provavel'),
    COALESCE(r.origem, 'manual'),
    CASE WHEN COALESCE(r.area_m2, 0) = 0 THEN 'pendente' ELSE r.estado_validacao END,
    r.floor_id, r.page_id, '#a3e635', NULL, r.id, NULL,
    r.created_at, r.updated_at,
    pi.disciplina::text, pp.sheet_title, pp.sheet_type, r.nome, 'confirmado', pp.detected_floor
  FROM plan_rooms r
  JOIN plan_imports pi ON pi.id = r.plan_import_id
  LEFT JOIN plan_pages pp ON pp.id = r.page_id

  UNION ALL
  SELECT r.id, r.plan_import_id, pi.obra_id, r.user_id,
    'compartimento', 'rodape',
    COALESCE(r.nome, 'Compartimento') || ' — Rodapé',
    COALESCE(r.tipo_compartimento, 'habitacao'),
    'rodape',
    COALESCE(r.perimetro_m, 0), 'm',
    COALESCE(r.confidence, 'provavel'),
    COALESCE(r.origem, 'manual'),
    CASE WHEN COALESCE(r.perimetro_m, 0) = 0 THEN 'pendente' ELSE r.estado_validacao END,
    r.floor_id, r.page_id, '#84cc16', NULL, r.id, NULL,
    r.created_at, r.updated_at,
    pi.disciplina::text, pp.sheet_title, pp.sheet_type, r.nome, 'confirmado', pp.detected_floor
  FROM plan_rooms r
  JOIN plan_imports pi ON pi.id = r.plan_import_id
  LEFT JOIN plan_pages pp ON pp.id = r.page_id

  UNION ALL
  SELECT s.id, s.plan_import_id, pi.obra_id, s.user_id,
    'escada', 'corrimao', 'Escada — Corrimão', 'escada', 'acabamento',
    COALESCE(s.handrail_length_m, s.steps_count::numeric * s.tread_depth_m), 'm',
    COALESCE(s.confidence, 'provavel'),
    CASE WHEN s.handrail_length_m IS NULL THEN 'derivado' ELSE 'manual' END,
    'pendente', s.origin_floor_id, s.page_id, '#ef4444', NULL, NULL::uuid, NULL,
    s.created_at, s.updated_at,
    pi.disciplina::text, pp.sheet_title, pp.sheet_type, NULL, 'confirmado', pp.detected_floor
  FROM plan_stairs s
  JOIN plan_imports pi ON pi.id = s.plan_import_id
  LEFT JOIN plan_pages pp ON pp.id = s.page_id
  WHERE s.has_handrail = true AND COALESCE(s.handrail_length_m, s.steps_count::numeric * s.tread_depth_m) > 0

  UNION ALL
  SELECT s.id, s.plan_import_id, pi.obra_id, s.user_id,
    'escada', 'guarda_corpo', 'Escada — Guarda-corpo', 'escada', 'seguranca',
    COALESCE(s.guardrail_length_m, s.steps_count::numeric * s.tread_depth_m), 'm',
    COALESCE(s.confidence, 'provavel'),
    CASE WHEN s.guardrail_length_m IS NULL THEN 'derivado' ELSE 'manual' END,
    'pendente', s.origin_floor_id, s.page_id, '#b91c1c', NULL, NULL::uuid, NULL,
    s.created_at, s.updated_at,
    pi.disciplina::text, pp.sheet_title, pp.sheet_type, NULL, 'confirmado', pp.detected_floor
  FROM plan_stairs s
  JOIN plan_imports pi ON pi.id = s.plan_import_id
  LEFT JOIN plan_pages pp ON pp.id = s.page_id
  WHERE s.has_guardrail = true AND COALESCE(s.guardrail_length_m, s.steps_count::numeric * s.tread_depth_m) > 0

  UNION ALL
  SELECT ai.id, NULL::uuid, ai.obra_id, ai.user_id,
    'outros', COALESCE(ai.category, 'geral'),
    ai.description, COALESCE(ai.category, 'geral'),
    'adicional', ai.quantity, ai.unit,
    'confirmado', 'manual', 'validado',
    ai.floor_id, NULL::uuid, '#64748b', NULL, ai.room_id, NULL,
    ai.created_at, ai.updated_at,
    COALESCE(ai.disciplina_origem, 'outra'),
    ai.folha_origem,
    ai.tipo_folha_origem,
    ai.compartimento_origem,
    COALESCE(ai.estado_quantitativo, 'confirmado'),
    ai.piso_origem
  FROM plan_additional_items ai

  UNION ALL
  SELECT pe.id, pe.plan_import_id, pi.obra_id, pe.user_id,
    'especialidade', pe.symbol_type_id,
    COALESCE(NULLIF(pe.note, ''), pe.symbol_type_id),
    pe.category, COALESCE(NULLIF(pe.subcategory, ''), pe.category),
    COALESCE(pe.quantity, 1)::numeric, 'un',
    'provavel', pe.origin,
    CASE WHEN COALESCE(pe.review_required, false) THEN 'pendente' ELSE 'validado' END,
    NULL::uuid, NULL::uuid, '#f59e0b', NULL, NULL::uuid, pe.symbol_type_id,
    pe.created_at, pe.updated_at,
    pi.disciplina::text, NULL, NULL, NULL, 'confirmado', NULL
  FROM plan_placed_elements pe
  JOIN plan_imports pi ON pi.id = pe.plan_import_id

  UNION ALL
  SELECT c.id, c.plan_import_id, pi.obra_id, c.user_id,
    'especialidade', 'circuito_eletrico',
    COALESCE(NULLIF(c.description, ''), 'Circuito ' || COALESCE(c.circuit_number, '?')),
    'eletrica', COALESCE(NULLIF(c.distribution_board, ''), 'circuitos'),
    1::numeric, 'un',
    'provavel', c.data_source, 'validado',
    NULL::uuid, NULL::uuid, '#8b5cf6', NULL, NULL::uuid,
    COALESCE(c.circuit_number, c.distribution_board),
    c.created_at, c.updated_at,
    'eletrica', NULL, NULL, NULL, 'confirmado', NULL
  FROM plan_electrical_circuits c
  JOIN plan_imports pi ON pi.id = c.plan_import_id
) q;

GRANT SELECT ON public.plan_quantitativos_v TO authenticated;
GRANT SELECT ON public.plan_quantitativos_v TO service_role;