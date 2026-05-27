# Camada de Centros de Custo, Gestão Financeira e Dossier de Promotor

Implementação **aditiva e faseada**. Nada do fluxo atual (Obras, Orçamentos, Folha de Fecho, Fornecedores, Faturas, Axia) é removido ou reescrito. Apenas adicionamos campos opcionais, novas tabelas e novos ecrãs que **consomem** o que já existe.

Dada a dimensão (22 blocos), proponho entregar em **6 fases** que podem ser aprovadas/lançadas independentemente. Esta proposta cobre **Fase 1 a Fase 3** em detalhe; Fases 4–6 ficam descritas em alto nível e detalhamos quando chegar a vez.

---

## Princípios transversais

- **Multi-tenant**: tudo via `organization_id` (já é padrão do projeto) + RLS com `get_org_member_ids()`.
- **Não-destrutivo**: novas colunas são `nullable`, sem `NOT NULL` em tabelas antigas. Sem renomes.
- **Compatibilidade**: dados existentes continuam a funcionar sem `cost_center_id`. Os novos relatórios tratam `NULL` como "não classificado".
- **Sem refazer Folha de Fecho, Orçamentos, MCE etc.** — onde já existe módulo (ex.: `contracting_packages` = MCE/Consultas, `budget_awards` = Adjudicações, `autos_medicao`, `obra_purchases`), **só adicionamos `cost_center_id` + `cost_nature`** e novos dashboards. O dossier da obra é uma **vista agregadora** sobre tabelas existentes.
- **Axia**: estendemos o prompt central com glossário CE/OB, MB vs RAI, naturezas. Sem nova edge function nesta fase.

---

## FASE 1 — Fundação: Centros de Custo + Naturezas (entrega imediata)

### 1.1 Schema

**Nova tabela `cost_centers`** com `organization_id`, `code`, `name`, `type ∈ ('estrutura','obra')`, `parent_id`, `obra_id`, `location`, `fiscal_year`, `active`. Unique `(organization_id, code)`. RLS por org. GRANTs para `authenticated` + `service_role`.

**Enum `cost_nature`**: `MO | MAT | SRV | INS | ALU | DIV`.

**Sequência por org** via função `next_obra_cost_center_code(org_id)` → `OB.001`, `OB.002`...

**Trigger `on_obra_created_create_cost_center`** em `public.obras AFTER INSERT`: cria automaticamente `OB.NNN — <nome> — <localizacao>` com `type='obra'` e `obra_id = NEW.id`.

**Backfill**: gerar OB.NNN para todas as obras existentes (ordenadas por `created_at`) e ligar via `obras.cost_center_id`. Seed dos 8 CE padrão (CE.01–CE.08) por organização existente.

### 1.2 Colunas opcionais (ADD COLUMN IF NOT EXISTS, todas nullable)

Em: `obras`, `orcamentos`, `artigos_orcamento`, `capitulos_orcamento` (só `cost_nature` default por capítulo), `obra_purchases`, `budget_awards`, `contracting_packages`, `budget_version_items`, `autos_medicao`, `autos_medicao_itens`, `contas_financeiras` (faturas/pagamentos/recebimentos — verificar nome real), `supplier_*` quando aplicável.

Campos: `cost_center_id uuid`, `cost_nature public.cost_nature`, `source text`.

### 1.3 UI mínima Fase 1

- Página **/empresa/centros-de-custo**: lista CE + OB, criar/editar CE manuais e subcentros, ver OB auto-gerados (read-only no código, editáveis no nome/local).
- Componente `<CostCenterPicker />` + `<CostNaturePicker />` reutilizáveis.
- Acrescentar como **filtro opcional** (não obrigatório) nos ecrãs financeiros existentes — sem mudar layout principal.

**Critério de aceite Fase 1**: criar obra → aparece OB.NNN automaticamente; é possível lançar despesa CE sem obra; filtros funcionam; nada do fluxo atual quebra.

---

## FASE 2 — Gestão da Empresa (Dashboard + Cálculos MB/RAI)

### 2.1 Funções SQL (views materializadas leves)

- `fn_obra_result(obra_id, fiscal_year?)` → `{ receitas, custos, mb, mb_pct }`
  - Receitas: soma de recebimentos/faturação de venda ligados ao OB.
  - Custos: soma de `obra_purchases` + autos pagos + qualquer linha financeira com `cost_center_id` do OB.
- `fn_ce_costs(org_id, fiscal_year)` → soma de custos com `cost_center.type='estrutura'`.
- `fn_rai_empresa(org_id, fiscal_year)` → `SUM(fn_obra_result.mb) - fn_ce_costs`.
- `fn_margem_sobre_venda(custo, margem_pct)` → `custo / (1 - margem_pct/100)` (helper para frontend e edge functions).

### 2.2 Página `/empresa/gestao` com tabs

`Centros de Custo` · `Custos de Estrutura` · `Resultado por Obra` · `Resultado Anual` · `Pagamentos` · `Recebimentos` · `Retenções de Garantia` · `Faturas Contabilista`.

KPIs: Resultado total obras, Total CE, RAI anual, MB média, Adjudicado, Faturado, Pago, Recebido, A pagar, A receber, Retenções ativas, Custos SPV/obra. Todos calculados das tabelas existentes + `cost_center_id`.

### 2.3 Helper `calcMargemSobreVenda` em `src/lib/finance.ts` + correção nos pontos onde hoje se usa `custo * (1+margem)` para o caso "margem sobre venda" (manter os dois modos: "markup sobre custo" e "margem sobre venda" explícitos na UI).

---

## FASE 3 — Dossier do Promotor (vista agregadora na página da Obra)

Sem duplicar dados. Adicionar tabs ao detalhe da obra (`/obras/:id`):

`Estudo Viabilidade` · `Orçamento Base` · `Folha de Fecho` · `Consultas` · `MCE` · `Adjudicações/NE` · `Contratos` · `Controlo de Custos` · `Autos` · `Faturas` · `Recebimentos` · `Receção Provisória` · `Fecho de Contas` · `Garantias` · `SPV`.

Cada tab é um wrapper que filtra módulos existentes por `obra_id` (e por `cost_center_id` do OB). Tabs sem dados mostram CTA "iniciar".

**Painel Controlo de Custos**: tabela cruzada Capítulo × {Base seco, Folha de Fecho, Adjudicado, Faturado, Pago, Saldo, Desvio %, % adjudicada, % executada}. Filtros por capítulo, natureza, fornecedor, contrato, CC.

---

## FASES 4–6 (resumo, detalhamos depois)

- **Fase 4 — Receção/Garantias/Recebimentos faseados**: tabela `client_payment_plans` (frações × marcos: CPCV 15%, Início 15%, Estrutura 15%, Escritura 55%, editáveis), painel de retenções (já temos `retention_percent` em vários sítios — agregar), etapas Receção Provisória → Fecho de Contas.
- **Fase 5 — SPV**: novo módulo `spv_occurrences` ligado a OB.NNN-SPV.XX com fotos, fornecedor, custo estimado/real, prioridade, estado; relatórios por motivo/fração/fornecedor.
- **Fase 6 — Axia**: atualizar prompt central da Axia (`supabase/functions/axia-*`) com glossário CE/OB, MB vs RAI, naturezas MO/MAT/SRV/INS/ALU/DIV, regras de classificação automática com `review_required: true` em baixa confiança. Sugestão automática de `cost_center_id` + `cost_nature` ao lançar despesa.

---

## Detalhes técnicos (Fase 1)

```text
migrations/
  *_cost_centers_foundation.sql   -- enum, tabela, função sequencial, trigger, backfill, seed CE
  *_add_cost_center_columns.sql   -- ADD COLUMN IF NOT EXISTS em ~12 tabelas

src/types/cost-center.ts
src/hooks/useCostCenters.ts
src/components/finance/CostCenterPicker.tsx
src/components/finance/CostNaturePicker.tsx
src/pages/empresa/CentrosDeCusto.tsx
src/lib/finance.ts                -- calcMargemSobreVenda, calcMB, calcRAI helpers

App.tsx                            -- rota /empresa/centros-de-custo
src/components/Sidebar (grupo "Empresa") -- novo item
```

Sem alterações em: `icf-*`, `orcamentos` (apenas ADD COLUMN), edge functions existentes, types.ts (regenera).

---

## Fora de scope (explícito)

- Integração SAF-T / ERP externo.
- Reescrita do módulo de Orçamentos ou Folha de Fecho.
- Migração de dados financeiros antigos para classificação obrigatória (fica `NULL` = "não classificado" até o utilizador rever).

---

## Pergunta antes de avançar

Confirmas que entrego **só a Fase 1 agora** (fundação + seed + UI mínima), e depois avançamos Fase 2 e 3? Ou queres que eu já agrupe Fase 1 + 2 numa entrega (mais demorada mas com dashboard "Gestão da Empresa" funcional logo)?
