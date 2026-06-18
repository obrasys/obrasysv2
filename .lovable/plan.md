# Redesign Obra Sys — Plano Faseado

Refatoração visual profunda, **sem alterar regras de negócio, base de dados, autenticação, Stripe/trial, permissões ou fluxos existentes**. Tudo é feito em camadas de apresentação (tokens, layout, componentes UI) e reorganização de navegação. Cada fase é entregável e testável de forma independente.

---

## Princípios transversais

- **Zero regressões funcionais**: nenhuma rota, hook, edge function, RLS ou tabela é alterada nesta refatoração.
- **Design tokens em `src/index.css` + `tailwind.config.ts`** (HSL semânticos). Nada de cores hardcoded em componentes.
- **Componentes reutilizáveis** em `src/components/ui/*` (já existentes via shadcn) + nova camada `src/components/shell/*` (layout) e `src/components/patterns/*` (PageHeader, MetricCard, DataTable, StatusBadge, FilterBar, SidePanel, EmptyState).
- **Identidade mantida**: Deep Teal `#0F4C5C` como primária, Red Hat Display, base 18px, rounded-xl, premium enterprise feel (alinhado com memória de projeto).
- **Mobile-first revisitado**: sidebar colapsável, tabelas com fallback para cards, `viewport-fit=cover`.
- Cada fase termina com smoke test manual das rotas tocadas + verificação visual em desktop/tablet/mobile.

---

## Fase 1 — Design System + Shell Global

**Objetivo**: base visual nova aplicada a todas as páginas existentes sem mexer no conteúdo delas.

1. **Tokens** (`src/index.css`, `tailwind.config.ts`):
   - Revisão da paleta semântica: `--surface`, `--surface-elevated`, `--border-subtle`, `--text-strong`, `--text-muted`, `--accent`, estados (`--state-draft|review|approved|sent|awarded|lost|blocked|paid|inprogress|done`).
   - Tipografia escalonada (display, h1-h4, body, caption, mono financeiro).
   - Densidade (3 níveis via CSS var `--density`).
   - Sombras suaves (`--shadow-card`, `--shadow-elevated`), bordas finas, radii.
2. **Shell**:
   - `AppShell` (sidebar fixa + topbar fixa + main com max-width controlado e padding generoso).
   - **Sidebar** reorganizada por grupos colapsáveis (ver mapa abaixo), com NavLink ativo, badge de contagens, mini-mode com ícones.
   - **Topbar**: pesquisa global (reutiliza `Pesquisa.tsx`), notificações (sino), botão Axia, chip do plano/trial, avatar com menu.
3. **Padrões reutilizáveis** (novos componentes presentational):
   - `PageHeader` (título grande + subtítulo + ações à direita + breadcrumbs).
   - `MetricCard` (KPI com ícone, valor, delta, tooltip).
   - `MetricCardGrid`.
   - `DataTable` wrapper sobre tabela atual com cabeçalho limpo, zebra opcional, ações coladas à direita, paginação, vazio.
   - `StatusBadge` com mapa central de estados.
   - `FilterBar`, `TabsBar`, `SidePanel` (drawer), `EmptyState`, `SectionCard`.
4. **Substituição não-invasiva**: `AppLayout.tsx` e `Sidebar.tsx` adotam o novo shell; páginas existentes continuam a renderizar dentro sem alteração.

**Mapa da sidebar** (apenas reorganização de itens já existentes; itens sem rota correspondente ficam ocultos ou marcados "em breve" — sem criar novas funcionalidades):

```
Dashboard
Obras: Todas · Em execução · Autos de medição · Documentos · Relatórios
Orçamentos: Lista · RAI da Obra · Propostas comerciais · Folha de fecho · Budget · Forecast/EAC · Outturn
Planta/ICF: Planta · Importação · Extração assistida · Revisão quantitativos · Biblioteca ICF
Comercial: RFQ · Fornecedores · Comparativos · Adjudicações
Financeiro: Ciclo · Faturação · Custos · Recebimentos · Centros de custo
Biblioteca: Materiais · Artigos · Composições · Histórico de preços
Axia: Agente · Auditoria orçamento · Auditoria obra · Sugestões pendentes · Histórico
Relatórios
Definições (entrada para área dedicada)
```

**Critério de aceitação F1**: todas as rotas atuais funcionam; visual base novo; nenhuma página com cor hardcoded; tema claro/escuro mantém contraste.

---

## Fase 2 — Definições (Settings Hub)

Nova área `/definicoes/*` com sidebar secundária própria. Cada página é casca visual + reutiliza hooks/dados já existentes (`useUserSettings`, `useTeamManagement`, `useGestaoEmpresa`, `useSubscription`, etc.). Quando o dado ainda não existe, mostrar `EmptyState` "em breve" — sem inventar backend.

- Perfil
- Conta e acesso (2FA, sessões — só UI; backend só se já existir)
- Notificações (matriz canal × categoria)
- Aparência e idioma (tema, densidade, cor de destaque, idioma)
- Perfil da organização
- Equipa e permissões
- Papéis e níveis (matriz read-only inicial sobre `accessProfiles.ts`)
- Faturação e plano (cards de utilização ligados a `useSubscription` + `planLimits`)
- Integrações (lista visual)
- Auditoria e histórico
- Legal e conformidade

---

## Fase 3 — Orçamentos, Propostas Comerciais, Folha de Fecho

- **`/orcamentos`**: PageHeader + 6 MetricCards + DataTable nova + FilterBar de estados. Mantém ações e rotas atuais (`Criar`, `Editar`, `Ver`, `Inteligente`).
- **Propostas comerciais**: usar painel já criado na Fase 4 anterior (`CommercialProposalsPanel`) + nova lista global `/orcamentos/propostas` com pipeline KPIs e editor split (esquerda formulário, direita preview). Reaproveita `useCommercialProposals` + `orcamento-pdf-comercial`.
- **Folha de fecho**: PageHeader + KPIs + tabela; reusa `useClosingSheets`.

---

## Fase 4 — Planta/ICF: Extração Assistida

Novo layout split para `/plantas` e fluxo ICF:
- Esquerda: viewer PDF/DXF (reusa `usePdfRenderer`, `useDxfRenderer`, react-konva).
- Direita: painel Axia com KPIs de confiança, lista de elementos extraídos (estado, código, qty, unidade, dimensão, origem), botões aprovar/editar/rever/rejeitar.
- Marcadores coloridos por categoria sobre a planta, clique cruza item ↔ marcador.
- **Regra crítica mantida**: nenhuma extração entra em orçamento sem aprovação humana (já é o comportamento atual — apenas reforçado visualmente).

---

## Fase 5 — Obras, Autos, Budget, Forecast/EAC, Outturn

- Lista de obras com KPIs (Contratado, Executado, Faturado, Por receber, TAM, Desvios, Margem, Prazo) + DataTable.
- Detalhe da obra: header rico, KPIs, barra de consumo, tabs (Execução · Autos · Desvios · Subempreiteiros · Contrato · Documentos · Forecast · Outturn), tabela por capítulos expansível.
- Reusa: `useObras`, `useAutosMedicao`, `useDossierObra`, `useProjectProgress`, `useClosingSheets`, `RastreabilidadePanel`.

---

## Fase 6 — Biblioteca de Materiais, Fornecedores, RFQ

- **Materiais**: KPIs + menu lateral por família + DataTable (reusa `useBasePrecos`, `useBaseArtigos`).
- **Fornecedores**: cards/lista com rating, fill rate, resposta média (reusa `useTenantSupplierPricebooks`, etc.).
- **RFQ**: KPIs + DataTable de estados (reusa `useFornecedorQuoteRequests`, `useSupplierDirectQuotes`).

---

## Fase 7 — Axia como Agente Visual

Layout 3 colunas em `/axia`:
- Esquerda: conversas/histórico por obra.
- Centro: chat (segue contrato `chat-agent-ui-contract` + AI Elements; perguntar ao utilizador shape de conversa e storage antes de implementar).
- Direita: contexto ativo (obra, documento, orçamento, equipa, modelos, ações disponíveis).

Reusa edge functions e hooks Axia já existentes; ações críticas continuam a exigir confirmação humana.

---

## Detalhes técnicos

- **Stack inalterado**: React 18 + Vite + Tailwind v3 + shadcn + TanStack Query + Supabase (Lovable Cloud).
- **Arquivos novos** (Fase 1, indicativo):
  - `src/components/shell/AppShell.tsx`, `TopBar.tsx`, `SideNav.tsx`, `SideNavGroup.tsx`
  - `src/components/patterns/PageHeader.tsx`, `MetricCard.tsx`, `DataTable.tsx`, `StatusBadge.tsx`, `FilterBar.tsx`, `SidePanel.tsx`, `EmptyState.tsx`, `SectionCard.tsx`
  - `src/config/navigation.ts` reescrito com a nova taxonomia de grupos (mantendo rotas existentes).
- **Arquivos editados**: `src/index.css`, `tailwind.config.ts`, `src/components/layout/AppLayout.tsx`, `src/components/layout/Sidebar.tsx`.
- **Não tocar**: `src/integrations/supabase/*`, `.env`, `supabase/config.toml`, migrations, RLS, edge functions, hooks de dados.
- **Testes**: smoke manual por rota tocada; `bunx vitest run` para tests existentes; verificação responsiva em 1920/1366/834/390.

---

## Entrega

Começar pela **Fase 1** (design system + shell + sidebar reorganizada + padrões reutilizáveis). Só depois de aprovada e validada visualmente, avançar para a Fase 2, e assim sucessivamente.

Confirmas para arrancar a Fase 1?