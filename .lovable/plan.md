

# Módulo "Sistema Construtivo ICF" — Plano de Implementação

## Visão Geral

Criar um módulo técnico completo para obras em ICF (Insulated Concrete Forms), integrado na plataforma Obra Sys com 6 áreas funcionais: Configuração, Panos de Parede, Vãos, Fundações, Lajes e Resumo Global. Inclui cálculo paramétrico automático, integração com orçamento, alertas Axia contextuais e auditoria.

---

## Fase 1 — Base de Dados (Migration SQL)

Criar 6 tabelas principais + tabela de auditoria:

- **icf_configuracoes** — configuração ICF por obra (espessura núcleo, classe betão/aço, tipologias, fatores, status rascunho/validado/congelado)
- **icf_panos_parede** — panos com cálculo automático (área bruta/líquida, volume betão, armaduras)
- **icf_vaos** — vãos por pano (tipo, dimensões, quantidade, área total calculada)
- **icf_fundacoes** — sapatas contínuas/isoladas (dimensões, volume, aço estimado, tensões)
- **icf_lajes** — lajes por piso (área, tipologia, volume, peso próprio)
- **icf_audit_log** — eventos de auditoria (tipo evento, entidade, user_id, dados antigos/novos)

Todas com `empresa_id` (via `get_user_org_id()`), `obra_id`, RLS por organização usando `get_org_member_ids()`.

Triggers para:
- Calcular `area_bruta`, `area_liquida`, `volume_betao` nos panos automaticamente
- Recalcular `area_vaos` do pano quando vãos são inseridos/atualizados/deletados
- Calcular `area_total` dos vãos
- Calcular `volume_betao` das fundações
- `updated_at` automático

View `icf_resumo_obra` para totais agregados (volumes, áreas, índices m³/m², kg/m²).

---

## Fase 2 — Tipos e Hooks (Frontend)

### Tipos TypeScript
- `src/types/icf.ts` — interfaces para todas as entidades ICF, tipologias de armadura, presets

### Hooks React Query
- `src/hooks/useIcfConfig.ts` — CRUD configurações, duplicar, congelar
- `src/hooks/useIcfPanos.ts` — CRUD panos + cálculos
- `src/hooks/useIcfVaos.ts` — CRUD vãos por pano
- `src/hooks/useIcfFundacoes.ts` — CRUD fundações
- `src/hooks/useIcfLajes.ts` — CRUD lajes
- `src/hooks/useIcfResumo.ts` — resumo global da obra

---

## Fase 3 — Páginas e Componentes

### Navegação
Adicionar ao grupo "Obras" em `navigation.ts`:
```
{ icon: Blocks, label: "ICF", href: "/icf" }
```

### Páginas (`src/pages/icf/`)
- `Index.tsx` — Visão geral ICF (KPIs, estado configuração, alertas, ações rápidas)
- `Configuracao.tsx` — Formulário de configuração do sistema construtivo
- `Panos.tsx` — Tabela editável de panos de parede com filtros por piso
- `Fundacoes.tsx` — Lista de fundações com presets rápidos
- `Lajes.tsx` — Inserção por piso com cálculo automático
- `Resumo.tsx` — Dashboard com totais, gráficos, índices, comparativo por secção

### Componentes (`src/components/icf/`)
- `IcfOverviewDashboard.tsx` — cartões KPI + alertas Axia
- `IcfConfigForm.tsx` — formulário de configuração com presets
- `IcfPanosTable.tsx` — tabela editável inline com cálculo em tempo real
- `IcfVaosDialog.tsx` — modal para gerir vãos de um pano
- `IcfFundacoesTable.tsx` — tabela com presets sapata contínua/isolada
- `IcfLajesTable.tsx` — tabela com tipologias e cálculo
- `IcfResumoCards.tsx` — totais e índices globais
- `IcfResumoCharts.tsx` — gráficos comparativos (paredes vs fundações vs lajes)
- `IcfAxiaAlerts.tsx` — alertas contextuais baseados em regras
- `IcfExportActions.tsx` — botões de exportação (PDF, CSV, para orçamento)

---

## Fase 4 — Lógica de Cálculo

### No Frontend (tempo real)
- Panos: `area_bruta = comprimento × altura_util`, `area_liquida = area_bruta - area_vaos`, `volume = area_liquida × espessura`
- Vãos: `area_total = largura × altura × quantidade`
- Fundações: `volume = comprimento × largura × altura × quantidade`
- Lajes: `volume = área × espessura_total`

### No Backend (triggers SQL)
- Mesmos cálculos replicados para consistência
- View de resumo com somatórios e índices automáticos

---

## Fase 5 — Alertas Axia Contextuais

Implementar via regras determinísticas (sem chamada a IA nesta fase):
- Panos sem armadura definida
- Área de vãos > 40% da área bruta
- Configuração alterada após congelamento
- Fundações sem tensão admissível
- Índice kg/m² fora do intervalo de referência (tipicamente 15-25 kg/m² para ICF)
- Lajes sem peso próprio definido

Componente `IcfAxiaAlerts.tsx` consome dados e gera alertas com justificação.

---

## Fase 6 — Integração Orçamento

Componente `IcfExportActions.tsx` com ação "Enviar para Orçamento":
- Agrupa quantidades por tipo (betão paredes, betão fundações, betão lajes, aço, cofragem)
- Cria capítulo "ICF — Quantidades Estruturais" no orçamento selecionado
- Insere artigos com quantidades consolidadas do resumo

---

## Fase 7 — Rotas e Navegação

Adicionar rotas lazy-loaded em `App.tsx`:
```
/icf → Index
/icf/configuracao/:id? → Configuracao
/icf/panos/:obraId → Panos
/icf/fundacoes/:obraId → Fundacoes
/icf/lajes/:obraId → Lajes
/icf/resumo/:obraId → Resumo
```

---

## Segurança (RLS)

Todas as tabelas ICF seguem o padrão existente:
- SELECT/INSERT/UPDATE/DELETE para `authenticated` onde `empresa_id` pertence à organização do utilizador (`get_user_org_id()`)
- Auditoria com INSERT only para authenticated

---

## Entregáveis por Ordem de Implementação

1. Migration SQL (tabelas + triggers + view + RLS + seed presets)
2. Tipos TypeScript + hooks React Query
3. Páginas e componentes UI (visão geral, config, panos, vãos, fundações, lajes, resumo)
4. Alertas Axia por regras
5. Integração com orçamento
6. Navegação e rotas

---

## Detalhes Técnicos

- Padrão de layout: `AppLayout` (mesmo das outras páginas)
- State management: React Query + Supabase client
- UI: Tailwind + shadcn/ui (Card, Table, Dialog, Form, Tabs)
- Gráficos do resumo: Recharts (já disponível no projeto)
- Exportação PDF: via edge function ou client-side (jsPDF)
- Multi-empresa: isolamento por `empresa_id = get_user_org_id()`

