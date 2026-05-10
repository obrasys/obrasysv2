# Correções Críticas — Módulo Planta / Leitura de Planta

Este é um trabalho extenso (8 fases, várias migrations, ~15-20 ficheiros). Vou executar **fase a fase**, com aprovação implícita no fim de cada migration. Sem refactor de `PlanDetail.tsx`, sem mexer em rotas nem identidade visual.

## Fase 1 — Persistência Axia em DB
- **Migration**: adicionar a `plan_pages` as colunas `axia_analysis jsonb`, `axia_analyzed_at timestamptz`, `axia_model text`, `axia_risk_level text`, `axia_review_required boolean default false`.
- **Hook novo**: `usePlanAxiaAnalysis(pageId)` — load/save em `plan_pages`, com fallback de leitura ao `localStorage` antigo (`plan-axia-results:${planId}`) e limpeza após migrar.
- **Integrar** nos pontos atuais que usam `localStorage.plan-axia-results`.

## Fase 2 — Calibração por página/pavimento
- **Migration**: adicionar `page_id` (já existe segundo auditoria) + índice único `(plan_import_id, COALESCE(page_id,'00000000-…'), COALESCE(floor_id,'00000000-…'))`. Validar primeiro com `read_query`.
- **Refactor `usePlanCalibration`**: aceitar `pageId` e `floorId`, fazer `upsert` por chave (sem `delete + insert` global), filtrar query por página.
- **Atualizar consumidores** para passar `pageId`/`floorId` ativos: `PlanDetail`, `PlanViewer`, `PlanCalibrationTool`, ferramentas de medição, painel Axia, dialogs de envio.
- Aviso quando muda página e não há calibração; alerta de sanidade se `pixels_per_meter` for absurdo (`< 5` ou `> 5000`).

## Fase 3 — Guardas de envio para orçamento
- **Hook novo**: `useCanSendPlanToBudget(planId, pageId?, floorId?)` retornando `{ ok, reasons[], warnings[], requiresExplicitConfirmation }`.
- Integrar em: `PlanBudgetGenerator`, `PlanAxiaBudgetSendDialog`, `PlanMeasurementBudgetPanel` e botões diretos.
- Bloqueios duros (sem calibração, risco alto não revisto); soft com confirmação (pendentes, baixa confiança, fallback estimado, possível duplicação).

## Fase 4 — Deduplicação no orçamento
- **Migration**: adicionar a `plan_budget_links` as colunas `dedupe_key text`, `source_type text`, `source_id text`, `quantity_origin text`, `validation_status text`. Índice **parcial** único `(orcamento_id, dedupe_key) WHERE dedupe_key IS NOT NULL`.
- **Util novo**: `src/lib/plan-dedupe.ts` com `normalize(name)` (lowercase, trim, sem acentos, sem pontuação) e `buildDedupeKey({...})`.
- Aplicar `dedupe_key` em todos os caminhos de envio (manual, paredes, Axia, compartimentos, instalações, aberturas, rodapés, áreas).
- Pre-check antes do insert; aviso de duplicação no preview.

## Fase 5 — Validação de upload
- Reforçar `PlanUploadForm` + `usePlanImports.uploadPlan` com validações duras: MIME (`pdf|png|jpg|jpeg`), tamanho ≤ 25 MB, ficheiro vazio, extensão. Mensagens conforme briefing.

## Fase 6 — Normalização no engine de quantitativos
- Em `src/lib/plan-quantitativos-engine.ts`: helper `normalizeName()` aplicado a `rooms`, `compartimentos_conectados`, `vaos_porta_associados`, paredes, aberturas, buckets. Em divergência → `review_required` + observação, sem quebrar cálculo.

## Fase 7 — Logs estruturados Axia
- **Migration**: tabela `axia_call_logs` com colunas listadas + RLS (org via `get_org_member_ids()` ou `is_super_admin`). Índices em `org_id`, `created_at`, `plan_import_id`.
- Atualizar `supabase/functions/axia-plan-vision/index.ts` para registar início/fim/erro/latência/modelo/tamanho de input. Sem guardar imagem/base64.

## Fase 8 — Smoke tests
- Executar checklist (1-15) e reportar resultados (uploads, calibração multi-página, persistência Axia, bloqueios, dedupe).

## Detalhes técnicos
- Todas as migrations em chamadas separadas (regra do tooling) com descrição PT-PT.
- RLS de `axia_call_logs`: SELECT por org members + super admin; INSERT pelo próprio user.
- `dedupe_key` é determinístico (hash-like string concatenada) — nunca depende de UUIDs voláteis.
- Compatibilidade: leitura do `localStorage` mantida como fallback até primeira gravação na DB.
- Sem alteração de tipos em `src/integrations/supabase/types.ts` (auto-gerado após migrations).

## Riscos conhecidos
- Constraint único em `plan_calibrations` pode falhar se já existirem duplicados — a migration faz `DELETE` dos antigos mantendo o mais recente antes de criar o índice.
- Constraint único em `plan_budget_links` é parcial (só com `dedupe_key NOT NULL`) para não partir dados existentes.
- `axia_review_required` default `false` — análises antigas no localStorage não terão risco até reanálise.

## Ordem de execução
1. Migrations Fase 1 → código Fase 1
2. Migration Fase 2 → código Fase 2
3. Código Fase 3
4. Migration Fase 4 → código Fase 4 + util
5. Código Fase 5
6. Código Fase 6
7. Migration Fase 7 → código edge function Fase 7
8. Smoke tests + relatório final

Confirma para começar pela Fase 1?
