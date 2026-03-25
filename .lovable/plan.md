

# Plano: Redesign do Dashboard inspirado no layout Fiscaliza

## Análise do Anexo

O layout de referência tem 5 secções verticais distintas:

```text
┌─────────────────────────────────────────────────┐
│  4 KPI Cards (ícone colorido + número grande)   │
├────────────────────┬────────────────────────────┤
│  Gráfico barras    │  Gráfico linhas            │
│  (Diários de Obra) │  (Obras)                   │
├────────┬───────────┬───────────┬────────────────┤
│ Metric │  Metric   │  Metric   │  Metric        │
│ +trend │  +trend   │  +trend   │  +trend        │
├────────┴──┬────────┴──┬────────┴────────────────┤
│ Progress  │ Donut     │ Team Members             │
│ Bars      │ Chart     │ (avatares + status)      │
├───────────┴───────────┴─────────────────────────┤
│  Tabela de Contratos/Obras (paginada)           │
└─────────────────────────────────────────────────┘
```

## Veredicto

**Sim, é possível.** O layout é 100% front-end — cards, gráficos e tabelas. Não requer alterações no backend. Os dados já existem nos hooks (`useObras`, `useRDOs`, `useRelatorios`, `useFinanceiro`, `useRecursos`). A biblioteca `recharts` já está no projeto para os gráficos.

**Mapeamento dos dados do Fiscaliza → ObraSys:**

| Secção Fiscaliza | Dado ObraSys |
|---|---|
| Projetos (4.732) | Total Obras |
| RDOs (1.627) | Total RDOs |
| Contratos (3.275) | Total Orçamentos |
| Cronogramas (6.187) | Total Tarefas |
| Gráfico barras "Diários de Obra" | RDOs por mês (agrupados por status) |
| Gráfico linhas "Obras" | Obras criadas por mês |
| Ocorrências / Evidências / Financeiro / Orçamentos | KPIs com trend % (dados de `useRelatorios`) |
| Absent Statistic (progress bars) | Estatísticas de obras (progresso, pendentes, etc.) |
| Task Statistic (donut) | Tarefas por status (donut chart) |
| Today Absent (team) | Equipa alocada (de `useRecursos`) |
| Tabela Contratos | Tabela de Obras com status, valor, data |

## Plano de Implementação

### 1. Reescrever `src/pages/Dashboard.tsx`

Substituir o layout atual por 5 secções:

**Secção 1 — KPI Row (4 cards):**
- Usar o componente `kpi-card` (a criar na Fase 1) ou cards inline
- Obras totais, RDOs totais, Orçamentos totais, Tarefas totais
- Cada card com ícone em círculo colorido (como o anexo)

**Secção 2 — Gráficos lado a lado (grid 2 colunas):**
- Gráfico de barras: RDOs por mês (Total RDO vs Aprovados) usando `recharts BarChart`
- Gráfico de linhas: Obras por mês (Total vs Recusados/Concluídas) usando `recharts LineChart`
- Dropdown de ano (2025/2026)

**Secção 3 — 4 Metric Cards com trend:**
- Ocorrências → Alertas de obra (de `useObraAlerts`)
- Financeiro → Saldo financeiro (de `useFinanceiro`)
- Orçamentos → Valor total orçamentos
- Evidências → RDOs com fotos ou valor medições
- Cada card com mini sparkline e variação % (verde/vermelho)

**Secção 4 — 3 colunas:**
- **Coluna 1**: Progress bars (obras em curso com %, pendentes, concluídas)
- **Coluna 2**: Donut chart de tarefas por status (recharts PieChart)
- **Coluna 3**: Membros da equipa alocados (avatar, nome, função, status)

**Secção 5 — Tabela de Obras:**
- Colunas: Nome, Cliente, Etapas/Progresso, Data, Valor, Status, Ações
- Paginação simples (4-5 por página)
- Filtro por data/ano

### 2. Criar componente `src/components/dashboard/DashboardCharts.tsx`

Encapsula os 2 gráficos (barras + linhas) com lógica de agrupamento por mês.

### 3. Criar componente `src/components/dashboard/DashboardMetrics.tsx`

Os 4 cards com sparkline e trend %.

### 4. Criar componente `src/components/dashboard/DashboardStats.tsx`

As 3 colunas (progress bars, donut, equipa).

### 5. Criar componente `src/components/dashboard/ObrasSummaryTable.tsx`

Tabela paginada de obras no estilo do anexo.

### 6. Manter funcionalidades existentes

- Onboarding modals/checklist (mantidos condicionalmente)
- Engagement banners (mantidos)
- Notificações de cotações (integradas como alerta discreto)

## Ficheiros

| Ficheiro | Ação |
|---|---|
| `src/pages/Dashboard.tsx` | Reescrever com novo layout |
| `src/components/dashboard/DashboardCharts.tsx` | Criar (gráficos barras + linhas) |
| `src/components/dashboard/DashboardMetrics.tsx` | Criar (4 metric cards com trend) |
| `src/components/dashboard/DashboardStats.tsx` | Criar (progress bars, donut, equipa) |
| `src/components/dashboard/ObrasSummaryTable.tsx` | Criar (tabela paginada) |
| `src/components/dashboard/index.ts` | Criar (barrel export) |

Sem alterações de backend, rotas, ou base de dados.

