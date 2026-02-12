
# Modulo de Relatorios

## Resumo

Criar uma nova pagina de Relatorios (/relatorios) que agrega e apresenta dados de todos os modulos da plataforma num unico local, permitindo ao utilizador ter uma visao completa da sua atividade. A pagina ja esta prevista na navegacao (MAIN_NAV_ITEMS em navigation.ts) mas ainda nao tem implementacao.

## O que muda para o utilizador

Uma nova pagina acessivel pelo menu lateral "Relatorios" que apresenta:

1. **Resumo Geral** -- KPIs globais (total de obras, orcamentos, clientes, valor total, etc.)
2. **Orcamentos** -- contagem por status (rascunho, enviado, adjudicado, recusado), valor total por status
3. **Obras** -- resumo por status, valor total, progresso medio, contagem de RDOs e Autos de Medicao por obra
4. **Financeiro** -- dashboard global (total a pagar, total a receber, saldo), custos de pessoal, distribuicao por origem (mao de obra, material, outros)
5. **Margens de Lucro** -- lucro total, margem media percentual
6. **Tarefas** -- contagem por status (pendente, em progresso, concluida), tarefas atrasadas e urgentes
7. **Clientes** -- total de clientes, ativos vs inativos, distribuicao por nivel de acesso
8. **Recursos Humanos** -- total de membros da equipa, alocacoes ativas, custos totais de pessoal

A pagina usa Tabs para organizar as seccoes e Cards com graficos (recharts) para visualizacao intuitiva.

---

## Plano Tecnico

### Fase 1 -- Hook de Relatorios

**Novo ficheiro** `src/hooks/useRelatorios.ts`:
- Agrega dados de todos os hooks existentes (useOrcamentos, useObras, useClientes, useTarefas, useFinanceiro, useAutosMedicao, useRDOs, useRecursos, useAlocacoes)
- Calcula KPIs e estatisticas para cada seccao
- Retorna dados prontos para renderizacao

### Fase 2 -- Pagina de Relatorios

**Novo ficheiro** `src/pages/relatorios/Index.tsx`:
- Layout com AppLayout (title="Relatorios")
- Tabs: Resumo | Orcamentos | Obras | Financeiro | Tarefas | Clientes | Recursos
- Cada tab contem Cards com:
  - KPIs numericos (Card com icone + valor + label)
  - Graficos de distribuicao (PieChart do recharts para status)
  - Graficos de barras (BarChart para valores financeiros)
  - Listas resumidas com links para navegacao rapida

### Fase 3 -- Componentes de Graficos

**Novo ficheiro** `src/components/relatorios/ReportChart.tsx`:
- Componente reutilizavel de grafico (Pie e Bar) usando recharts (ja instalado)
- Cores consistentes com o tema da aplicacao

**Novo ficheiro** `src/components/relatorios/KpiCard.tsx`:
- Card padrao para KPI com icone, valor, label e variacao opcional

**Novo ficheiro** `src/components/relatorios/index.ts`:
- Barrel exports

### Fase 4 -- Rotas e Navegacao

**Atualizar** `src/App.tsx`:
- Adicionar rota `/relatorios` -> `RelatoriosPage`
- A rota `/relatorios` ja esta no navigation.ts (MAIN_NAV_ITEMS), por isso a navegacao lateral ja funciona

---

## Estrutura das Tabs

### Tab "Resumo"
- Grid de KPI cards: Total Obras, Total Orcamentos, Total Clientes, Valor Total Obras, Saldo Financeiro, Total Tarefas
- Grafico de barras com receitas vs despesas

### Tab "Orcamentos"
- KPIs: Total, Em Rascunho, Enviados, Adjudicados, Recusados
- PieChart por status
- Valor total por status (BarChart)
- Lista dos 5 orcamentos mais recentes com link

### Tab "Obras"
- KPIs: Total, Em Curso, Planeamento, Concluidas, Pausadas
- PieChart por status
- Progresso medio das obras ativas
- Contagem de RDOs e Autos de Medicao total

### Tab "Financeiro"
- KPIs: Total a Pagar, Total a Receber, Saldo, Contas Vencidas
- PieChart de distribuicao por origem (mao de obra, material, outros)
- Margens de lucro globais (valor base, com margem, lucro total, margem media)

### Tab "Tarefas"
- KPIs: Total, Pendentes, Em Progresso, Concluidas, Atrasadas, Urgentes
- PieChart por status

### Tab "Clientes"
- KPIs: Total, Ativos, Inativos
- PieChart por nivel de acesso

### Tab "Recursos"
- KPIs: Total Membros Equipa, Alocacoes Ativas, Custo Total Pessoal
- Lista de membros com obra atual

---

## Ficheiros a criar
- `src/hooks/useRelatorios.ts`
- `src/pages/relatorios/Index.tsx`
- `src/components/relatorios/ReportChart.tsx`
- `src/components/relatorios/KpiCard.tsx`
- `src/components/relatorios/index.ts`

## Ficheiros a modificar
- `src/App.tsx` (adicionar rota /relatorios)

## Sem alteracoes na base de dados
Este modulo e apenas de leitura -- consome dados ja existentes nas tabelas atuais sem necessidade de nova migracao.
