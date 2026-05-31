# Bloqueio do Orçamento Base + Budget Versionado Independente

## Problema atual
Hoje a "V1 do Budget" abre o editor do próprio Orçamento Base via iframe (`/orcamentos/:id/editar?embed=1`). Isto significa que qualquer alteração na V1 **escreve diretamente no Orçamento Base**, violando a regra de que o Base deve ficar imutável depois da Folha de Fecho.

Precisamos de separar fisicamente os dois universos:
- **Orçamento Base** → snapshot imutável após Folha de Fecho.
- **Budget** → universo próprio, com versões independentes (V1, V2, V3…), editável apenas dentro dele.

---

## 1. Modelo de dados (novas tabelas dedicadas ao Budget)

Criar 3 tabelas isoladas do esquema de `orcamentos` para garantir que nenhum update do Budget toque no Base:

**`budget_versions`**
- `id`, `obra_id`, `base_orcamento_id` (ref. imutável), `source_version_id` (versão de origem)
- `version_number`, `name`, `status` (`rascunho` | `em_revisao` | `aprovado` | `ativa` | `arquivada`)
- `reason`, `notes`
- `total_cost`, `total_sale`, `total_margin`, `total_margin_pct`
- `is_active` (apenas 1 por obra — garantido por índice parcial único)
- `created_by`, `approved_by`, `created_at`, `approved_at`
- `organization_id` para RLS multi-tenant

**`budget_version_chapters`**
- `id`, `budget_version_id`, `base_chapter_id` (nullable, se foi adicionado no Budget)
- `numero`, `titulo`, `descricao`, `ordem`, `desconto_pct`
- `change_status` (`unchanged` | `modified` | `added` | `removed`)

**`budget_version_items`**
- `id`, `budget_version_id`, `chapter_id` (ref. `budget_version_chapters`)
- `base_item_id` (nullable), `codigo`, `descricao`, `unidade`
- `quantidade`, `preco_unitario`, `preco_base`, `margem_lucro_artigo`
- Decomposição de custo: `custo_mo`, `custo_mat`, `custo_sub`, `custo_srv`, `custo_alu`, `custo_div`
- `ordem`, `notes`
- `origin` (`base_budget` | `added_in_budget`)
- `change_status` (`unchanged` | `modified` | `added` | `removed` | `deactivated`)
- `is_active` boolean

**RLS:** todas isoladas por `organization_id` via `has_organization_access(organization_id)`. Inserts/updates exigem que o utilizador pertença à organização. GRANTs para `authenticated` e `service_role`.

**Trigger de proteção do Base:** trigger `BEFORE UPDATE/DELETE` em `orcamentos`, `capitulos_orcamento` e `artigos_orcamento` que rejeita alterações quando `orcamento.status = 'base_bloqueado'` (ou existe uma `folha_fecho_base` aprovada associada). Mensagem: *"Este Orçamento Base está bloqueado pela Folha de Fecho Base. Para reorçamentar, crie uma nova versão no Budget."*

---

## 2. RPCs

- **`create_budget_v1_from_base(base_id)`** — cria V1 clonando capítulos/artigos do Base para `budget_version_*` com `origin='base_budget'`, `change_status='unchanged'`, `status='ativa'`. Chamada automaticamente quando a Folha de Fecho Base é gravada.
- **`create_budget_version(source_version_id, name, reason, notes)`** — duplica versão origem com todos os capítulos/itens. Nova versão entra em `status='rascunho'`. Recalcula `change_status` comparando com o Base.
- **`set_active_budget_version(version_id)`** — desativa qualquer versão ativa atual e marca esta como `is_active=true` (só permitida em `aprovado` ou `ativa`).
- **`approve_budget_version(version_id)`** — passa para `aprovado`, regista `approved_by`/`approved_at`.
- **`archive_budget_version(version_id)`** — passa para `arquivada`. Bloqueia edição.
- **`recompute_budget_version_totals(version_id)`** — recalcula totais e diferenças por capítulo/artigo vs Base.

---

## 3. Frontend

### 3.1 Substituir `BudgetWorkingPanel`
Remover totalmente o iframe para `/orcamentos/:id/editar`. O Budget passa a ter o **seu próprio editor nativo**, que só escreve em `budget_version_*`.

### 3.2 Novo layout da página de Budget (`src/components/orcamentos/BudgetWorkingPanel.tsx`)

```
┌────────────────────────────────────────────────────────────────┐
│ Orçamento Base · Bloqueado 🔒                                  │
│  Total: 296 134,08 €     [Ver Base]  [Ver Folha de Fecho]      │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ Budget · Reorçamentos                                          │
│ Versão ativa: V2 · Rascunho                                    │
│ [+ Nova versão] [Duplicar atual] [Comparar c/ Base]            │
│ [Aprovar] [Definir ativa] [Arquivar]                           │
│                                                                │
│ Histórico de versões (lista compacta com badges de estado)     │
│                                                                │
│ ── Editor inline (capítulos/artigos da versão selecionada) ── │
│  • Editar quantidades, custos, vendas, margens                 │
│  • Adicionar/remover artigos e capítulos                       │
│  • Badges por artigo: NOVO / ALTERADO / REMOVIDO               │
└────────────────────────────────────────────────────────────────┘
```

### 3.3 Componentes novos
- `BudgetBaseLockedCard.tsx` — cartão do Base bloqueado com badge e botões de consulta.
- `BudgetVersionsList.tsx` — lista de versões com estado, totais, ações.
- `BudgetVersionEditor.tsx` — editor nativo (capítulos/artigos) sobre `budget_version_*`.
- `BudgetVersionArticleRow.tsx` — linha de artigo com badge de change_status e diff vs Base.
- `BudgetCompareWithBaseDialog.tsx` — comparação: totais, Δ€, Δ%, novos/alterados/removidos, capítulos com maior variação.
- `NewBudgetVersionDialog.tsx` — modal "Criar nova versão" (nome, origem, motivo, observações).

### 3.4 Hooks
- `useBudgetVersions(obraId)` — lista de versões + versão ativa.
- `useBudgetVersionDetail(versionId)` — capítulos/artigos da versão + mutations isoladas.
- `useBudgetVersionDiff(versionId)` — comparação calculada vs Base.

### 3.5 Bloqueio visual do Orçamento Base
Em `src/pages/orcamentos/Ver.tsx` e `Editar.tsx`: se `orcamento.status === 'base_bloqueado'`:
- Esconder botões Editar / Adicionar artigo / Adicionar capítulo.
- Mostrar banner amarelo: *"Orçamento Base bloqueado pela Folha de Fecho Base. Reorçamentos só são possíveis no Budget."*
- Inputs em modo readonly.

---

## 4. Fluxo final

1. Utilizador aprova Folha de Fecho Base → `orcamento.status = 'base_bloqueado'` + trigger ativo.
2. RPC `create_budget_v1_from_base` corre automaticamente → cria **V1 Ativa** no Budget.
3. Utilizador entra no Budget, edita V1 livremente (escreve só em `budget_version_*`).
4. Para reorçamentar: clica **Nova versão** → modal → V2 criada como cópia da V1, estado `rascunho`.
5. Edita V2, aprova, define como ativa. V1 fica arquivada automaticamente (perde `is_active`).
6. Pode comparar qualquer versão com o Base via diálogo de comparação.
7. Qualquer tentativa de update no Base é rejeitada pelo trigger DB.

---

## 5. Migração de dados existente
Para obras que já tenham a `BudgetWorkingPanel` antiga ativa (versões "working" antigas em `orcamentos`): script de migração que converte cada versão working existente numa entrada em `budget_versions` + capítulos/artigos correspondentes e marca o original como `base_bloqueado` se já tinha Folha de Fecho.

---

## 6. Ordem de implementação
1. Migração: criar 3 tabelas + RLS + GRANTs + trigger de bloqueio + RPCs.
2. Hooks novos (`useBudgetVersions`, `useBudgetVersionDetail`, `useBudgetVersionDiff`).
3. Componentes do editor nativo do Budget (substituir iframe).
4. UI de versões, comparação, ações (aprovar/ativar/arquivar/duplicar).
5. Bloquear UI do Orçamento Base quando `base_bloqueado`.
6. Script de migração de dados existentes.

---

## Notas técnicas (referência)
- `valor_total` em `budget_version_*` deve ser coluna **gerada** (`GENERATED ALWAYS AS`) para evitar dessincronização.
- Índice parcial único: `CREATE UNIQUE INDEX ON budget_versions(obra_id) WHERE is_active = true`.
- Os triggers de bloqueio devem permitir updates internos via `SECURITY DEFINER` se necessário (ex: recálculo de progresso) usando flag `set_config('app.skip_base_lock','on',true)`.
- Reutilizar `useFormatting`, `STATUS_CONFIG`, design tokens deep teal.
