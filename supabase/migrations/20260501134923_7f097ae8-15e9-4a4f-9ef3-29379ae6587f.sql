-- Refactor plan_quantitativos_v: use subcategory as descricao for placed elements
-- so that grouped openings (e.g. "Porta interior 80×210") show up correctly
-- in the unified table and budget.

DROP VIEW IF EXISTS public.plan_quantitativos_v;

CREATE VIEW public.plan_quantitativos_v
WITH (security_invoker = true)
AS
SELECT m.id,
   m.plan_import_id,
   pi.obra_id,
   m.user_id,
   'medicao'::text AS source,
   m.tipo AS source_subtype,
   COALESCE(m.etiqueta, initcap(m.tipo)) AS descricao,
   m.tipo AS categoria,
   COALESCE(NULLIF(m.camada, ''::text), 'sem_camada'::text) AS camada,
   COALESCE(m.valor_ajustado, m.valor_bruto) AS valor,
   m.unidade,
   COALESCE(m.confidence, 'provavel'::text) AS confidence,
   COALESCE(m.measurement_origin, 'manual'::text) AS origem,
   m.estado_validacao,
   m.floor_id,
   m.page_id,
   m.cor,
   m.action_type,
   m.room_id,
   NULL::text AS symbol_type_id,
   m.created_at,
   m.updated_at
  FROM plan_measurements m
    JOIN plan_imports pi ON pi.id = m.plan_import_id
UNION ALL
SELECT r.id,
   r.plan_import_id,
   pi.obra_id,
   r.user_id,
   'compartimento'::text AS source,
   'pavimento'::text AS source_subtype,
   COALESCE(r.nome, 'Compartimento'::text) AS descricao,
   COALESCE(r.tipo_compartimento, 'habitacao'::text) AS categoria,
   'pavimento'::text AS camada,
   COALESCE(r.area_m2, 0::numeric) AS valor,
   'm2'::text AS unidade,
   COALESCE(r.confidence, 'provavel'::text) AS confidence,
   COALESCE(r.origem, 'manual'::text) AS origem,
       CASE
           WHEN COALESCE(r.area_m2, 0::numeric) = 0::numeric THEN 'pendente'::text
           ELSE r.estado_validacao
       END AS estado_validacao,
   r.floor_id,
   r.page_id,
   '#22c55e'::text AS cor,
   NULL::text AS action_type,
   r.id AS room_id,
   NULL::text AS symbol_type_id,
   r.created_at,
   r.updated_at
  FROM plan_rooms r
    JOIN plan_imports pi ON pi.id = r.plan_import_id
UNION ALL
SELECT r.id,
   r.plan_import_id,
   pi.obra_id,
   r.user_id,
   'compartimento'::text AS source,
   'teto'::text AS source_subtype,
   COALESCE(r.nome, 'Compartimento'::text) || ' — Teto'::text AS descricao,
   COALESCE(r.tipo_compartimento, 'habitacao'::text) AS categoria,
   'teto'::text AS camada,
   COALESCE(r.area_m2, 0::numeric) AS valor,
   'm2'::text AS unidade,
   COALESCE(r.confidence, 'provavel'::text) AS confidence,
   COALESCE(r.origem, 'derivado'::text) AS origem,
       CASE
           WHEN COALESCE(r.area_m2, 0::numeric) = 0::numeric THEN 'pendente'::text
           ELSE r.estado_validacao
       END AS estado_validacao,
   r.floor_id,
   r.page_id,
   '#a855f7'::text AS cor,
   NULL::text AS action_type,
   r.id AS room_id,
   NULL::text AS symbol_type_id,
   r.created_at,
   r.updated_at
  FROM plan_rooms r
    JOIN plan_imports pi ON pi.id = r.plan_import_id
UNION ALL
SELECT r.id,
   r.plan_import_id,
   pi.obra_id,
   r.user_id,
   'compartimento'::text AS source,
   'rodape'::text AS source_subtype,
   COALESCE(r.nome, 'Compartimento'::text) || ' — Rodapé'::text AS descricao,
   COALESCE(r.tipo_compartimento, 'habitacao'::text) AS categoria,
   'rodape'::text AS camada,
   COALESCE(r.perimetro_m, 0::numeric) AS valor,
   'm'::text AS unidade,
   COALESCE(r.confidence, 'provavel'::text) AS confidence,
   COALESCE(r.origem, 'derivado'::text) AS origem,
       CASE
           WHEN COALESCE(r.perimetro_m, 0::numeric) = 0::numeric THEN 'pendente'::text
           ELSE r.estado_validacao
       END AS estado_validacao,
   r.floor_id,
   r.page_id,
   '#f59e0b'::text AS cor,
   NULL::text AS action_type,
   r.id AS room_id,
   NULL::text AS symbol_type_id,
   r.created_at,
   r.updated_at
  FROM plan_rooms r
    JOIN plan_imports pi ON pi.id = r.plan_import_id
UNION ALL
-- Placed elements: agora a descrição prefere subcategory (ex: "Porta interior 80×210")
SELECT gen_random_uuid() AS id,
   e.plan_import_id,
   pi.obra_id,
   e.user_id,
   'especialidade'::text AS source,
   COALESCE(e.category, 'instalacoes'::text) AS source_subtype,
   COALESCE(NULLIF(e.subcategory, ''), e.symbol_type_id, 'Elemento'::text) AS descricao,
   COALESCE(e.category, 'instalacoes'::text) AS categoria,
   CASE
     WHEN e.category = 'vaos' THEN 'vaos'::text
     ELSE COALESCE(e.subcategory, 'geral'::text)
   END AS camada,
   COALESCE(sum(e.quantity), count(*))::numeric AS valor,
   'un'::text AS unidade,
   'confirmado'::text AS confidence,
   'manual'::text AS origem,
   'validado'::text AS estado_validacao,
   NULL::uuid AS floor_id,
   NULL::uuid AS page_id,
   '#0ea5e9'::text AS cor,
   NULL::text AS action_type,
   NULL::uuid AS room_id,
   e.symbol_type_id,
   min(e.created_at) AS created_at,
   max(e.updated_at) AS updated_at
  FROM plan_placed_elements e
    JOIN plan_imports pi ON pi.id = e.plan_import_id
  GROUP BY e.plan_import_id, pi.obra_id, e.user_id, e.category, e.subcategory, e.symbol_type_id
UNION ALL
SELECT s.id,
   s.plan_import_id,
   pi.obra_id,
   s.user_id,
   'escada'::text AS source,
   'degraus'::text AS source_subtype,
   'Escada — Degraus'::text AS descricao,
   'escada'::text AS categoria,
   'estrutura'::text AS camada,
   s.steps_count::numeric AS valor,
   'un'::text AS unidade,
   COALESCE(s.confidence, 'provavel'::text) AS confidence,
   'manual'::text AS origem,
   'pendente'::text AS estado_validacao,
   s.origin_floor_id AS floor_id,
   s.page_id,
   '#dc2626'::text AS cor,
   NULL::text AS action_type,
   NULL::uuid AS room_id,
   NULL::text AS symbol_type_id,
   s.created_at,
   s.updated_at
  FROM plan_stairs s
    JOIN plan_imports pi ON pi.id = s.plan_import_id
  WHERE COALESCE(s.steps_count, 0) > 0
UNION ALL
SELECT s.id,
   s.plan_import_id,
   pi.obra_id,
   s.user_id,
   'escada'::text AS source,
   'corrimao'::text AS source_subtype,
   'Escada — Corrimão'::text AS descricao,
   'escada'::text AS categoria,
   'acabamento'::text AS camada,
   COALESCE(s.handrail_length_m, s.steps_count::numeric * s.tread_depth_m) AS valor,
   'm'::text AS unidade,
   COALESCE(s.confidence, 'provavel'::text) AS confidence,
   CASE
     WHEN s.handrail_length_m IS NULL THEN 'derivado'::text
     ELSE 'manual'::text
   END AS origem,
   'pendente'::text AS estado_validacao,
   s.origin_floor_id AS floor_id,
   s.page_id,
   '#ef4444'::text AS cor,
   NULL::text AS action_type,
   NULL::uuid AS room_id,
   NULL::text AS symbol_type_id,
   s.created_at,
   s.updated_at
  FROM plan_stairs s
    JOIN plan_imports pi ON pi.id = s.plan_import_id
  WHERE s.has_handrail = true AND COALESCE(s.handrail_length_m, s.steps_count::numeric * s.tread_depth_m) > 0::numeric
UNION ALL
SELECT s.id,
   s.plan_import_id,
   pi.obra_id,
   s.user_id,
   'escada'::text AS source,
   'guarda_corpo'::text AS source_subtype,
   'Escada — Guarda-corpo'::text AS descricao,
   'escada'::text AS categoria,
   'seguranca'::text AS camada,
   COALESCE(s.guardrail_length_m, s.steps_count::numeric * s.tread_depth_m) AS valor,
   'm'::text AS unidade,
   COALESCE(s.confidence, 'provavel'::text) AS confidence,
   CASE
     WHEN s.guardrail_length_m IS NULL THEN 'derivado'::text
     ELSE 'manual'::text
   END AS origem,
   'pendente'::text AS estado_validacao,
   s.origin_floor_id AS floor_id,
   s.page_id,
   '#b91c1c'::text AS cor,
   NULL::text AS action_type,
   NULL::uuid AS room_id,
   NULL::text AS symbol_type_id,
   s.created_at,
   s.updated_at
  FROM plan_stairs s
    JOIN plan_imports pi ON pi.id = s.plan_import_id
  WHERE s.has_guardrail = true AND COALESCE(s.guardrail_length_m, s.steps_count::numeric * s.tread_depth_m) > 0::numeric
UNION ALL
SELECT ai.id,
   NULL::uuid AS plan_import_id,
   ai.obra_id,
   ai.user_id,
   'outros'::text AS source,
   COALESCE(ai.category, 'geral'::text) AS source_subtype,
   ai.description AS descricao,
   COALESCE(ai.category, 'geral'::text) AS categoria,
   'adicional'::text AS camada,
   ai.quantity AS valor,
   ai.unit AS unidade,
   'confirmado'::text AS confidence,
   'manual'::text AS origem,
   'validado'::text AS estado_validacao,
   ai.floor_id,
   NULL::uuid AS page_id,
   '#64748b'::text AS cor,
   NULL::text AS action_type,
   ai.room_id,
   NULL::text AS symbol_type_id,
   ai.created_at,
   ai.updated_at
  FROM plan_additional_items ai;