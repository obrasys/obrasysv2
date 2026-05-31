## Objetivo

No separador **Budget**, ter a mesma experiência do Orçamento Base (accordion de capítulos, adicionar artigos da Base de Preços, DESC %, IA, paramétrico), mas a trabalhar sobre uma **cópia editável** do orçamento. Ao gravar, essa cópia fecha como **Budget V{n}** no histórico e abre automaticamente uma nova versão para próximas edições. O Orçamento Base permanece sempre bloqueado e intacto.

## Arquitetura

Reutiliza-se o motor existente: cada "versão de trabalho" é um registo novo na tabela `orcamentos` com `revisao_de = <id do orçamento base>` e um campo extra `budget_version_number` (1, 2, 3…). Os capítulos/artigos são clonados via SQL para `capitulos_orcamento` / `artigos_orcamento`, o que permite usar 100% do `CapituloAccordion` e todos os hooks existentes (catálogo, IA, paramétrico) sem reescrever nada.

```text
orcamentos
 ├── base (status: locked)            ← Orçamento Base
 ├── budget V1 (revisao_de=base)      ← trabalho/locked após gravar
 ├── budget V2 (revisao_de=base)      ← trabalho/locked
 └── budget V3 (revisao_de=base)      ← ATIVA (editável)
```

## Mudanças

### 1. Base de dados (migration)
- Adicionar coluna `budget_version_number INT NULL` e `budget_version_status TEXT NULL` (`'active' | 'locked'`) em `orcamentos`.
- Index parcial: 1 só versão `active` por orçamento base.
- RPC `create_budget_working_version(p_base_id)`:
  - Encontra `max(budget_version_number)` para esse base; calcula próximo `n`.
  - Marca a versão ativa anterior como `locked` (se existir).
  - Cria novo `orcamentos` clonado do **base** (não da versão anterior — a Base é a "fonte de verdade" inicial; versão anterior pode ser usada como template via segundo parâmetro opcional `p_clone_from`).
  - Clona `capitulos_orcamento` e `artigos_orcamento`.
  - Devolve o `id` da nova versão.
- RPC `lock_budget_working_version(p_budget_id)`: marca como `locked`.

### 2. Hook `useBudgetWorkingVersions(baseOrcamentoId)`
- Lista todas as versões (active + locked) ordenadas por `budget_version_number desc`.
- Mutations: `useCreateBudgetVersion`, `useLockBudgetVersion`.

### 3. Componente `BudgetWorkingPanel.tsx` (substitui `TargetBudgetPanel` no tab "target")
- **Header:** selector de versão (V3 · Ativa, V2 · Histórico, V1 · Histórico, Base), botão **"Gravar V{n} e abrir nova"** (chama lock + create), KPIs (Total, Desvio vs Base).
- **Corpo:** se a versão selecionada é a ATIVA → renderiza `<CapituloAccordion>` no orçamento clonado, com `isReadOnly=false` e o botão "+ Adicionar artigo" da base já existente. Se é histórica → renderiza o mesmo accordion com `isReadOnly=true`.
- **Sidebar:** histórico vertical (Base → V1 → V2 → V3) com badge "Atual" / "Histórico".
- Reutiliza `useOrcamento`, `useArtigos`, `useCapitulos` apontando para o `id` da versão de trabalho.

### 4. `Ver.tsx`
- Troca `<TargetBudgetPanel>` por `<BudgetWorkingPanel baseOrcamentoId={orcamento.id} />` no `<TabsContent value="target">`.

### 5. Filtros já existentes
- A listagem em `/orcamentos` deve continuar a mostrar só o orçamento Base (não as versões de trabalho). Adiciona `.is('budget_version_number', null)` ao hook `useOrcamentos`.

## Fluxo do utilizador

1. Aprova **Orçamento Base** → fica `locked`.
2. Abre tab **Budget** → vazio, com botão "Criar primeira versão de trabalho".
3. Clica → RPC clona Base como **Budget V1 (Ativa)**.
4. Edita capítulos/artigos livremente (mesmo UI do editor).
5. Clica **"Gravar V1 e abrir nova"** → V1 fica `locked` (histórico), nasce V2 clonada da V1 como ativa.
6. Histórico mostra Base → V1 → V2 com totais e datas.

## Notas de segurança
- RPCs `SECURITY DEFINER` validam que `auth.uid()` é dono/membro do orçamento Base via `has_org_access`.
- RLS em `orcamentos` já isola por `organization_id` — versões herdam o mesmo `organization_id` do Base.
- `capitulos_orcamento` e `artigos_orcamento` já estão protegidos por RLS via `orcamento_id` → herdam isolamento automaticamente.
