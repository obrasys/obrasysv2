

# Plano: Integração Livro de Ponto → Custos Reais da Obra

## Objetivo
Transformar os apontamentos do Livro de Ponto em custo real de mão de obra visível na página da obra, com dashboards de acompanhamento.

## Alterações

### 1. Hook `useObraLaborCosts` (novo ficheiro: `src/hooks/useObraLaborCosts.ts`)
Hook dedicado para consumir dados de `project_labor_cost_entries` e `timesheet_allocations` por obra:
- **`useObraLaborSummary(obraId)`**: retorna custo hoje, semana, mês, acumulado, nº trabalhadores, horas totais
- **`useObraLaborEntries(obraId, filters)`**: lista paginada com data, trabalhador, horas, custo/hora, custo total (filtro por período)
- **`useObraLaborChart(obraId, period)`**: dados para gráfico de evolução diária/semanal
- **`useObraLaborByWorker(obraId)`**: distribuição de custo por trabalhador
- **`useObraLaborByCostType(obraId)`**: distribuição por tipo (regular, overtime, night, weekend)
- Fonte principal: `project_labor_cost_entries` (snapshot, não recalcula)

### 2. Componente `ObraLaborCostsTab` (novo: `src/components/obras/ObraLaborCostsTab.tsx`)
Secção completa de "Custos Reais - Mão de Obra" com:
- **Card "Mão de obra hoje"**: nº trabalhadores, horas totais, custo do dia
- **Card "Custo real acumulado"**: semana, mês, acumulado total
- **Filtro por período** (date range picker)
- **Tabela resumida**: data, trabalhador, horas, custo/hora, custo total
- **Gráfico de evolução** (barras diárias com recharts)
- **Gráficos de distribuição**: por trabalhador (donut) e por tipo de custo (barras)
- **Link "Abrir Livro de Ponto"** filtrado pela obra (`/livro-ponto?obra={id}`)

### 3. Página da Obra (`src/pages/obras/Ver.tsx`)
- Adicionar secção/card "Custos Reais de Mão de Obra" entre Equipa e Progress Tracker
- Usar `ObraLaborCostsTab` com o `obraId`
- Adicionar KPI de custo de mão de obra no card "Resumo Financeiro" existente

### 4. Página Financeiro da Obra (`src/pages/obras/Financeiro.tsx`)
- Adicionar nova tab "Mão de Obra" nas tabs existentes
- Mostrar dashboard completo de custo de mão de obra dentro desta tab
- Integrar totais de labor cost no balanço geral da obra

### 5. Sem migrações necessárias
As tabelas `project_labor_cost_entries`, `timesheet_allocations` e `workers` já existem com a estrutura necessária. Os dados de custo já usam snapshot (hourly_cost_snapshot / amount).

## Ficheiros a criar/modificar
- **Criar**: `src/hooks/useObraLaborCosts.ts`
- **Criar**: `src/components/obras/ObraLaborCostsTab.tsx`
- **Modificar**: `src/pages/obras/Ver.tsx` (adicionar secção de custos)
- **Modificar**: `src/pages/obras/Financeiro.tsx` (adicionar tab mão de obra)

## Notas técnicas
- Todos os custos vêm de `project_labor_cost_entries.amount` (snapshot imutável)
- Filtragem por `status != 'reversed'` para excluir entradas anuladas
- Gráficos usando `recharts` (já disponível no projeto)
- Permissões controladas por RLS existente (org-based)

