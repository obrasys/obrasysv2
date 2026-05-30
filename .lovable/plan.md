# Plano — Área "Orçamento & RAI da Obra" (dentro de Orçamentos)

## Visão geral
Adicionar **dentro** do módulo Orçamentos uma nova área de consolidação financeira por obra, sem criar módulo isolado e sem alterar o nome do módulo principal. Reutilizar dados já existentes (orçamentos, folhas de fecho, MCE, compras, autos, faturas, contabilidade, SPV) e expor um painel unificado com timeline das 4 fases: **Budget → Forecast → Outturn → Aftercare**.

Dada a dimensão do pedido (≈25 secções, ~9 tabelas novas, regras de consolidação, RLS, Axia, permissões, UI), proponho executar por **fases incrementais**, cada uma entregando valor de forma autónoma e sem partir o que já existe.

---

## Fase 0 — Decisões e fundações (1 entrega)

- Confirmar localização: nova rota `obras/:obraId/orcamento-rai` ligada a partir do dossier da obra e a partir de `/orcamentos/:id/ver` (botão "Abrir Orçamento & RAI da Obra").
- Criar tipo `FinancialPhase = 'budget' | 'forecast' | 'outturn' | 'aftercare'`.
- Criar serviço `consolidateOrcamentoRaiObra(obraId, phase)` (stub inicial — retorna dados já existentes em memória; será preenchido por fase).
- Não tocar em `Orcamentos.Index`, rotas, permissões existentes.

## Fase 1 — UI base + Timeline + leitura do que já existe (entrega visível)

Página `OrcamentoRaiObra.tsx` com:
- **Cabeçalho inteligente**: nome obra, centro de custo, fase atual auto-detetada, RAI principal, margem, última atualização, botão discreto Axia.
- **Timeline financeira** (cards clicáveis em vez de tabs/botões secos): Budget · Forecast · Outturn · Aftercare, com estado (ativa/concluída/pendente/bloqueada), data, RAI e margem por fase.
- **Cards KPI**: Vendas, Custos, Margem €, Margem %, RAI, Desvio vs Budget, Impacto MCE, Custos SPV, RAI c/ SPV.
- **"O que precisa da sua atenção"**: lista derivada de regras simples (MCE c/ perda, compras sem MCE, adjudicações sem contrato, autos pendentes, faturas sem CC, forecast desatualizado).
- **Área de trabalho da fase ativa** (placeholder por fase).
- **Fontes e Integrações** (cards de leitura): Orçamento Base, MCE/Adjudicações, Compras, Contratos, Autos, Certificados, Faturação, Contabilidade, SPV, Axia — cada card mostra estado, última atualização, totais, valor associado, impacto no RAI.
- **Painel Axia** contextual (chama edge function existente `axia-budget-insights` adaptada).

Auto-deteção da fase atual:
- FF Base não aprovada → `budget`
- FF Base aprovada + obra em curso → `forecast`
- Obra em encerramento → `outturn`
- Obra em pós-venda → `aftercare`

Nesta fase **ainda não há tabelas novas**; lemos do que existe (`closing_sheets`, `mce_*`, `purchases`, `autos_medicao`, `invoices`, etc.).

## Fase 2 — Modelo de dados financeiro consolidado (migração)

Criar tabelas (todas multi-tenant via `organization_id`, RLS por org + role, GRANT a `authenticated`/`service_role`):

- `financial_work_cycles` (1 por obra)
- `financial_work_documents` (snapshot por fase/versão)
- `financial_work_lines` (linhas detalhadas com `source_module`, `source_id`)
- `financial_source_links` (vínculos entre módulos — anti-duplicação)
- `financial_integration_sync_logs`
- `guarantee_retentions`
- `aftercare_records`
- Extensões a `mce_records`/`mce_proposals` (apenas os campos em falta; já existem hoje)

Triggers: `updated_at`, validação de fases, proteção contra edição de Budget bloqueado.

## Fase 3 — Budget oficial + bloqueio pós-aprovação FF Base

- Ao aprovar a Folha de Fecho Base, gerar `financial_work_document` (phase=`budget`, status=`approved`, `locked_at`) e congelar valores (snapshot das linhas).
- Validar codificação de artigos `AAA.000` (3 letras + 3 dígitos) e família (`MAT|MO|SUB|SRV|ALU|DIV`) — aviso se em falta, não bloqueia.
- Desbloqueio só com permissão admin + justificação (log em auditoria).

## Fase 4 — Forecast vivo + motor de consolidação real

- Versões de forecast (`Forecast 01..N`), apenas 1 ativo.
- Motor `consolidateOrcamentoRaiObra` passa a calcular:
  - Vendas/custos/margem/RAI a partir das fontes prioritárias por fase (regra 18.2 do pedido).
  - Ganho/perda MCE: `Valor Seco Forecast − Valor Adjudicado` (€ e %), agregado no RAI.
- Mapa resumo geral de MCEs (tabela com colunas exigidas em 8.3) embutido na fase Forecast.
- Anti-duplicação por `financial_source_links` (MCE↔compra↔contrato↔auto↔certificado↔fatura↔lançamento).

## Fase 5 — Autos, certificados e retenções

- Sincronização autos→certificados→faturas, cálculo de % executada, valor líquido, retenção de garantia.
- Estados conforme 10.3; alertas para trabalhos a mais/menos.

## Fase 6 — Faturação e contabilidade (Outturn)

- Reconciliação faturas↔MCE/contrato/auto/CC.
- Geração de Outturn com base em contabilidade + faturação fechada.
- Bloqueio da Folha de Fecho Final.

## Fase 7 — Aftercare / SPV

- Centro de custo `OB.xxx.SPV` automático ao iniciar pós-venda.
- KPIs SPV e fórmula `RAI c/ SPV = RAI Outturn − Custos SPV`.
- Filtro global "com/sem SPV".

## Fase 8 — Axia, permissões e auditoria

- Extensão `axia-budget-insights` (ou nova edge `axia-rai-obra`) para análise contextual da fase: duplicações, sugestões de ligação, resumo executivo, riscos. **Sem aceitar/alterar dados.**
- Novas permissões (lista em §23.1 do pedido) acopladas a `has_role`.
- Log de auditoria em `audit_log` para todas as ações críticas listadas em §22.

---

## UI/UX — princípios
- Timeline horizontal premium (rounded-xl, deep teal), não 4 botões secos.
- Cards clicáveis com estado visual claro (ativa, concluída, pendente, bloqueada).
- Sem quebrar padrões existentes (`kpi-card`, `status-badge`, listing layout).
- Mobile: timeline scrollable horizontal.

## Segurança
- Multi-tenant estrito por `organization_id` em todas as novas tabelas.
- RLS + GRANT em todas as migrações.
- Edge functions com JWT + validação de pertença à org da obra.
- Axia jamais executa ações de escrita financeira.

## O que **não** se faz
- Não renomeia módulo Orçamentos.
- Não cria módulo "Ciclo Financeiro" isolado na navegação.
- Não duplica dados — apenas referencia via `financial_source_links`.
- Não quebra rotas/permissões/menus atuais.

---

## Perguntas antes de avançar
Antes de começar a Fase 1, preciso confirmar algumas decisões para alinhar com o que já existe na plataforma:

1. **Escopo desta primeira entrega**: avanço só com **Fase 0 + Fase 1** (UI + timeline + leitura, sem migrações ainda) para validar o conceito visualmente, ou queres já incluir a **Fase 2** (criação do modelo de dados)?
2. **Ponto de entrada**: a nova área aparece como **separador no dossier da obra**, como **botão dentro de `/orcamentos/:id/ver`**, ou **ambos**?
3. **MCE, Compras, Autos, Faturas**: alguns desses módulos já existem no projeto (vi `useMCE`, `usePurchases`, `useAutosMedicao`, `useFinanceiro`). Posso assumir que as tabelas e fluxos atuais são a fonte de verdade e apenas **leio/consolido**, certo? Ou queres que eu refatore algum deles?
4. **Codificação `AAA.000` e famílias obrigatórias nos artigos**: aplico apenas **validação suave (aviso)** nesta fase, ou queres **bloqueio rígido** já agora (impacta orçamentos existentes)?

Responde a estas e arranco pela Fase 0 + Fase 1.
