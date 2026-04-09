

# Redesenho do Dashboard Obra Sys

## Resumo

Reformulação completa do dashboard, transformando-o de uma vista fragmentada de KPIs e gráficos num **centro de comando operacional** com hierarquia clara: ver -> entender -> decidir -> agir. Inclui reestruturação da sidebar para navegação por fluxos.

---

## Estrutura do Novo Dashboard (de cima para baixo)

### 1. Boas-vindas Contextuais
- Saudação personalizada: "Bem-vindo de volta, [Nome]"
- Frase-resumo dinâmica do dia (ex: "Hoje tens 2 obras em risco, 4 ações prioritárias e 1 auto de medição pendente")
- Botões de ação rápida: + Nova Obra, + Novo Orçamento, + Nova RDO, Ver Agenda

### 2. Faixa de KPI Executivo (4 cards grandes)
- **Obras Ativas** (count em_curso, subtítulo com variacao mensal)
- **Obras em Risco** (pausadas + sem progresso, destaque vermelho/amber)
- **Receber Esta Semana** (soma contas a_receber com vencimento nos proximos 7 dias)
- **Medicoes Pendentes** (autos com status pendente/rascunho)

### 3. Bloco Duplo: Prioridades + Alertas (duas colunas)
- **Prioridades de Hoje**: tarefas urgentes, RDOs por fechar, autos por aprovar
- **Alertas Importantes**: obras atrasadas, contratos a expirar, pagamentos vencidos
- Dados reais das hooks existentes; placeholders realistas quando sem dados

### 4. Obras em Andamento (secção protagonista)
- Cards horizontais por obra em_curso com: nome, etapa, barra de progresso, prazo (dias adiantado/atrasado), badge de risco, equipa (count), botão "Abrir obra"
- Link "Ver todas as obras" no final

### 5. Navegacao por Fluxo (3 cards)
- **Fluxo Comercial**: Clientes, Orçamentos, Base de Preços
- **Fluxo de Execução**: Tarefas, RDO, Autos de Medição, Livro de Ponto
- **Fluxo Financeiro**: Recebimentos, Pagamentos, Previsões

### 6. Agenda + Desempenho (duas colunas)
- **Agenda**: próximos eventos/tarefas com datas
- **Desempenho da Semana**: execução média, obras adiantadas vs atrasadas, produtividade

---

## Sidebar Reestruturada

Nova organização em `src/config/navigation.ts`:

```text
Dashboard
Comercial       → Clientes, Orçamentos, Base de Preços
Obras           → Todas as Obras, Tarefas, RDO, Autos de Medição, Livro de Ponto, Conformidade
Recursos        → Equipas, Instalações, Fornecedores
Financeiro      → Financeiro (principal)
Documentos      → Plantas, Relatórios, Importar Dados
IA              → Axia
Conta           → Subscrição, Definições, Suporte
```

A sidebar mantém o mesmo componente visual (`Sidebar.tsx`) mas com os novos grupos. O menu mobile (`TopBar.tsx MobileNav`) atualiza automaticamente via `NAV_GROUPS`.

---

## Ficheiros a Criar/Modificar

| Ficheiro | Acção |
|---|---|
| `src/config/navigation.ts` | Reestruturar grupos de navegação |
| `src/pages/Dashboard.tsx` | Reescrever com nova estrutura de secções |
| `src/components/dashboard/DashboardWelcome.tsx` | **Novo** - Header contextual + ação rápida |
| `src/components/dashboard/DashboardKPIStrip.tsx` | **Novo** - 4 KPIs executivos |
| `src/components/dashboard/DashboardPriorities.tsx` | **Novo** - Prioridades + Alertas |
| `src/components/dashboard/DashboardObrasActive.tsx` | **Novo** - Cards de obras em andamento |
| `src/components/dashboard/DashboardFlowNav.tsx` | **Novo** - Navegação por fluxo |
| `src/components/dashboard/DashboardAgendaPerformance.tsx` | **Novo** - Agenda + Desempenho |
| `src/components/dashboard/index.ts` | Atualizar exports |
| `src/components/dashboard/DashboardCharts.tsx` | Manter (usado dentro de Desempenho se relevante) |
| `src/components/dashboard/DashboardStats.tsx` | Descontinuar uso no dashboard principal |
| `src/components/dashboard/DashboardMetrics.tsx` | Descontinuar uso no dashboard principal |

---

## Preservação

- Todas as rotas existentes mantidas intactas
- Hooks existentes (`useObras`, `useFinanceiro`, `useAutosMedicao`, `useTarefas`, `useRDOs`, etc.) reutilizados
- Onboarding wizard, engagement banners, empresa modal preservados
- Componentes antigos do dashboard mantidos nos ficheiros (podem ser usados noutros contextos), apenas removidos da vista principal
- Responsividade completa: grid cols adaptam de 1 (mobile) a 2-4 (desktop)

---

## Direção Visual

- Cards com `rounded-xl`, `shadow-sm hover:shadow-md`, bordas subtis
- Tipografia: valores em `text-3xl font-bold`, labels em `text-sm text-muted-foreground`
- Cor primária `#00679d` para destaques; vermelho/amber apenas para risco
- Espaçamento generoso (`space-y-6`, `gap-4 md:gap-6`)
- Barras de progresso com `h-2 rounded-full`
- Badges de risco com semântica visual clara (verde/amber/vermelho)

