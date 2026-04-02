

# Módulo de Medição Assistida por Planta — Plano de Implementação

## 1. Visão Técnica

Módulo de medição sobre planta integrado no fluxo obra → orçamento, com Axia como motor de inteligência contextual. O utilizador importa uma planta (PDF/imagem), calibra a escala, mede sobre o canvas, mapeia para artigos da base de preços e gera pré-orçamento. A Axia sugere artigos complementares, deteta incoerências e valida quantitativos.

**Stack**: React + Canvas (Konva/react-konva) + pdfjs-dist + Supabase Storage + Edge Functions + Lovable AI (Gemini Flash)

---

## 2. Arquitetura de Alto Nível

```text
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Upload &    │────▶│  Calibração  │────▶│  Medição sobre  │
│  Importação  │     │  de Escala   │     │  Planta (Canvas) │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                   │
                    ┌──────────────┐     ┌─────────▼────────┐
                    │  Gerar Pré-  │◀────│  Mapeamento p/   │
                    │  Orçamento   │     │  Base de Preços  │
                    └──────┬───────┘     └──────────────────┘
                           │
                    ┌──────▼───────┐
                    │  Revisão &   │
                    │  Validação   │
                    └──────────────┘
                           │
                    ┌──────▼───────┐
                    │  Axia (EF)   │ ← Sugestões complementares
                    └──────────────┘
```

---

## 3. Escopo por Fase

### Fase 1 — Schema + Storage + Upload (MVP Core)
- Criar tabelas: `plan_imports`, `plan_calibrations`, `plan_measurements`, `plan_measurement_mappings`, `plan_budget_links`
- Criar bucket `plan-files` no Storage
- Página de upload com metadados (obra, disciplina, revisão)
- Versionamento automático por planta/obra

### Fase 2 — Viewer + Calibração
- Componente `PlanViewer` com `pdfjs-dist` (render PDF page → canvas) + `react-konva` (overlay)
- Zoom, pan, minimap
- Calibração por 2 pontos: utilizador clica em 2 pontos de uma cota conhecida, insere distância real → calcula `pixels_per_meter`
- Lazy loading obrigatório (~500KB de libs)

### Fase 3 — Ferramentas de Medição
- Ferramenta **Linha** (comprimento): polyline sobre o canvas
- Ferramenta **Contagem**: pontos clicados (portas, tomadas, etc.)
- Cada medição guarda: tipo, coordenadas (jsonb), valor calculado, camada, observação
- Cores/etiquetas por tipo de medição
- Undo/redo básico (stack de ações)

### Fase 4 — Mapeamento para Base de Preços
- Associar cada medição a capítulo/artigo da base de preços existente
- Fórmulas de conversão e fator de desperdício por mapping
- Itens sem correspondência ficam como "por mapear"
- Tabela de revisão: quantidade bruta → ajuste manual → quantidade final

### Fase 5 — Geração de Pré-Orçamento
- Consolidar medições aprovadas por capítulo
- Inserir `artigos_orcamento` com `quantity_source = 'plan_measurement'` e `linked_element_id` = ID da medição
- Distinção clara entre quantidade medida, ajustada e final

### Fase 6 — Axia no Módulo (Edge Function)
- Nova Edge Function `axia-plan-suggestions` que recebe medições + tipo de obra
- Sugestões de artigos complementares (ex: parede medida → pintura + reboco + rodapé)
- Alerta de duplicações na mesma zona
- Alerta de incompatibilidade de unidades
- Validação de coerência (área de WC > 50m² = provável erro)
- Usa o padrão existente do `axia-suggestions` com Gemini Flash + tool calling

### Pós-MVP
- Ferramenta **Polígono** (áreas)
- Leitura semiautomática de compartimentos via Axia (multimodal com imagem)
- Comparação entre versões de planta
- Templates por tipologia de obra
- DWG/IFC

---

## 4. Tabelas e Campos

### `plan_imports`
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| obra_id | uuid FK → obras | |
| user_id | uuid FK → auth.users | quem importou |
| file_path | text | path no Storage |
| file_type | text | 'pdf', 'png', 'jpg' |
| nome_ficheiro | text | nome original |
| disciplina | text | 'arquitetura', 'estruturas', 'eletrica', etc. |
| revision_number | int | auto-increment por obra |
| data_planta | date | |
| observacoes | text | |
| status | text | 'pendente', 'calibrada', 'medida', 'validada' |
| created_at | timestamptz | |

### `plan_calibrations`
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| plan_import_id | uuid FK | |
| point1 | jsonb | {x, y} em pixels |
| point2 | jsonb | {x, y} em pixels |
| real_distance | numeric | em metros |
| pixels_per_meter | numeric | calculado |
| unidade | text | 'm', 'cm' |
| status | text | 'valida', 'invalida' |

### `plan_measurements`
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| plan_import_id | uuid FK | |
| user_id | uuid | quem mediu |
| tipo | text | 'linha', 'area', 'contagem' |
| coordinates | jsonb | array de pontos |
| valor_bruto | numeric | comprimento/área/contagem |
| valor_ajustado | numeric | após ajuste manual |
| valor_final | numeric | aprovado |
| unidade | text | 'm', 'm²', 'un' |
| camada | text | 'paredes', 'pavimentos', etc. |
| etiqueta | text | |
| cor | text | hex |
| observacao | text | |
| estado_validacao | text | 'pendente', 'validado', 'rejeitado' |
| created_at | timestamptz | |

### `plan_measurement_mappings`
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| measurement_id | uuid FK | |
| capitulo_id | uuid FK → capitulos | |
| artigo_base_id | uuid FK → base_precos | |
| unidade_artigo | text | |
| formula_conversao | text | |
| fator_desperdicio | numeric | default 1.0 |
| coeficiente | numeric | default 1.0 |
| estado | text | 'mapeado', 'por_mapear', 'incompativel' |

### `plan_budget_links`
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| measurement_id | uuid FK | |
| orcamento_id | uuid FK | |
| artigo_orcamento_id | uuid FK | |
| created_at | timestamptz | |

**RLS**: Todas as tabelas isoladas por `obra_id → user_id` usando o padrão `get_org_member_ids()` existente.

---

## 5. Rotas e Navegação

```text
/obras/:id/plantas              → Lista de plantas da obra
/obras/:id/plantas/importar     → Upload + metadados
/obras/:id/plantas/:planId      → Viewer + calibração + medição
/obras/:id/plantas/:planId/quantitativos → Revisão + mapeamento
/obras/:id/plantas/:planId/orcamento     → Geração de pré-orçamento
```

Adicionar entrada na sidebar dentro do grupo "Operação" ou como sub-rota acessível pela página da obra (botão "Plantas" no header da obra).

---

## 6. Componentes Principais

| Componente | Responsabilidade |
|------------|-----------------|
| `PlanUploadForm` | Upload + metadados |
| `PlanViewer` | PDF render + canvas overlay + zoom/pan |
| `PlanCalibrationTool` | 2 pontos + input distância |
| `PlanMeasurementTools` | Toolbar (linha, contagem) + desenho |
| `PlanMeasurementsList` | Lista lateral de medições com valores |
| `PlanMappingTable` | Associar medições a artigos |
| `PlanQuantitativosReview` | Revisão bruto → ajustado → final |
| `PlanBudgetGenerator` | Consolidar e criar pré-orçamento |
| `AxiaPlanSuggestionsPanel` | Sugestões contextuais (reutiliza padrão do `AxiaSuggestionsPanel`) |

---

## 7. Edge Function: `axia-plan-suggestions`

Segue o padrão do `axia-suggestions` existente:
- Recebe: `obra_id`, `tipo_obra`, `measurements[]`, `existing_mappings[]`
- Usa Gemini Flash via Lovable AI Gateway
- Tool calling para output estruturado
- Retorna sugestões tipadas: `add_complementary`, `unit_mismatch`, `duplicate_zone`, `value_incoherence`
- Log em `axia_suggestions_log` com `entity_type = 'plan_measurement'`

---

## 8. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Canvas pesado (~500KB) | Lazy loading + code splitting |
| PDFs grandes (>10MB) | Renderizar apenas 1 página, paginação |
| Calibração imprecisa | Zoom alto obrigatório nos pontos de calibração |
| Polígonos complexos (UX) | Diferido para pós-MVP; MVP só tem linhas e contagens |
| Expectativa de leitura automática | UI clara: "Medição assistida", nunca "automática" |

---

## 9. Ordem de Implementação Recomendada

1. **Schema SQL + Storage bucket** — Migration com todas as tabelas
2. **Upload + listagem** — Página de importação + card por planta
3. **Viewer PDF + Calibração** — Componente core do módulo
4. **Ferramentas de medição** (linha + contagem)
5. **Tabela de quantitativos + mapeamento**
6. **Geração de pré-orçamento** (integração com `artigos_orcamento`)
7. **Axia suggestions** (Edge Function + painel)
8. **Navegação + routing** (integrar no fluxo da obra)

Cada fase é independente e testável. Posso começar pela Fase 1 (schema + upload) assim que aprovar.

