# Módulo Orçamento, Reorçamento, Budget Objetivo e Fecho Económico

## Estado atual vs. especificação

Já implementado (Fase 1 parcial):
- Tabelas `budget_versions`, `budget_version_items`, `closing_sheets`
- Colunas `is_locked`/`locked_at`/`locked_reason` em `orcamentos`
- RPCs `approve_base_dry_budget` e `create_new_target_version`
- Triggers `prevent_locked_budget_edit` / `prevent_locked_closing_sheet_edit`
- UI: tabs em `Ver.tsx` + `BaseDryBudgetPanel`, `TargetBudgetPanel`, `ClosingSheetsPanel`
- Hooks `useBudgetVersions`, `useClosingSheets`, `useOperationalLayerLabel`

Tabelas existentes que vamos reaproveitar (não criar novas redundantes):
- Adjudicações: `budget_awards`
- Cotações: `quote_requests`, `quote_request_items`, `quote_request_suppliers`, `quote_responses`, `quote_response_items`
- Fornecedores: `fornecedores`

A spec pede `contracting_packages`, `supplier_quotes`, `awards`, `purchases`, `budget_events`. Vamos **mapear** para o que já existe em vez de duplicar — só criamos o que faltar mesmo.

---

## Lacunas a fechar

### A. Modelo de dados
1. Adicionar a `budget_versions`: `chapters_snapshot jsonb` (para preservar capítulos copiados) — opcional, decidir conforme estratégia de cópia.
2. Criar `contracting_packages` (não existe equivalente genérico fora de installations).
3. Adicionar a `budget_awards`: FK `budget_version_id`, `package_id`, gatilhos para escrever em `budget_version_items.awarded_amount`.
4. Criar `obra_purchases` (compras directas / contratos de fornecimento) com FK `budget_version_id`.
5. Criar `budget_events` (auditoria económica única do módulo).
6. RLS multi-tenant em todas as novas tabelas via `get_org_member_ids()` (padrão já em uso).

### B. Lógica server-side (RPCs/Triggers)
1. `approve_base_dry_budget`: rever para também copiar **todos os artigos** do orçamento base para `budget_version_items` da v1 Target (hoje não faz a cópia explícita — confirmar e completar).
2. `create_new_target_version`: já existe; adicionar parâmetro `reason` obrigatório quando houver versões > 1.
3. Trigger `recalc_budget_version_totals` em `budget_version_items` (recalcula totais agregados da versão).
4. RPC `confirm_award(p_award_id)`: valida Target ativo, escreve `awarded_amount` nos items, marca `contracting_status='awarded'`, recalcula.
5. RPC `register_purchase(...)`: idem para `purchased_amount` e `remaining_amount`.
6. RPC `generate_final_closing_sheet(p_orcamento_id)`: cria `closing_sheets` tipo `final` a partir da versão Target ativa + adjudicações + compras + custos reais.
7. Função `log_budget_event(...)` chamada por todos os RPCs acima.

### C. UI / UX
1. **Aba Base Seco** (existe `BaseDryBudgetPanel`) — completar:
   - Aviso visual quando bloqueado + ações: "Ver Folha de Fecho Inicial", "Comparar com Budget Objetivo", "Ver histórico".
   - Quando não aprovado: "Editar", "Enviar para revisão", "Aprovar e gerar Folha de Fecho Inicial".
2. **Aba Budget Objetivo** (existe `TargetBudgetPanel`) — completar:
   - Tabela com colunas: Qtd base, Qtd atual, Valor base, Valor objetivo, Adjudicado, Comprado, Por adjudicar, Desvio base, Desvio versão anterior, Estado contratual, Fornecedor, Pacote.
   - Botões: Criar nova versão (com modal de motivo), Criar pacote, Atualizar com adjudicações, Ver desvios, Gerar Folha de Fecho Final.
   - Edição inline de `target_unit_price` e `target_quantity` (apenas versão `active`).
3. **Nova aba Pacotes de Contratação**:
   - Selecionar items do Target ativo → criar pacote.
   - Listar pacotes com KPIs base/objetivo/consultado/adjudicado.
4. **Nova aba Comparativos** (reaproveitar quote_responses):
   - Quadro comparativo de propostas por pacote.
5. **Nova aba Adjudicações & Compras**:
   - Lista de `budget_awards` filtradas pelo orçamento.
   - Form de registo de compra → RPC `register_purchase`.
6. **Aba Fecho Económico** (existe `ClosingSheetsPanel`) — separar visualmente Inicial (bloqueado) vs Final (vivo); botão "Gerar Folha de Fecho Final".
7. **Aba Histórico**: linha temporal a partir de `budget_events`.
8. **Aba Axia**: card com insights consumindo edge function `axia-budget-insights` (a criar).

### D. Integração de fluxos existentes
- `useAdjudicacao` e fluxo de adjudicação atual escrevem em `artigos_orcamento`. Refactor para invocar `confirm_award` que escreve em `budget_version_items` da versão ativa, deixando `artigos_orcamento` imutável.
- `quote_requests` passa a referenciar `budget_version_id` (não `orcamento_id` diretamente) — manter compat. via coluna opcional.

### E. Axia
Edge function `axia-budget-insights`:
- Lê versão Target ativa + base + adjudicações + compras + eventos.
- Devolve 3 níveis de mensagens (contexto, análise, sugestões) com guardrails: nunca propor edição directa do Base bloqueado.

### F. Segurança / RLS
- Reforçar policies usando `get_user_org_id()` e `get_org_member_ids()` (padrão actual).
- Garantir que triggers `prevent_locked_*` cobrem **todas** as tabelas novas (packages/awards/purchases não devem alterar versão `superseded`/`locked`).

---

## Faseamento de entrega

```text
Fase 1 — Fundação (parcialmente feita)
  └─ Completar cópia de items na approve_base_dry_budget
  └─ Criar budget_events + função log_budget_event
  └─ Trigger recalc_budget_version_totals

Fase 2 — UI Base/Objetivo/Fecho (em curso)
  └─ Completar 3 panels existentes (colunas, edição inline, ações)
  └─ Modal "Nova versão" com motivo
  └─ Histórico (timeline budget_events)

Fase 3 — Pacotes e Adjudicações
  └─ Tabela contracting_packages + RLS
  └─ FK em budget_awards (budget_version_id, package_id)
  └─ RPC confirm_award + refactor do fluxo actual
  └─ Aba Pacotes + Aba Comparativos + Aba Adjudicações

Fase 4 — Compras e Fecho Final
  └─ Tabela obra_purchases + RPC register_purchase
  └─ RPC generate_final_closing_sheet
  └─ Dashboard económico (KPIs base/objetivo/adjud/comp/desvios)

Fase 5 — Axia operacional
  └─ Edge function axia-budget-insights
  └─ Aba Axia + alertas contextuais
```

---

## Decisões pendentes (a confirmar antes de Fase 3)

1. **Adjudicações existentes**: já decidido — caso a caso. Implementaremos botão "Migrar para Budget Objetivo" em cada adjudicação activa pré-existente, sem migração em massa.
2. **Nomenclatura UI**: já decidido — dinâmica por perfil (`useOperationalLayerLabel` cobre isto).
3. **`obra_purchases`**: confirmar se queres uma tabela nova só para este módulo ou reaproveitar `cotacoes_internas_adjudicadas` (referida na memory `internal-quotes`). Recomendação: nova tabela `obra_purchases` ligada a `budget_version_id` para manter o módulo coerente.
4. **Edição da versão Target**: permitir alterar `target_quantity` (não só preço)? Recomendação: sim, mas com event log obrigatório.

## Próximo passo proposto

Avançar com **Fase 1 — completar fundação**: migration que (a) garante cópia de items na aprovação, (b) cria `budget_events` + `log_budget_event`, (c) adiciona trigger de recálculo de totais. Depois Fase 2 UI.

Confirmas este faseamento e queres que arranque pela Fase 1 (migration de fundação)?