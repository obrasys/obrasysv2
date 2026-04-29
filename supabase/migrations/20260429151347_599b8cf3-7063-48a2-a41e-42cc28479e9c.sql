-- Fase 3: Expandir view unificada com escadas, especialidades detalhadas e "outros"
CREATE OR REPLACE VIEW public.plan_quantitativos_v
WITH (security_invoker = true) AS
-- 1) Medições (linha / área / contagem)
SELECT
  m.id,
  m.plan_import_id,
  pi.obra_id,
  m.user_id,
  'medicao'::text                                         AS source,
  m.tipo                                                  AS source_subtype,
  COALESCE(m.etiqueta, INITCAP(m.tipo))                   AS descricao,
  m.tipo                                                  AS categoria,
  COALESCE(NULLIF(m.camada, ''), 'sem_camada')            AS camada,
  COALESCE(m.valor_ajustado, m.valor_bruto)               AS valor,
  m.unidade,
  COALESCE(m.confidence, 'provavel')                      AS confidence,
  COALESCE(m.measurement_origin, 'manual')                AS origem,
  m.estado_validacao                                      AS estado_validacao,
  m.floor_id,
  m.page_id,
  m.cor                                                   AS cor,
  m.action_type                                           AS action_type,
  m.room_id                                               AS room_id,
  NULL::text                                              AS symbol_type_id,
  m.created_at,
  m.updated_at
FROM public.plan_measurements m
JOIN public.plan_imports pi ON pi.id = m.plan_import_id

UNION ALL

-- 2a) Cómodos — pavimento
SELECT
  r.id, r.plan_import_id, pi.obra_id, r.user_id,
  'compartimento'::text, 'pavimento'::text,
  COALESCE(r.nome, 'Compartimento'),
  COALESCE(r.tipo_compartimento, 'habitacao'),
  'pavimento'::text,
  r.area_m2, 'm2'::text,
  COALESCE(r.confidence, 'provavel'),
  COALESCE(r.origem, 'manual'),
  r.estado_validacao,
  r.floor_id, r.page_id,
  '#22c55e'::text, NULL::text, r.id, NULL::text,
  r.created_at, r.updated_at
FROM public.plan_rooms r
JOIN public.plan_imports pi ON pi.id = r.plan_import_id
WHERE COALESCE(r.area_m2, 0) > 0

UNION ALL

-- 2b) Cómodos — teto
SELECT
  r.id, r.plan_import_id, pi.obra_id, r.user_id,
  'compartimento'::text, 'teto'::text,
  COALESCE(r.nome, 'Compartimento') || ' — Teto',
  COALESCE(r.tipo_compartimento, 'habitacao'),
  'teto'::text, r.area_m2, 'm2'::text,
  COALESCE(r.confidence, 'provavel'),
  COALESCE(r.origem, 'derivado'),
  r.estado_validacao,
  r.floor_id, r.page_id,
  '#a855f7'::text, NULL::text, r.id, NULL::text,
  r.created_at, r.updated_at
FROM public.plan_rooms r
JOIN public.plan_imports pi ON pi.id = r.plan_import_id
WHERE COALESCE(r.area_m2, 0) > 0

UNION ALL

-- 2c) Cómodos — rodapé
SELECT
  r.id, r.plan_import_id, pi.obra_id, r.user_id,
  'compartimento'::text, 'rodape'::text,
  COALESCE(r.nome, 'Compartimento') || ' — Rodapé',
  COALESCE(r.tipo_compartimento, 'habitacao'),
  'rodape'::text, r.perimetro_m, 'm'::text,
  COALESCE(r.confidence, 'provavel'),
  COALESCE(r.origem, 'derivado'),
  r.estado_validacao,
  r.floor_id, r.page_id,
  '#f59e0b'::text, NULL::text, r.id, NULL::text,
  r.created_at, r.updated_at
FROM public.plan_rooms r
JOIN public.plan_imports pi ON pi.id = r.plan_import_id
WHERE COALESCE(r.perimetro_m, 0) > 0

UNION ALL

-- 3) Elementos colocados — agrupados por símbolo + categoria técnica
SELECT
  gen_random_uuid() AS id,
  e.plan_import_id, pi.obra_id, e.user_id,
  'especialidade'::text                                   AS source,
  COALESCE(e.category, 'instalacoes')                     AS source_subtype,
  COALESCE(e.symbol_type_id, 'Elemento')                  AS descricao,
  COALESCE(e.category, 'instalacoes')                     AS categoria,
  COALESCE(e.subcategory, 'geral')                        AS camada,
  COALESCE(SUM(e.quantity), COUNT(*))::numeric            AS valor,
  'un'::text                                              AS unidade,
  'confirmado'::text                                      AS confidence,
  'manual'::text                                          AS origem,
  'validado'::text                                        AS estado_validacao,
  NULL::uuid AS floor_id, NULL::uuid AS page_id,
  '#0ea5e9'::text                                         AS cor,
  NULL::text                                              AS action_type,
  NULL::uuid                                              AS room_id,
  e.symbol_type_id                                        AS symbol_type_id,
  MIN(e.created_at), MAX(e.updated_at)
FROM public.plan_placed_elements e
JOIN public.plan_imports pi ON pi.id = e.plan_import_id
GROUP BY e.plan_import_id, pi.obra_id, e.user_id,
  e.category, e.subcategory, e.symbol_type_id

UNION ALL

-- 4a) Escadas — degraus
SELECT
  s.id, s.plan_import_id, pi.obra_id, s.user_id,
  'escada'::text                                          AS source,
  'degraus'::text                                         AS source_subtype,
  'Escada — Degraus'::text                                AS descricao,
  'escada'::text                                          AS categoria,
  'estrutura'::text                                       AS camada,
  s.steps_count::numeric                                  AS valor,
  'un'::text                                              AS unidade,
  COALESCE(s.confidence, 'provavel'),
  'manual'::text                                          AS origem,
  'pendente'::text                                        AS estado_validacao,
  s.origin_floor_id                                       AS floor_id,
  s.page_id,
  '#dc2626'::text                                         AS cor,
  NULL::text                                              AS action_type,
  NULL::uuid                                              AS room_id,
  NULL::text                                              AS symbol_type_id,
  s.created_at, s.updated_at
FROM public.plan_stairs s
JOIN public.plan_imports pi ON pi.id = s.plan_import_id
WHERE COALESCE(s.steps_count, 0) > 0

UNION ALL

-- 4b) Escadas — corrimão (m)
SELECT
  s.id, s.plan_import_id, pi.obra_id, s.user_id,
  'escada'::text, 'corrimao'::text,
  'Escada — Corrimão'::text,
  'escada'::text, 'acabamento'::text,
  COALESCE(s.handrail_length_m, s.steps_count * s.tread_depth_m) AS valor,
  'm'::text,
  COALESCE(s.confidence, 'provavel'),
  CASE WHEN s.handrail_length_m IS NULL THEN 'derivado' ELSE 'manual' END,
  'pendente'::text,
  s.origin_floor_id, s.page_id,
  '#ef4444'::text, NULL::text, NULL::uuid, NULL::text,
  s.created_at, s.updated_at
FROM public.plan_stairs s
JOIN public.plan_imports pi ON pi.id = s.plan_import_id
WHERE s.has_handrail = true
  AND COALESCE(s.handrail_length_m, s.steps_count * s.tread_depth_m) > 0

UNION ALL

-- 4c) Escadas — guarda-corpo (m)
SELECT
  s.id, s.plan_import_id, pi.obra_id, s.user_id,
  'escada'::text, 'guarda_corpo'::text,
  'Escada — Guarda-corpo'::text,
  'escada'::text, 'seguranca'::text,
  COALESCE(s.guardrail_length_m, s.steps_count * s.tread_depth_m) AS valor,
  'm'::text,
  COALESCE(s.confidence, 'provavel'),
  CASE WHEN s.guardrail_length_m IS NULL THEN 'derivado' ELSE 'manual' END,
  'pendente'::text,
  s.origin_floor_id, s.page_id,
  '#b91c1c'::text, NULL::text, NULL::uuid, NULL::text,
  s.created_at, s.updated_at
FROM public.plan_stairs s
JOIN public.plan_imports pi ON pi.id = s.plan_import_id
WHERE s.has_guardrail = true
  AND COALESCE(s.guardrail_length_m, s.steps_count * s.tread_depth_m) > 0

UNION ALL

-- 5) Itens adicionais ("outros" — não visíveis na planta)
SELECT
  ai.id,
  NULL::uuid                                              AS plan_import_id,
  ai.obra_id,
  ai.user_id,
  'outros'::text                                          AS source,
  COALESCE(ai.category, 'geral')                          AS source_subtype,
  ai.description                                          AS descricao,
  COALESCE(ai.category, 'geral')                          AS categoria,
  'adicional'::text                                       AS camada,
  ai.quantity                                             AS valor,
  ai.unit                                                 AS unidade,
  'confirmado'::text                                      AS confidence,
  'manual'::text                                          AS origem,
  'validado'::text                                        AS estado_validacao,
  ai.floor_id,
  NULL::uuid                                              AS page_id,
  '#64748b'::text                                         AS cor,
  NULL::text                                              AS action_type,
  ai.room_id,
  NULL::text                                              AS symbol_type_id,
  ai.created_at, ai.updated_at
FROM public.plan_additional_items ai;

COMMENT ON VIEW public.plan_quantitativos_v IS
  'Fase 3 — Tabela unificada: medições, cómodos (pavimento/teto/rodapé), especialidades (elementos por categoria técnica), escadas (degraus/corrimão/guarda-corpo) e outros (itens adicionais não visíveis).';

GRANT SELECT ON public.plan_quantitativos_v TO authenticated;