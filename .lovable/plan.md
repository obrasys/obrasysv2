
# Plano: Orçamento Base Seco, Reorçamento e Folhas de Fecho

Reorganização do módulo Orçamento para separar a **estimativa congelada** (Base Seco) da **camada operacional ativa** (Budget Objetivo / Reorçamento / Ficha de Produção), com fechos económicos inicial e final.

## Visão de fluxo

```text
Base Seco (rascunho → em revisão → aprovado)
        │
        ├─► Folha de Fecho Inicial   (snapshot bloqueado)
        │
        └─► Budget Objetivo v1 (ativo, editável)
                 │
                 ├── Pacotes de Contratação
                 ├── Comparativos
                 ├── Adjudicações / Compras  ──► atualiza v ativa
                 │
                 └─► v2 → v3 → … (versão final)
                              │
                              └─► Folha de Fecho Final
```

Regra de ouro: **adjudicações, compras e pacotes nunca alteram o Base Seco aprovado**. Atualizam sempre a versão ativa do Budget Objetivo.

---

## 1. Estrutura de dados (novas tabelas)

### `budget_versions`
Representa cada versão de orçamento (base seco, objetivo v1/v2…, fechos).
- `id`, `user_id`, `organization_id`, `obra_id`, `source_budget_id` (FK `orcamentos.id` original)
- `version_type`: `base_dry` | `target` (v1..N) | `initial_closing` | `final_closing`
- `version_number`, `version_name`, `parent_version_id`, `reason`
- `status`: `draft` | `under_review` | `approved` | `locked` | `active` | `superseded` | `closed` | `archived`
- Totais agregados: `total_base`, `total_target`, `total_awarded`, `total_purchased`, `total_remaining`, `variance_from_base`, `variance_from_previous`
- `approved_by`, `approved_at`, `locked_at`, `created_by`, timestamps

Constraint: para cada `obra_id`, apenas **uma** linha com `version_type='target' AND status='active'`.

### `budget_version_items`
Snapshot de linhas por versão (não mexe nas `artigos_orcamento` originais).
- `id`, `budget_version_id`, `source_artigo_id`, `chapter_code/name`, `description`, `unit`
- `base_quantity`, `base_unit_price`, `base_total`
- `target_quantity`, `target_unit_price`, `target_total`
- `awarded_amount`, `purchased_amount`, `remaining_amount`
- `variance_from_base`, `variance_from_previous`
- `contracting_status`: `open` | `in_quote` | `awarded` | `purchased` | `closed`
- `package_id`, `supplier_id`, `notes`

### `closing_sheets`
Folhas de Fecho Inicial e Final.
- `id`, `obra_id`, `budget_version_id`, `closing_type`: `initial` | `final`
- `status`: `draft` | `approved` | `locked`
- Económicos: `total_direct_cost`, `total_indirect_cost`, `site_costs`, `structure_costs`, `contingency_amount`, `margin_amount`, `margin_percent`, `sale_price`, `expected_result`, `final_result`
- `approved_by`, `approved_at`, `locked_at`, `notes`

Triggers: `set_updated_at`, bloqueio de UPDATE quando `status='locked'` (exceto super admin).

### Ajustes em `orcamentos`
- Novos estados: `aprovado_fechado` (substitui terminal de `aprovado` no fluxo seco) e `bloqueado`.
- Coluna `is_locked boolean default false`, `locked_at`, `locked_reason`.
- Trigger `prevent_locked_budget_edit`: rejeita UPDATE/INSERT/DELETE em `orcamentos`, `capitulos_orcamento`, `artigos_orcamento` se a versão estiver `is_locked=true` (exceto admin com flag explícita de revisão controlada).

### RLS
- Todas as tabelas novas com RLS usando `get_org_member_ids()` (padrão multi-tenant já existente).
- Política UPDATE em `closing_sheets` bloqueia se `status='locked'`.

---

## 2. Lógica de transição (DB functions)

- **`approve_base_dry_budget(p_orcamento_id)`** (SECURITY DEFINER):
  1. Valida ownership + estado ≠ `aprovado_fechado`.
  2. Cria `budget_versions` com `version_type='base_dry'`, `status='locked'`.
  3. Copia capítulos/artigos para `budget_version_items` (snapshot base).
  4. Gera `closing_sheets` (`closing_type='initial'`, `status='locked'`).
  5. Marca `orcamentos.is_locked=true`, `status='aprovado_fechado'`.
  6. Retorna `{ base_version_id, initial_closing_id }`.

- **`create_target_budget(p_base_version_id, p_reason)`**:
  - Copia items da versão base → nova versão `target` v1 com `status='active'`.
  - Marca qualquer `target` anterior como `superseded`.

- **`create_new_target_version(p_obra_id, p_reason)`**:
  - Copia da `active` corrente, incrementa `version_number`, mantém anterior como `superseded` após aprovação da nova.

- **`apply_award_to_target(p_award_id)`** (chamado pelo trigger de `budget_awards`):
  - Atualiza `awarded_amount`, `contracting_status='awarded'`, recalcula `variance_*` na versão ativa.
  - Nunca toca em `version_type='base_dry'`.

- **`generate_final_closing_sheet(p_obra_id)`**:
  - Consolida active target + compras + custos reais → `closing_sheets` `closing_type='final'`.

---

## 3. UI / UX

### Página de detalhe do Orçamento
Tabs no topo: **Base** | **Budget Objetivo** | **Pacotes** | **Comparativos** | **Adjudicações/Compras** | **Fecho Económico**.

**Tab Base**
- Quando `is_locked=true`: badge `Fechado Inicial / Bloqueado`, banner amarelo com a mensagem padrão ("As adjudicações, compras e alterações devem ser feitas no Budget Objetivo."), tabela read-only com colunas reduzidas (Código, Descrição, Un, Qt, PU seco, Total, Capítulo, Estado).
- Botões: `Ver Folha de Fecho Inicial`, `Criar / Ver Budget Objetivo`, `Histórico de versões`.
- Quando não bloqueado: botões `Editar`, `Enviar para revisão`, `Aprovar e gerar Folha de Fecho Inicial` (com dialog de confirmação que explica o bloqueio).

**Tab Budget Objetivo / Reorçamento / Ficha de Produção** (nome dinâmico — ver §5)
- Selector de versão (v1, v2, …) + badge `Versão ativa`.
- Tabela ampliada com colunas: Código, Descrição, Un, Qt base, Valor base seco, Valor objetivo, Adjudicado, Comprado, Por adjudicar, Δ base, Δ versão anterior, Estado contratual, Fornecedor, Pacote, Obs.
- Botões: `Nova versão`, `Criar pacote`, `Atualizar com adjudicações`, `Ver desvios`, `Gerar Folha de Fecho Final`.

**Tab Fecho Económico** — duas sub-vistas: `Folha de Fecho Inicial` (read-only) e `Folha de Fecho Final` (live).

### Cards na lista de orçamentos
- Badge `Bloqueado` quando `is_locked`. Substituir botão "Editar" por "Abrir Budget Objetivo" nesses casos.

### Migração caso-a-caso
- Em cada orçamento aprovado antigo (sem `budget_versions`), botão `Migrar para novo fluxo`: chama `approve_base_dry_budget` + `create_target_budget` e, se existir `budget_awards`, popula `awarded_amount` na v1.

---

## 4. Integração com Adjudicações / Compras

- Trigger AFTER INSERT/UPDATE em `budget_awards` → `apply_award_to_target` (versão ativa do `obra_id`).
- Hook `useAdjudicacao` e fluxos de compras passam a ler/escrever em `budget_version_items` (já não tocam em `artigos_orcamento`).
- Pacotes de contratação passam a referenciar `budget_version_item_id` em vez de `artigo_orcamento_id`.

---

## 5. Nomenclatura dinâmica por perfil

- Nova preferência em `user_settings` (ou `profiles.preferences`): `operational_layer_label` ∈ `auto` | `budget_objetivo` | `reorcamento` | `ficha_producao`.
- Helper `useOperationalLayerLabel()` que devolve o termo. Default `auto`:
  - `gestor`/`promotor` → "Budget Objetivo"
  - `empreiteiro`/`fiscal` → "Ficha de Produção"
  - fallback → "Reorçamento"
- Setting alterável em **Definições → Preferências → Linguagem operacional**.
- Aplicado em: tabs, breadcrumbs, badges, mensagens da Axia, PDF do reorçamento.

---

## 6. Ajustes na Axia

Em `supabase/functions/axia-*` adicionar guardrails de contexto:
- Detectar `is_locked` antes de sugerir alterações. Substituir por mensagens-modelo do prompt ("Base Seco está bloqueado…").
- Adicionar contexto da versão ativa em `axia-chat` e `axia-analysis` (totais base vs objetivo vs adjudicado, desvios).
- Sugestões pró-ativas: poupança/excesso por capítulo, alerta quando v ativa > Fecho Inicial em ≥ X%.

---

## 7. Critérios de aceite

1. Aprovar Base Seco bloqueia edição (DB + UI) e gera `closing_sheets initial` + `budget_versions target v1 active`.
2. Tentativa de update direto em orçamento bloqueado é rejeitada pelo trigger.
3. Nova adjudicação atualiza apenas a versão `target` ativa; Base Seco e Fecho Inicial intactos.
4. Só uma versão `target` por `obra_id` pode estar `active`.
5. `create_new_target_version` preserva histórico (`superseded`).
6. UI mostra tabs distintas e usa o termo correto por perfil.
7. Migração caso-a-caso funciona sem perda de dados em orçamentos pré-existentes.
8. Axia não propõe edição direta no Base bloqueado; usa as frases-modelo.
9. Folha de Fecho Final consolida `target` final + adjudicações + compras.

---

## 8. Detalhes técnicos resumidos

- **DB**: 3 tabelas novas + 3 colunas em `orcamentos` + 5 funções RPC + 2 triggers + RLS multi-tenant.
- **Front**: novas rotas/tabs em `src/pages/orcamentos/Ver.tsx` e `Editar.tsx`; hooks `useBudgetVersions`, `useClosingSheets`, `useOperationalLayerLabel`; refactor de `useAdjudicacao` para escrever em `budget_version_items`.
- **Edge functions**: ajustar `axia-chat`, `axia-analysis`, `axia-suggestions` para o novo contexto e guardrails.
- **Migração**: botão manual por orçamento (sem job automático).

---

Este plano é grande — implementação real seria faseada (DB+bloqueio → criação Budget Objetivo → versões → pacotes/adjudicações → Folha de Fecho Final → Axia). Confirma antes de mudar para modo build.
