## Objetivo
Incorporar o Excel `Base_Capitulos_Artigos_ObraSys.xlsx` (38 capítulos / 423 artigos da folha `Importacao_ObraSys`) como **catálogo técnico padrão** do módulo Orçamentos, com seleção em cascata Capítulo → Artigo e gestão administrativa, sem afetar orçamentos existentes nem as estruturas já em uso (`matriz_capitulos_padrao`, `base_artigos_global/user`).

## O que já existe (não mexer)
- `capitulos_orcamento` / `artigos_orcamento` — linhas reais do orçamento
- `matriz_capitulos_padrao` — matriz aplicada via RPC `aplicar_matriz_capitulos` (cria capítulos vazios num orçamento novo)
- `base_artigos_global` / `base_artigos_user` — catálogo de preços livre (sem hierarquia por capítulo), usado no `CatalogoModal`

Este novo catálogo é **complementar**, não substitui nada.

## 1. Base de dados (migração)

### Tabela `budget_chapter_templates`
Campos exatos do brief: `id`, `code`, `name`, `description`, `sort_order`, `is_default`, `company_id` (nullable = global Obra Sys), `active`, `created_at`, `updated_at`.
- Unique: `(company_id, code)` — permite uma empresa ter o mesmo código sem colidir com o global.

### Tabela `budget_article_templates`
Campos exatos do brief: `id`, `chapter_template_id` (FK cascade), `code`, `name`, `description`, `suggested_unit`, `category`, `sort_order`, `is_default`, `company_id`, `active`, `created_at`, `updated_at`.
- Unique: `(company_id, code)`.
- Índice em `chapter_template_id`.

### Extensão de `artigos_orcamento` (não-destrutiva)
Adicionar colunas nullable:
- `chapter_template_id uuid`
- `article_template_id uuid`
- `chapter_code text`
- `article_code text`
- `source text default 'manual'` (`manual` | `catalog` | `ai` | `import`)

Nenhuma coluna existente é removida; cálculos de totais/IVA/margens permanecem intactos.

### RLS
- **SELECT** global: `company_id IS NULL AND active = true` (qualquer autenticado) **+** registos da própria org (`company_id = get_user_org_id()`).
- **INSERT/UPDATE/DELETE** apenas em registos com `company_id = get_user_org_id()` e admin/owner (`is_org_admin()`).
- Registos globais (`company_id IS NULL`) só editáveis por `is_super_admin()`.

### Trigger
`update_updated_at_column` já existe — reutilizar.

## 2. Seed do Excel
Edge function `seed-budget-catalog` (one-shot, idempotente):
- Lê o Excel embebido no payload (ou faz parse no cliente e envia JSON normalizado pela folha `Importacao_ObraSys`).
- Upsert dos 38 capítulos com `company_id = NULL`, `code = chapter_code`, `name = chapter_name`, `sort_order = ordem do Excel`.
- Upsert dos 423 artigos com `chapter_template_id` resolvido pelo `code`, `code = item_code`, `name = item_name`, `suggested_unit = unit`, `category = category`, `sort_order` sequencial.
- `ON CONFLICT (company_id, code) DO UPDATE SET name, ...` — re-execução não duplica.

Implementação preferida: copiar o ficheiro para `src/data/budget-catalog-seed.json` (gerado por script local) e correr o seed via botão "Sincronizar catálogo padrão" na página admin (chama RPC `seed_budget_catalog(jsonb)` com `SECURITY DEFINER` restrito a `is_super_admin`). Evita edge function pesada.

## 3. UI — Seleção no orçamento
Novo componente `BudgetCatalogPicker` integrado no `CapituloAccordion` / `ArtigoForm`:

```text
[ Capítulo ▾ ]  01 — TRABALHOS PREPARATÓRIOS...
[ Pesquisar artigo: __________ ]
┌──────────────────────────────────────────────┐
│ 01.001  Pessoal técnico de obra      [mês]  │
│ 01.002  Pessoal de apoio em obra     [mês]  │
│ 01.003  Montagem e organização...    [vg]   │
└──────────────────────────────────────────────┘
[ + Adicionar selecionados ]   [ Artigo manual ]
```

- Dropdown carrega capítulos globais + da empresa, ordenados por `sort_order`.
- Tabela de artigos filtra por `chapter_template_id` selecionado + pesquisa (`name`, `code`, `description`).
- Badges: unidade (`suggested_unit`) e categoria.
- Empty state: "Nenhum artigo encontrado neste capítulo. Pode criar um artigo manual."
- Ao confirmar: cria linha em `artigos_orcamento` com `descricao=name`, `unidade=suggested_unit`, `chapter_template_id`, `article_template_id`, `chapter_code`, `article_code`, `source='catalog'`. Preço/quantidade ficam editáveis pelo utilizador sem alterar o template.
- Botão extra: "Guardar como modelo da empresa" → cria `budget_article_template` com `company_id = org_id`.

Integração no `CatalogoModal` atual: nova aba **"Catálogo Padrão"** ao lado de Base/Sistema/Empresa, usando o mesmo picker.

## 4. Página admin "Catálogo de Orçamento"
Rota `/configuracoes/catalogo-orcamento` (apenas admin/owner):
- Lista de capítulos (drag para reordenar, toggle `active`, editar `name`/`description`).
- Painel lateral com artigos do capítulo selecionado (toggle `active`, editar campos editáveis, criar artigo da empresa, reordenar).
- Botão "Sincronizar base global Obra Sys" (super-admin) — executa o seed idempotente.
- Empresas **não** podem editar globais — UI mostra cadeado e oferece "Duplicar para a minha empresa".

## 5. Ligação Axia (futuro hook, scaffolding)
- Função utilitária `matchCatalogArticle(text)` em `src/lib/budget-catalog-match.ts`:
  - Normaliza descrição (lowercase, sem acentos, sem unidades) — reutilizar `normalizar_descricao` (já existe na BD).
  - Calcula similaridade contra `name + description + category` dos templates ativos.
  - Retorna `{ chapter_template_id, article_template_id, confidence }`.
  - `confidence < 0.6` → marca a linha com `review_required = true` (coluna a adicionar futuramente em `artigos_orcamento` se ainda não existir — fora deste plano).
- Apenas exposto como helper; a Axia passa a chamá-lo quando gerar orçamento.

## 6. Critérios de aceite
1. Migração cria as 2 tabelas + 5 colunas em `artigos_orcamento` sem perda de dados.
2. Seed importa 38 capítulos + 423 artigos com `company_id = NULL` e é idempotente.
3. Capítulo dropdown lista os 38 capítulos por ordem.
4. Selecionar capítulo → mostra só os artigos respetivos.
5. Pesquisa por código/nome/descrição funciona.
6. Inserir do catálogo cria linha real com `source='catalog'` e referências aos templates.
7. Editar a linha não altera o template.
8. Orçamentos existentes continuam a abrir/editar normalmente.
9. RLS isola por empresa; globais visíveis a todos, editáveis apenas por super-admin.
10. Página admin acessível só a admin/owner; ações de edição respeitam regras de scope.

## Ficheiros a criar/alterar
**Novos**
- `supabase/migrations/<ts>_budget_catalog_templates.sql`
- `src/data/budget-catalog-seed.json` (gerado a partir do Excel)
- `src/hooks/useBudgetCatalogTemplates.ts`
- `src/components/orcamentos/BudgetCatalogPicker.tsx`
- `src/pages/configuracoes/CatalogoOrcamento.tsx`
- `src/lib/budget-catalog-match.ts`

**Alterados**
- `src/components/orcamentos/CatalogoModal.tsx` — nova aba "Catálogo Padrão"
- `src/components/orcamentos/ArtigoForm.tsx` — receber/persistir refs do template quando vier do picker
- `src/pages/orcamentos/Editar.tsx` — wiring do picker e nova fonte de artigos
- `src/App.tsx` (ou router central) — rota da página admin
- Sidebar de configurações — entrada "Catálogo de Orçamento"

**Fora de scope (não tocar)**
- `matriz_capitulos_padrao`, RPC `aplicar_matriz_capitulos`
- `base_artigos_global` / `base_artigos_user` e respetivo importador
- Cálculos de IVA, margem, totais, PDF
