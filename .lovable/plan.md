## Objetivo

Transformar o separador **Budget** num espelho editável da tabela **Custos Diretos / Preços Secos – Valores s/ IVA** da Folha de Fecho Base. Cada gravação cria uma **nova Folha de Fecho** com o nome **"Budget Objetivo V1", "V2", …** mantendo histórico do mais recente até à Base.

## Como vai funcionar

1. Ao abrir o separador **Budget**:
   - Se ainda não existir nenhuma "Budget Objetivo Vx", carrega-se a estrutura dos **38 capítulos** (`DEFAULT_DIRECT_COST_LINES`) com os valores actualmente na **Folha de Fecho Base** (`details.direct_costs` + `direct_costs_extra` + estimativa).
   - Se já existirem, mostra-se a versão **mais recente** (V_n) editável e as anteriores em modo só-leitura.

2. **Edição inline** (valor, desconto %, empresa, notas) por linha, mais o bloco de **Extras**, **Estimativa €/m²** e **Estimativa fixa** — exactamente como na Folha de Fecho Base.

3. Botão **"Gravar nova versão"**:
   - Cria um novo registo em `closing_sheets` com `closing_type = 'initial'`, `status = 'draft'`, `notes = 'Budget Objetivo Vn'` e `details` (snapshot completo igual ao da Base, mas com `direct_costs` editados).
   - Marca a versão anterior como `superseded` (campo já existente no enum não chega — usamos `status = 'locked'` + um sufixo no `notes` "(substituída)").
   - Recalcula `total_direct_cost`, `sale_price`, `margin_*`, etc. via `computeClosingTotals`.

4. **Histórico lateral**: lista vertical "V3 (actual) → V2 → V1 → Base", clicável para ver/comparar.

## Alterações de código

### Backend (migration)
Adicionar coluna `version_label TEXT` em `closing_sheets` para identificar "Budget Objetivo V1/V2/...". Sem alterar lógica existente das folhas Base/Final — apenas usar `closing_type='initial'` + `version_label` para distinguir.

```text
ALTER TABLE public.closing_sheets ADD COLUMN version_label TEXT;
```

### Hooks
- `useBudgetObjetivoVersions(orcamentoId)` — lista `closing_sheets` onde `version_label LIKE 'Budget Objetivo V%'` ordenadas desc, mais a folha Base como "âncora" final.
- `useSaveBudgetObjetivoVersion()` — RPC client-side:
  1. lê Base sheet
  2. calcula próximo número `Vn`
  3. INSERT em `closing_sheets` com `version_label='Budget Objetivo Vn'`, `details=<edição actual>`, totais recomputados
  4. invalida queries

### UI — substitui `TargetBudgetPanel.tsx`
Novo `BudgetObjetivoPanel.tsx`:
- Cabeçalho: selector de versão + botão "Gravar nova versão" + KPIs (Total Directos, Custo Industrial, Margem, PV)
- Tabela com as 38 linhas (mesma estrutura da Folha de Fecho Base, secção Custos Diretos):
  - colunas: Cap. | Designação | Valor (€) | Desc. % | Empresa | Notas
  - Editável apenas na **versão mais recente**; versões antigas em só-leitura
- Bloco "Extras" + "Estimativa €/m²" + "Estimativa fixa" idênticos
- Painel lateral "Histórico": cards verticais V_n → V_1 → **Base** (link para o separador Folha de Fecho Base)

### Pequenas mudanças
- `ClosingSheetsPanel.tsx`: ao listar folhas `initial`, **excluir** as que tenham `version_label` começando por "Budget Objetivo" (só a Base aparece nesse separador).
- `src/pages/orcamentos/Ver.tsx`: trocar import `TargetBudgetPanel` → `BudgetObjetivoPanel` no `<TabsContent value="target">`.

## O que NÃO muda
- Tabela `budget_versions` e fluxo MCE continuam intactos (são usados internamente para adjudicações/compras).
- Folha de Fecho Base mantém comportamento actual (criação, bloqueio, criação de obra, etc.).
- Folha de Fecho Final continua a ser gerada pelo fluxo existente.

Confirma para eu avançar com a migration + código?
