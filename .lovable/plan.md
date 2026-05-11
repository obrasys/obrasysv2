
# Plano — Módulo Especialidades (sobre o módulo Plantas)

## Objetivo
Criar uma camada **Especialidades** (elétrica, águas, esgotos, AVAC, telecom, gás, segurança) que reaproveita ao máximo o módulo Plantas existente (upload, viewer, calibração, Axia, envio para orçamento), adicionando apenas a lógica específica de **leitura técnica por símbolos** e mapas de quantidades por sistema.

Importante: o módulo `instalacoes` atual é **paramétrico** (KPIs por m² e perfil eco/med/premium). Ele continua intocado — a nova camada vive ao lado dele e é chamada **“Plantas de Especialidades”**.

## Reaproveitamento (sem duplicar)
Continuamos a usar, sem fork:

- `PlanUploadForm`, `PlanViewer`, `PlanPagesPanel`, `PlanFloorSelector`
- `PlanCalibrationTool`, zoom/pan e grip preferences
- `PlanAIAnalysis` (apenas a infraestrutura de chamada/estado/erros) — chamada parametrizada por “modo”
- `PlanInsertToolbar` / ferramentas de marcação de pontos e segmentos
- `PlanBudgetSendDialog` + `plan_budget_links` + `buildDedupeKey` (estendendo `DedupeSourceType` para incluir `specialty_symbol` e `specialty_segment`)
- Storage `plan-files` e RLS já existentes

Para isto, extrai-se o que hoje está acoplado a “rooms/walls/openings” em `PlanAIAnalysis` para um **modo** (`mode: "architectural" | "specialty"`) que altera apenas:
- prompt enviado à edge function,
- esquema de resposta esperado,
- painéis de resultado renderizados.

## Novidades (apenas o estritamente específico)

### Frontend — `src/components/especialidades/`
- `SpecialtyPlanUploadForm.tsx` — wrapper sobre `PlanUploadForm` + select de `specialty_type` e piso
- `SpecialtySymbolPicker.tsx` — biblioteca de símbolos por especialidade (renderizada no canvas como markers)
- `SpecialtyPlanToolbar.tsx` — adicionar símbolo, contar pontos, marcar percurso, medir tubagem
- `SpecialtyDetectedElementsPanel.tsx` — lista por símbolo, com Confirmar / Rever / Apagar
- `SpecialtyQuantityMap.tsx` — mapa de quantidades agrupado por especialidade e tipo
- `SpecialtyAxiaAnalysis.tsx` — banner+resultados específicos (símbolos, percursos, avisos)
- `SpecialtyReviewPanel.tsx` — itens com `review_required=true`
- `SpecialtyBudgetMapper.tsx` — mapeia símbolos→artigos (capítulo Especialidades / subcapítulo por sistema)

### Páginas — `src/pages/especialidades/`
- `Index.tsx` — cards por especialidade (elétrica, águas, esgotos, AVAC, telecom, gás, segurança) com KPIs (plantas, elementos, por rever, estado), filtros e botão “Carregar planta de especialidade”
- `Detail.tsx` — viewer + painel lateral, reaproveitando layout de `pages/plantas/Detail.tsx`
- Rotas: `/obras/:id/especialidades` e `/obras/:id/especialidades/:planId`

### Hooks
- `useSpecialtyPlans`, `useSpecialtyDetectedElements`, `useSpecialtyMeasurements`, `useSpecialtyQuantities`, `useSpecialtySymbols` (lê `specialty_symbol_library`)

### Edge function
- `supabase/functions/axia-specialty-vision/index.ts` — clone enxuto de `axia-plan-vision` com:
  - prompt padronizado (“Tu és a Axia… plantas de especialidades…”),
  - schema de tool exatamente como o documento (sheet_classification, detected_symbols, estimated_quantities, budget_suggestions, warnings, missing_information, overall_confidence, review_required),
  - mesmas guardas de timeout, fallback, `review_required=true` quando incerto,
  - mesmas regras: não inventar, não contar legenda, não calcular cargas térmicas.

## Modelo de dados (migrações novas, sem tocar em `plan_*`)

Tabelas em `public`, todas com `organization_id`, `created_by`, RLS por organização (segue padrão `roles-and-org-hierarchy-standard`):

- `specialty_plans` — uma linha por planta de especialidade ligada à obra; `file_path` no bucket `plan-files`, `specialty_type`, `floor_level`, `declared_scale`, `calibration_data jsonb`, `status`.
- `specialty_plan_analysis` — histórico de análises Axia (`raw_response_json`, `confidence_score`, `review_required`, `warnings[]`, `missing_information[]`).
- `specialty_detected_elements` — pontos/símbolos confirmados ou por rever (com `x,y`, `bounding_box`, `confidence`, `user_confirmed`).
- `specialty_measurements` — percursos lineares (cabo/tubagem/conduta) com `points_json`, `quantity`, `unit`, `calculation_basis`.
- `specialty_quantity_items` — agregados prontos para orçamento (com `budget_item_id`, `sent_to_budget`).
- `specialty_symbol_library` — biblioteca global (não multi-tenant) com os símbolos descritos (tomada_simples, ponto_agua_fria, unidade_interior, etc.) e `default_budget_category` / `default_budget_item_name`. Seed inicial via migração.

Estados aceites: `uploaded | analyzing | analyzed | review_required | validated | sent_to_budget | failed`.

Índices: `(work_id, specialty_type)`, `(specialty_plan_id)`, `(sent_to_budget)`.

RLS: leitura/escrita restritas a membros da `organization_id` com role interno; `specialty_symbol_library` é leitura pública para autenticados, escrita só para super admin.

## Integração com orçamento
- Reutiliza `PlanBudgetSendDialog` adaptado: capítulo destino default “Especialidades” + subcapítulo por `specialty_type`.
- `buildDedupeKey` ganha novos `source_type`: `specialty_symbol`, `specialty_segment`, `specialty_quantity_item`.
- Itens com `review_required=true` ficam desligados por defeito no modal e exigem confirmação explícita.
- Cada `plan_budget_links` registado guarda `specialty_plan_id` em `source_id` e meta extra (`confidence_score`, `source`).

## Calibração e regras
- Sem escala confiável: contagem de símbolos permitida; medições lineares automáticas marcadas como **baixa confiança** e bloqueadas no envio até calibrar.
- Calibração opcionalmente propagável a outras plantas do mesmo conjunto (mesmo `work_id` + `floor_level`).
- Validações duras: nunca contar legenda, separar por piso, manter edição manual, guardar histórico de análises, marcar baixa confiança quando `confidence < 0.6` ou planta cortada/desfocada.

## UX / linguagem
Termos amigáveis (“Pontos encontrados”, “Elementos por rever”, “Precisa de escala”, “Medição estimada”). Axia sempre escreve em português de Portugal e em linguagem humana, conforme padrão do produto.

## Implementação incremental
1. **Fase 1** — migrações + Index/Detail + upload + viewer + marcação manual de símbolos + biblioteca seed.
2. **Fase 2** — edge `axia-specialty-vision` + painéis de resultados + revisão.
3. **Fase 3** — `SpecialtyQuantityMap` + envio para orçamento (capítulo Especialidades).
4. **Fase 4** — medições lineares com calibração propagada + relatórios por especialidade.

## Riscos e mitigações
- **Não quebrar Plantas**: `PlanAIAnalysis` recebe `mode` opcional com default `"architectural"` — comportamento atual fica idêntico.
- **Dedupe**: novos `source_type` adicionados sem alterar o índice único existente.
- **Performance**: símbolos renderizados no canvas existente, agrupados por camada por especialidade para permitir toggle.
- **Conflito de nome com `instalacoes`**: usamos rota `/especialidades` e nome “Plantas de Especialidades” na sidebar para distinguir do módulo paramétrico atual.

## Critério de sucesso
Carregar uma planta de elétrica/águas/AVAC numa obra, ver no mesmo viewer, confirmar símbolos detetados pela Axia, gerar mapa de quantidades por sistema e enviar itens validados para o orçamento — tudo sem regressões no módulo Plantas nem no módulo `instalacoes` paramétrico.
