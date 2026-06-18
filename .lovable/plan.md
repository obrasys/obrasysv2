
# Orçamentação Inteligente — Plano Faseado

Este é um plano grande (5+ fases). Vou implementar em incrementos, com testes de regressão entre cada fase, para não quebrar Orçamentos, Axia, Plantas/ICF, Obras, Budget, Forecast e Folha de Fecho.

## Fase 0 — Auditoria (sem alterar código)

Antes de qualquer alteração, faço um relatório curto em `.lovable/audit-orcamentacao-inteligente.md` mapeando:
- Pontos de entrada atuais de orçamento (`Essencial v2`, criação manual, importação caderno encargos, ICF, plantas, instalações paramétricas).
- Hooks/tabelas afetados: `orcamentos`, `budget_versions`, `budget_version_items`, `capitulos_orcamento`, `artigos_orcamento`, `caderno_*`, `plan_*`, `icf_*`, `budget_awards`, `financial_work_*`, `closing_sheets`.
- Edge functions Axia já existentes (`axia-chat`, `axia-ai-gateway`, intake de voz, organização IA de orçamentos, RAI).
- Fluxo atual de adjudicação → obra/budget/forecast.
- Riscos de regressão por fase.

Entrega: documento + confirmação contigo antes de Fase 1.

## Fase 1 — Esqueleto do fluxo "Orçamentação Inteligente"

- Nova rota `/orcamentos/inteligente` com wizard de 5 passos (Stepper):
  1. Contexto da obra (cliente, prazo, regime fiscal)
  2. Importar documentos (PDF, Excel, caderno encargos, planta PDF/DXF)
  3. Estruturação Axia (capítulos/artigos/unidades/quantidades)
  4. Revisão assistida obrigatória
  5. Gravar como rascunho de orçamento
- Reaproveita componentes existentes: `useCadernos`, `useBudgetVersions`, importadores Excel/PDF, motor `axia-organize-budget`.
- Entradas no Dashboard e em `/orcamentos` ao lado de "Essencial" e "Avançado" (sem remover os existentes).
- **Sem persistir nada definitivo** sem clicar "Confirmar revisão".

## Fase 2 — Revisão assistida + tabela de pendências

- Nova tabela `axia_budget_review_items` (organization_id, orcamento_id, tipo: `missing_price` | `suspect_quantity` | `ambiguous_unit` | `doc_mismatch` | `human_question`, severity, payload jsonb, status `pending|accepted|rejected|fixed`, resolved_by).
- UI de revisão: lista lado-a-lado com origem (documento/página/linha), sugestão Axia, ação do utilizador.
- Bloqueio: gravação só permitida quando nenhum item `severity=critical` está `pending`.
- Mensagem padrão Axia: "Esta análise requer validação humana."

## Fase 3 — "Auditar orçamento com Axia"

- Botão em qualquer orçamento (rascunho ou em revisão).
- Edge function `axia-budget-audit` (passa pelo `axia-ai-gateway`, sem expor provider) que valida:
  artigos sem preço, quantidades fora de banda histórica, capítulos sem margem, custos indiretos, estaleiro, IVA por regime, divergências doc vs orçamento, riscos técnicos, exclusões sugeridas, observações.
- Resultado guardado em `axia_budget_review_items` para reuso da UI da Fase 2.

## Fase 4 — Proposta Comercial em PDF

- Novo gerador `src/lib/proposta-comercial-pdf.ts` (jsPDF, mesmo padrão vetorial do PDF atual) com:
  capa branded, dados cliente/obra, resumo por capítulos (sem custos internos nem margens), prazo, condições pagamento, validade, exclusões, observações técnicas, anexos.
- Mantém o PDF técnico atual intacto.
- Nova tabela `commercial_proposals` (orcamento_id, version, snapshot jsonb, valid_until, status, pdf_url).

## Fase 5 — Adjudicação → Orçamento Base + rastreabilidade

- Ao marcar proposta como adjudicada:
  - Snapshot imutável do orçamento original (já existe parcialmente via `budget_awards`).
  - Cria "Orçamento Base" da obra alimentando Budget e Forecast inicial (`financial_work_cycles` / `financial_milestones`) sem alterar o orçamento original.
  - Liga `proposal_id → budget_base_id → obra_id → folha_fecho_id` via nova tabela `budget_lineage` (proposal_id, budget_id, base_budget_id, obra_id, closing_sheet_id, created_at).
- UI de "Rastreabilidade" no detalhe da obra mostrando a cadeia completa.

## Fase 6 — Dashboard guiado por ações

- Refazer o topo do Dashboard com 7 cards de ação principais:
  Criar orçamento · Importar documentos · Analisar planta · Gerar proposta · Acompanhar margem · Rever documentos · Auditar orçamento.
- Manter KPIs e widgets existentes em baixo, com menos peso visual.
- Sem remover nenhum bloco atual sem confirmação.

## Princípios transversais

- Nenhuma referência a provider/modelo IA na UI pública (mantém regra já em vigor).
- Todas as chamadas IA pelo `axia-ai-gateway` com log em `axia_ai_logs`.
- Cada fase entrega: migrações com GRANT + RLS, hooks tipados, UI, e um curto checklist de regressão (`.lovable/checklist-orc-inteligente-fase-N.md`).
- Feature flag por organização (`feature_flags.orcamentacao_inteligente`) para ativar gradualmente.

## Detalhes técnicos resumidos

- Stack: React/Vite + Supabase + Edge Functions Deno (sem mudanças).
- Reuso máximo: importadores Excel/PDF, `useBudgetVersions`, motor Axia de organização, gerador PDF atual como base.
- Novas tabelas (todas com `organization_id`, RLS multi-tenant, GRANTs):
  `axia_budget_review_items`, `commercial_proposals`, `budget_lineage`.
- Novas edge functions: `axia-budget-audit`, `generate-commercial-proposal-pdf` (server-side opcional; default client-side jsPDF).

## Como avançamos

Confirma-me só **3 coisas** antes de eu começar a Fase 0:

1. Posso adicionar o fluxo como **opção adicional** ao lado de Essencial/Avançado (não substitui)?
2. A Proposta Comercial deve esconder por completo custos unitários e margens (só totais por capítulo)?
3. Ativação inicial só na tua conta via feature flag, depois alargamos?
