

# Módulo de Cronograma, RDO Operacional, Progresso Físico e Alertas Financeiros

## Visão Geral

Este é o módulo mais complexo e estruturante do Obra Sys. Transforma a RDO de um simples diário descritivo num motor operacional que alimenta automaticamente cronograma real, progresso físico ponderado e previsão financeira.

Dado o tamanho e complexidade, a implementação será dividida em **4 fases incrementais**, cada uma funcional por si só.

---

## Fase 1 — Fundação: Cronograma Estimado + RDO Estruturada + Progresso Automático

### 1.1 Base de Dados (Migration)

Criar as tabelas core com RLS isolado por organização (`user_id = ANY(get_org_member_ids())`):

**Tabelas a criar:**

- `project_schedule_versions` — versões do cronograma (estimated, reforecast, manual_revision), com campos de aprovação e baseline
- `project_schedule_tasks` — tarefas do cronograma com WBS, pesos (físico e financeiro), datas planeadas/reais/projetadas, progresso, criticidade, método de progresso (quantity_based, percent_increment), curva planeada, folga
- `project_schedule_dependencies` — dependências FS/SS/FF/SF com lag
- `daily_reports` — nova tabela de RDO operacional (coexiste com `relatorios_diarios` existente) com campos de identificação, estado do dia, clima, regime, sumário executivo
- `daily_report_activities` — tabela ponte RDO↔Cronograma: atividade, quantidades planeadas/executadas, produtividade, desvio, SPI, impacto
- `daily_report_productions` — produção física detalhada por serviço/zona
- `daily_report_labor_resources` — mão de obra por atividade
- `daily_report_equipment_resources` — equipamentos
- `daily_report_materials` — materiais consumidos/recebidos
- `daily_report_constraints` — impedimentos estruturados com severidade e status
- `daily_report_quality` — inspeções, não conformidades, retrabalho
- `daily_report_safety` — incidentes, paragens, horas perdidas
- `daily_report_client_inspection` — aprovações pendentes, fiscalização
- `task_progress_snapshots` — snapshots diários por tarefa
- `project_progress_snapshots` — snapshots globais da obra
- `project_milestones` — marcos da obra
- `financial_milestones` — marcos financeiros com trigger por progresso/data
- `financial_alerts` — alertas com severidade, dedupe_key, acknowledgement
- `task_productivity_history` — histórico de produtividade por tarefa
- `task_reforecast` — registo de reforecasts com classificação de atraso
- `schedule_audit_log` — log de auditoria para ações no cronograma

Cada tabela terá `user_id` (NOT NULL) para RLS via `get_org_member_ids()`, mantendo o padrão existente do projeto (sem `company_id` separado — o sistema usa `organization_members` via `get_org_member_ids()`).

**Nota arquitetural importante:** O sistema existente usa `user_id` + `get_org_member_ids()` para isolamento multi-empresa, não `company_id`. Todas as novas tabelas seguirão este padrão.

### 1.2 Types TypeScript

Criar ficheiros de tipos:
- `src/types/schedule.ts` — tipos para cronograma, tarefas, dependências, versões
- `src/types/daily-reports.ts` — tipos para RDO operacional (10 camadas)
- `src/types/financial-milestones.ts` — marcos financeiros e alertas

### 1.3 Hooks

- `src/hooks/useSchedule.ts` — CRUD de versões, tarefas, dependências; aprovação de baseline
- `src/hooks/useDailyReports.ts` — CRUD de RDO operacional com sub-tabelas (atividades, recursos, restrições, qualidade, segurança)
- `src/hooks/useProjectProgress.ts` — cálculo de progresso ponderado (previsto vs real), snapshots
- `src/hooks/useFinancialMilestones.ts` — marcos financeiros e alertas

### 1.4 Edge Functions

- `generate-estimated-schedule` — gera cronograma estimado a partir do orçamento adjudicado, usando Axia (Gemini Flash) para sugerir sequência e durações, combinado com templates por tipologia
- `process-daily-report` — processa RDO aprovada: atualiza progresso, recalcula durações, propaga impactos, gera snapshots, classifica atrasos, recalcula caminho crítico
- `generate-financial-alerts` — analisa marcos financeiros, progresso e datas para emitir alertas com deduplicação

### 1.5 Frontend — Página da Obra (novos separadores)

Reorganizar a página `Ver Obra` com separadores:

**Separador "Planeamento":**
- Visualização do cronograma estimado (tabela hierárquica com Gantt simplificado via barras CSS)
- Baseline aprovada com indicador visual
- Pesos por etapa (financeiro/físico)
- Botão "Validar e Aprovar Baseline"
- Sugestão Axia para sequência

**Separador "RDO Operacional":**
- Formulário em 7 sub-separadores:
  1. Resumo do dia (clima, regime, sumário)
  2. Atividades do cronograma (seleção múltipla, quantidades, percentuais)
  3. Produção física (por serviço/zona, fotos)
  4. Recursos (mão de obra, equipamentos, materiais)
  5. Restrições (impedimentos estruturados)
  6. Qualidade e segurança
  7. Impacto automático (calculado após submissão)
- Estado de aprovação, comparação planeado vs real

**Separador "Execução":**
- Cronograma real com início/fim real por tarefa
- Progresso acumulado por tarefa
- Atraso por etapa
- Frentes bloqueadas
- Produtividade observada

**Separador "Controlo":**
- KPIs: progresso previsto, real, desvio, SPI, aderência
- Gráfico curva previsto vs real vs forecast (Recharts)
- Tabela de etapas com semáforo
- Tendência de produtividade

**Separador "Financeiro Previsto":**
- Marcos financeiros com status
- Recebimentos/pagamentos previstos
- Alertas abertos com explicação
- Risco de tesouraria

### 1.6 Componentes

- `src/components/schedule/ScheduleGanttTable.tsx` — tabela hierárquica com barras de Gantt
- `src/components/schedule/ScheduleTaskRow.tsx` — linha individual
- `src/components/schedule/BaselineApprovalCard.tsx` — card de aprovação
- `src/components/daily-reports/DailyReportForm.tsx` — formulário principal com sub-separadores
- `src/components/daily-reports/ActivitySelector.tsx` — seleção de atividades do cronograma
- `src/components/daily-reports/ConstraintForm.tsx` — formulário de impedimentos
- `src/components/daily-reports/ImpactSummary.tsx` — resumo de impacto pós-processamento
- `src/components/progress/ProgressDashboard.tsx` — KPIs e gráficos
- `src/components/progress/ProgressCurveChart.tsx` — curva S previsto vs real
- `src/components/progress/TaskSemaphoreTable.tsx` — tabela com semáforo
- `src/components/financial-forecast/MilestonesTimeline.tsx` — timeline de marcos
- `src/components/financial-forecast/AlertsPanel.tsx` — painel de alertas

---

## Fase 2 — Cronograma Real Derivado + Snapshots + Produtividade

### Adições:
- Triggers de banco para recalcular progresso após aprovação de RDO
- Lógica de propagação de dependências (FS push)
- Job diário (pg_cron) para snapshots e alertas
- Histórico de produtividade por tarefa
- Reforecast automático com classificação de atraso (recuperável, estrutural, crítico)
- Gráficos de tendência de produtividade

---

## Fase 3 — Axia Assistida

### Adições:
- Edge function `axia-schedule-suggestions` — sugestões de cronograma baseadas em orçamento
- Interpretação assistida de texto livre da RDO (associar a tarefas)
- Explicação de desvios em linguagem clara
- Resumo semanal da obra (edge function `axia-weekly-summary`)
- Alertas contextuais no painel Axia
- Deteção de padrões de atraso
- Recomendações de replaneamento

---

## Fase 4 — Replaneamento + Análise Comparativa

### Adições:
- Replaneamento assistido com reforecast manual
- Análise comparativa entre obras similares
- Inteligência de tesouraria avançada
- Previsões por padrões históricos

---

## Decisões Técnicas

| Decisão | Escolha |
|---------|---------|
| Isolamento multi-empresa | `user_id` + `get_org_member_ids()` (padrão existente) |
| Gantt chart | Tabela hierárquica com barras CSS (sem lib externa pesada) |
| Gráficos | Recharts (já usado no projeto) |
| IA | Lovable AI Gateway com Gemini Flash |
| Progresso global | Ponderação por peso financeiro > peso físico > peso padrão |
| RDO antiga | Coexiste; nova `daily_reports` para módulo avançado |
| Aprovação baseline | Requer perfil admin/gestor via `organization_members.role` |
| Snapshots | Gerados por trigger (on RDO approval) + job diário |
| Alertas financeiros | Deduplicados por `dedupe_key`, com severidade e acknowledgement |

## Estimativa de Escopo

- **~22 tabelas** novas
- **~3 edge functions** na Fase 1
- **~15 componentes** frontend novos
- **~4 hooks** novos
- **~2 tipos** novos

A Fase 1 sozinha já entrega valor: cronograma estimado, RDO estruturada ligada ao cronograma, progresso automático ponderado e dashboard de controlo.

**Recomendação:** Implementar Fase 1 primeiro, validar com uso real, depois avançar para as fases seguintes.

