# Auditoria — Orçamentação Inteligente (Fase 0)

Documento de referência antes de iniciar a Fase 1. Mapeia o que já existe para garantir reuso máximo e zero regressão.

## 1. Pontos de entrada atuais de orçamento

| Entrada | Rota / Componente | Hook principal | Notas |
|---|---|---|---|
| Essencial v2 (wizard rápido) | `/orcamentos/criar` (modo essencial) | `useAxiaEssencial`, `useBudgetVersions` | 4 passos, inline edit, ~5 min |
| Avançado (manual) | `/orcamentos/criar` (modo avançado) | `useBudgetVersions`, `useBudgetChapterTotals` | Capítulos + artigos, ~15 min |
| Importação caderno de encargos | `/cadernos/importar` → `/cadernos/validar` | `useCadernos`, `axia-organize-budget` (edge) | Excel/PDF, chunking 35k chars |
| ICF (estrutura/arquitetura/obra) | `/icf/*` | `useIcfData`, `useIcfBudgetSnapshot` | Snapshot próprio, paramétrico |
| Plantas (medições) | `/plantas/*` | `usePlanMeasurements`, `usePlanQuantitativos` | react-konva, OCR Axia |
| Instalações paramétricas | `/instalacoes/*` | `useInstalacoes` | Elétrica, canalização, telecom |
| AI Organizer (importação livre) | `/importar` | `useAIBudgetInsights` | Multi-formato → Gemini 2.5 |

**Decisão:** "Orçamentação Inteligente" será uma **terceira opção** no seletor de criação (`SelecaoModoCreacao`), não substitui Essencial nem Avançado.

## 2. Tabelas / hooks afetados

Núcleo do orçamento:
- `orcamentos`, `budget_versions`, `budget_version_items`
- `capitulos_orcamento`, `artigos_orcamento`
- `orcamento_contexto_fiscal`, `orcamento_templates_essencial`
- `budget_documents`, `budget_events`, `budget_awards`, `budget_payment_plans`

Documentos / IA:
- `caderno_*` (encargos, itens, secoes, match, validacao_historico)
- `axia_*` (ai_logs, processing_logs, suggestions_log, item_dictionary, intake_items, budget_stats)
- `ai_budget_insights`, `ai_budget_actions_log`

Planta / ICF:
- `plan_measurements`, `plan_placed_elements`, `plan_budget_links`
- `icf_budget_snapshots`, `icf_project_analyses`

Adjudicação → Obra:
- `budget_awards` → `obras` → `financial_work_cycles`, `financial_milestones`
- `closing_sheets` (folha de fecho)

## 3. Edge functions Axia existentes

- `axia-chat` — chat real, já roteado via gateway com fallback Lovable.
- `axia-ai-gateway` — gateway produção, valida auth + organization_id + loga em `axia_ai_logs`.
- `axia-nvidia-test`, `axia-gateway-test` — admin only.
- `axia-organize-budget` — organiza caderno de encargos em capítulos/artigos.
- `axia-budget-rai` — análise risco/integridade orçamento.
- `axia-plan-*` — análise de plantas.

**Reuso na Fase 1–3:** `axia-organize-budget` para estruturação; nova `axia-budget-audit` para auditoria; tudo via `axia-ai-gateway`.

## 4. Fluxo atual adjudicação → obra/budget/forecast

1. Orçamento marcado adjudicado → `budget_awards` snapshot.
2. Trigger cria/liga `obras` (via `useAdjudicacao`).
3. `financial_work_cycles` recebe budget inicial (forecast = budget).
4. `financial_milestones` populado a partir de `budget_payment_plans`.
5. `closing_sheets` referencia `orcamento_id` original para comparação.

**Gap a resolver na Fase 5:** Não há tabela explícita `budget_lineage` que ligue proposta_comercial → orçamento_técnico → budget_base → folha_fecho. Hoje a rastreabilidade depende de joins indiretos via `obra_id`.

## 5. Riscos de regressão por fase

| Fase | Risco | Mitigação |
|---|---|---|
| 1 (wizard) | Conflito com `useBudgetVersions` autosave | Wizard só persiste no passo final; staging em estado local + draft em `localStorage` |
| 2 (review items) | Nova tabela sem RLS bloqueia tudo | Migration com GRANT + RLS multi-tenant `organization_id` |
| 3 (audit) | Custo IA elevado | Cache por hash do orçamento em `axia_processing_logs` |
| 4 (PDF comercial) | Confusão com PDF técnico atual | Ficheiro separado `proposta-comercial-pdf.ts`, botão distinto |
| 5 (lineage) | Trigger duplo em adjudicação | Reusar `useAdjudicacao` existente, adicionar passo opcional de criação de `budget_lineage` |
| 6 (dashboard) | Quebrar widgets atuais | Cards de ação adicionados acima; KPIs e widgets atuais ficam intactos abaixo |

## 6. Feature flag

Coluna nova `organizations.feature_orcamentacao_inteligente boolean default false`. Ativada inicialmente só na conta admin (super_admin override). UI só mostra a entrada quando flag ativa.

## 7. Confirmações necessárias antes da Fase 1

1. **Adicionar como 3ª opção** (não substitui Essencial/Avançado) — confirmado em plano.
2. **Proposta comercial esconde custos unitários e margens** — confirmar.
3. **Ativação por feature flag**, primeiro só admin — confirmar.

---
*Gerado na Fase 0 do plano `.lovable/plan.md`. Próximo passo: aguarda confirmação para iniciar Fase 1.*
