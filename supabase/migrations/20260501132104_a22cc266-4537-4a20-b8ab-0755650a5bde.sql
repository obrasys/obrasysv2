DROP VIEW IF EXISTS public.plan_quantitativos_v;

CREATE VIEW public.plan_quantitativos_v
WITH (security_invoker = true) AS
SELECT
  m.id AS id, m.plan_import_id AS plan_import_id, pi.obra_id AS obra_id, m.user_id AS user_id,
  'medicao'::text AS source, m.tipo AS source_subtype,
  COALESCE(m.etiqueta, INITCAP(m.tipo)) AS descricao,
  m.tipo AS categoria, COALESCE(NULLIF(m.camada,''),'sem_camada') AS camada,
  COALESCE(m.valor_ajustado, m.valor_bruto) AS valor, m.unidade AS unidade,
  COALESCE(m.confidence,'provavel') AS confidence,
  COALESCE(m.measurement_origin,'manual') AS origem,
  m.estado_validacao AS estado_validacao,
  m.floor_id AS floor_id, m.page_id AS page_id,
  m.cor AS cor, m.action_type AS action_type, m.room_id AS room_id, NULL::text AS symbol_type_id,
  m.created_at AS created_at, m.updated_at AS updated_at
FROM public.plan_measurements m
JOIN public.plan_imports pi ON pi.id = m.plan_import_id

UNION ALL
SELECT
  r.id, r.plan_import_id, pi.obra_id, r.user_id,
  'compartimento'::text, 'pavimento'::text,
  COALESCE(r.nome,'Compartimento'),
  COALESCE(r.tipo_compartimento,'habitacao'),
  'pavimento'::text, COALESCE(r.area_m2,0), 'm2'::text,
  COALESCE(r.confidence,'provavel'),
  COALESCE(r.origem,'manual'),
  CASE WHEN COALESCE(r.area_m2,0)=0 THEN 'pendente' ELSE r.estado_validacao END,
  r.floor_id, r.page_id,
  '#22c55e'::text, NULL::text, r.id, NULL::text,
  r.created_at, r.updated_at
FROM public.plan_rooms r
JOIN public.plan_imports pi ON pi.id = r.plan_import_id

UNION ALL
SELECT
  r.id, r.plan_import_id, pi.obra_id, r.user_id,
  'compartimento'::text, 'teto'::text,
  COALESCE(r.nome,'Compartimento') || ' — Teto',
  COALESCE(r.tipo_compartimento,'habitacao'),
  'teto'::text, COALESCE(r.area_m2,0), 'm2'::text,
  COALESCE(r.confidence,'provavel'),
  COALESCE(r.origem,'derivado'),
  CASE WHEN COALESCE(r.area_m2,0)=0 THEN 'pendente' ELSE r.estado_validacao END,
  r.floor_id, r.page_id,
  '#a855f7'::text, NULL::text, r.id, NULL::text,
  r.created_at, r.updated_at
FROM public.plan_rooms r
JOIN public.plan_imports pi ON pi.id = r.plan_import_id

UNION ALL
SELECT
  r.id, r.plan_import_id, pi.obra_id, r.user_id,
  'compartimento'::text, 'rodape'::text,
  COALESCE(r.nome,'Compartimento') || ' — Rodapé',
  COALESCE(r.tipo_compartimento,'habitacao'),
  'rodape'::text, COALESCE(r.perimetro_m,0), 'm'::text,
  COALESCE(r.confidence,'provavel'),
  COALESCE(r.origem,'derivado'),
  CASE WHEN COALESCE(r.perimetro_m,0)=0 THEN 'pendente' ELSE r.estado_validacao END,
  r.floor_id, r.page_id,
  '#f59e0b'::text, NULL::text, r.id, NULL::text,
  r.created_at, r.updated_at
FROM public.plan_rooms r
JOIN public.plan_imports pi ON pi.id = r.plan_import_id

UNION ALL
SELECT
  gen_random_uuid(), e.plan_import_id, pi.obra_id, e.user_id,
  'especialidade'::text, COALESCE(e.category,'instalacoes'),
  COALESCE(e.symbol_type_id,'Elemento'),
  COALESCE(e.category,'instalacoes'),
  COALESCE(e.subcategory,'geral'),
  COALESCE(SUM(e.quantity), COUNT(*))::numeric, 'un'::text,
  'confirmado'::text, 'manual'::text, 'validado'::text,
  NULL::uuid, NULL::uuid,
  '#0ea5e9'::text, NULL::text, NULL::uuid,
  e.symbol_type_id,
  MIN(e.created_at), MAX(e.updated_at)
FROM public.plan_placed_elements e
JOIN public.plan_imports pi ON pi.id = e.plan_import_id
GROUP BY e.plan_import_id, pi.obra_id, e.user_id, e.category, e.subcategory, e.symbol_type_id

UNION ALL
SELECT
  s.id, s.plan_import_id, pi.obra_id, s.user_id,
  'escada'::text, 'degraus'::text,
  'Escada — Degraus'::text, 'escada'::text, 'estrutura'::text,
  s.steps_count::numeric, 'un'::text,
  COALESCE(s.confidence,'provavel'), 'manual'::text, 'pendente'::text,
  s.origin_floor_id, s.page_id,
  '#dc2626'::text, NULL::text, NULL::uuid, NULL::text,
  s.created_at, s.updated_at
FROM public.plan_stairs s
JOIN public.plan_imports pi ON pi.id = s.plan_import_id
WHERE COALESCE(s.steps_count,0) > 0

UNION ALL
SELECT
  s.id, s.plan_import_id, pi.obra_id, s.user_id,
  'escada'::text, 'corrimao'::text,
  'Escada — Corrimão'::text, 'escada'::text, 'acabamento'::text,
  COALESCE(s.handrail_length_m, s.steps_count*s.tread_depth_m), 'm'::text,
  COALESCE(s.confidence,'provavel'),
  CASE WHEN s.handrail_length_m IS NULL THEN 'derivado' ELSE 'manual' END,
  'pendente'::text, s.origin_floor_id, s.page_id,
  '#ef4444'::text, NULL::text, NULL::uuid, NULL::text,
  s.created_at, s.updated_at
FROM public.plan_stairs s
JOIN public.plan_imports pi ON pi.id = s.plan_import_id
WHERE s.has_handrail = true AND COALESCE(s.handrail_length_m, s.steps_count*s.tread_depth_m) > 0

UNION ALL
SELECT
  s.id, s.plan_import_id, pi.obra_id, s.user_id,
  'escada'::text, 'guarda_corpo'::text,
  'Escada — Guarda-corpo'::text, 'escada'::text, 'seguranca'::text,
  COALESCE(s.guardrail_length_m, s.steps_count*s.tread_depth_m), 'm'::text,
  COALESCE(s.confidence,'provavel'),
  CASE WHEN s.guardrail_length_m IS NULL THEN 'derivado' ELSE 'manual' END,
  'pendente'::text, s.origin_floor_id, s.page_id,
  '#b91c1c'::text, NULL::text, NULL::uuid, NULL::text,
  s.created_at, s.updated_at
FROM public.plan_stairs s
JOIN public.plan_imports pi ON pi.id = s.plan_import_id
WHERE s.has_guardrail = true AND COALESCE(s.guardrail_length_m, s.steps_count*s.tread_depth_m) > 0

UNION ALL
SELECT
  ai.id, NULL::uuid, ai.obra_id, ai.user_id,
  'outros'::text, COALESCE(ai.category,'geral'),
  ai.description, COALESCE(ai.category,'geral'),
  'adicional'::text, ai.quantity, ai.unit,
  'confirmado'::text, 'manual'::text, 'validado'::text,
  ai.floor_id, NULL::uuid,
  '#64748b'::text, NULL::text, ai.room_id, NULL::text,
  ai.created_at, ai.updated_at
FROM public.plan_additional_items ai;

GRANT SELECT ON public.plan_quantitativos_v TO authenticated;