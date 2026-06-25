
# Evolução do Orçamento Essencial — Plano Faseado

Implementação **aditiva** e **não-destrutiva**. Orçamentos existentes continuam a funcionar. Reutiliza tabelas atuais (`budget_zones`, `budget_areas`, `artigos_orcamento`, `org_zone_library`, `org_area_library`, `org_service_type_library`, `base_artigos_user`) e adiciona apenas o que falta.

## Fase 1 — Base de dados (migrações aditivas, com RLS)

Novas tabelas (todas multi-tenant por `organization_id`, com GRANTs e RLS):

- `org_intervention_area_service_types` — relação Área ↔ Tipo de Serviço para sugestões dinâmicas. Permite seed por defeito + customizações por org.
- `organization_budget_terms` — condições comerciais reutilizáveis (`title`, `content`, `is_default`, `last_used_at`).
- `organization_tax_settings` — `country`, `region`, `labor_vat_rate`, `material_vat_rate`, `default_vat_rate`. Substitui hardcode no frontend e mantém retro-compat com `iva-regions.ts`.

Alterações aditivas (colunas nullable):

- `budget_zones`: `+ context text` (`interior`|`exterior`|`geral`|null).
- `budget_areas`: `+ context text`.
- `org_area_library` / `org_zone_library`: `+ context text`.
- `artigos_orcamento`: `+ intervention_context text`, `+ labor_vat_rate numeric`, `+ material_vat_rate numeric`, `+ catalog_article_id uuid` (FK → `base_artigos_user`).
- `base_artigos_user` (Meu Catálogo): adicionar campos em falta — `final_price`, `subcontract_cost`, `service_cost`, `rental_cost`, `miscellaneous_cost`, `intervention_context`, `area_id`, `service_type_id`, `tags text[]`, `source text`, `usage_count int`, `last_used_at`.

Seeds: Tipos de serviço sugeridos por Área (conforme listas do briefing — Quarto→Pintura/Pavimentos/…, Cozinha→Demolições/Canalização/…, Piscina→Escavação/…, etc.) em `org_service_type_suggestions` (tabela já existente, apenas insere defaults com `organization_id = null`).

Sem renomear nem dropar nada existente. Cada migração tem comentário de rollback.

## Fase 2 — Renomeação (i18n / labels)

Apenas textos da UI — sem renomear colunas/tipos internos:

- "Tipologia do imóvel" → **"Zona de Intervenção"**
- "Zona" → **"Área de Intervenção"**
- Botões/chips de áreas → **dropdown** (Select com agrupamento por contexto Interior/Exterior/Geral)

Ficheiros tocados: `ZonasServicosPanel.tsx`, `AreasGrid.tsx` (substituído por Select), `ItemSelectorModal.tsx`, `BudgetSummaryTable.tsx`, `SelectedItemsPreview.tsx`, `TotalsAdjustments.tsx`, `ClientIdentification.tsx`.

## Fase 3 — Fluxo hierárquico Zona → Contexto → Área → Tipo de Serviço → Artigo

Novo wizard dentro de `ZonasServicosPanel.tsx`:

1. Criar/Selecionar **Zona de Intervenção** (ex. Apartamento 01, Moradia, Garagem). Persistido em `budget_zones` (e biblioteca `org_zone_library` para reutilização).
2. Escolher **contexto** (Interior/Exterior/Geral) via tabs.
3. Selecionar **Área de Intervenção** (dropdown filtrado pelo contexto, com "+ Nova área").
4. Selecionar **Tipo de Serviço** (sugestões dinâmicas via `org_service_type_suggestions` filtradas pela área, com "+ Novo tipo").
5. Selecionar **artigo** sugerido (a partir de `base_artigos_user` + `base_artigos_global` filtrados por tipo de serviço) ou criar novo.

Compatibilidade: todos os passos são opcionais. Itens sem zona/área aparecem como "Sem zona de intervenção".

## Fase 4 — Editor de item: reutilizar modal do Avançado

No `SelectedItemsPreview.tsx`, substituir editor inline por `BudgetItemFormDialog` (já existente em `src/components/orcamentos/budget/BudgetItemFormDialog.tsx`), estendendo-o com:

- Campos: Zona, Contexto, Área, Tipo de Serviço.
- Decomposição: `custo_mo`, `custo_mat`, `custo_sub`, `custo_srv`, `custo_alu`, `custo_div`.
- IVA por categoria: `labor_vat_rate`, `material_vat_rate`.
- Toggle "Gravar também no Meu Catálogo".

Mesma instância usada no Avançado para evitar duplicação.

## Fase 5 — Meu Catálogo

Estender `useSaveArtigoToUserBase` para:

- Upsert por (organization_id, descrição normalizada, unidade, service_type_id).
- Atualizar `usage_count` e `last_used_at` quando reutilizado.
- Persistir source: `criado_manual` | `editado_orcamento` | `importado` | `sugerido_axia`.
- Auto-save em criação; pergunta ("Atualizar só este orçamento" / "Guardar no Meu Catálogo") em edição.

Página existente "Base de Preços" passa a mostrar o Meu Catálogo com filtros por contexto/área/tipo.

## Fase 6 — Auditoria Axia por item

Atualizar edge function `budget-ai-engine` (e `useAIBudgetInsights`) para retornar análise **item-a-item** com: código, descrição, capítulo, zona, área, tipo, preço base, preço final, margem €, margem %, qty, totais, observação.

Categorias de alerta: margem negativa, baixa (<10%), alta (>50%), sem preço base, preço final = 0, qty = 0, decomposição incoerente.

UI nova em `Ver.tsx` / `Essencial.tsx`: tabela "Auditoria de Margem" com resumo geral + lista de alertas. Sem auto-alteração de valores.

## Fase 7 — Contexto fiscal e IVA separado

- Ler `organization_tax_settings` (fallback para `iva-regions.ts`).
- Em cada item, calcular IVA por componente: `custo_mo × labor_vat_rate`, `custo_mat × material_vat_rate`, restantes com `default_vat_rate`.
- Itens sem decomposição: usar IVA padrão (retro-compat).
- Resumo fiscal por categoria no `TotalsAdjustments.tsx` e PDF.

## Fase 8 — Envio de proposta

Em `ClientIdentification.tsx`, ao selecionar cliente: pré-preencher `email` da ficha. Se ausente, mostrar campo + opção "Guardar na ficha do cliente". Validar formato.

## Fase 9 — Condições comerciais persistentes

- `organization_budget_terms`: CRUD simples.
- Ao abrir novo orçamento: carregar último `is_default` ou último `last_used_at`.
- Botão "Guardar como padrão" no `TotalsAdjustments.tsx`.

## Fase 10 — PDF agrupado por Zona

Refatorar `src/lib/orcamento-pdf-zonas.ts` para hierarquia:

```text
ZONA DE INTERVENÇÃO
  Capítulo
    Área de Intervenção
      Tipo de Serviço
        Artigo (qty, pu, total)
      Subtotal Tipo
    Subtotal Área
  Subtotal Capítulo
Subtotal Zona
…
Resumo Fiscal:
  Subtotal M.O. + IVA reduzido
  Subtotal Materiais + IVA normal
  Subtotal Outros + IVA aplicável
  Total s/IVA, Total IVA, Total c/IVA
```

- Agrupa automaticamente mesmo se inserido fora de ordem.
- Oculta níveis vazios sem partir layout.
- Itens sem zona → secção "Sem zona de intervenção" no fim.
- Cabeçalho profissional já existente (logo, dados empresa/cliente/obra) reutilizado; campos vazios ocultos.

## Critérios de aceitação (todos do briefing)

Cobertos pelas Fases 2 (1–4), 3 (5–8), 10 (9–10), 4 (11–12), 5 (13–14), 6 (15–16), 7 (17), 8 (18–19), 9 (20), 1 (21–23).

## Notas técnicas

- Tudo opcional para preservar orçamentos antigos.
- Sem renomear colunas existentes; só adicionar.
- RLS por `organization_id` via `get_user_org_id()`/`get_org_member_ids()` em todas as novas tabelas, com GRANTs explícitos para `authenticated` e `service_role`.
- Arredondamento financeiro centralizado em `src/lib/finance.ts`.
- Migração executada em blocos pequenos com possibilidade de rollback manual (drop column / drop table).
- Cada fase entregue em PR lógico independente; nada bloqueia uso atual entre fases.

## Ordem de execução sugerida

1. Fase 1 (DB) → 2. Fase 2 (labels) → 3. Fase 3 (fluxo) → 4. Fase 4 (modal) → 5. Fase 5 (catálogo) → 6. Fase 7 (IVA) → 7. Fase 10 (PDF) → 8. Fase 6 (Axia) → 9. Fase 8 (email) → 10. Fase 9 (condições).
