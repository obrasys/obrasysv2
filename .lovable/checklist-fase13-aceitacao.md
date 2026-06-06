# Fase 13 — Checklist de Critérios de Aceitação

## Resultado geral: ✅ Aprovado para produção

Validação final contra o pedido original: **PDF lê, DXF processa vetorialmente, ml/áreas calculados, confiança marcada, revisão obrigatória, criar/atualizar orçamento, reanálise versionada, mensagens claras, fluxo antigo intacto, logs gravados, preparado para BIM/IFC futuro**.

---

## 1. Pipeline PDF (IA visual)

| # | Critério | Estado | Prova / Onde |
|---|----------|--------|--------------|
| 1.1 | Upload aceita PDF, PNG, JPG (≤12 MB) | ✅ | `PlanUploadForm` + `IcfPlantAnalyzer.tsx:127-146` — MIME types validados, limites no dropzone |
| 1.2 | Análise via Gemini 2.5 Pro/Flash | ✅ | Edge function `icf-plant-analysis` — routing automático no `useIcfPlantAnalysis.ts:113-114` |
| 1.3 | Extração de paredes, fundações, lajes | ✅ | `IcfPlantAnalysisResult` interface (`useIcfPlantAnalysis.ts:47-61`) — arrays `paredes`, `fundacoes`, `lajes` |
| 1.4 | Confiança por item (`confianca`, `metodo_medicao`) | ✅ | `ExtractedParede` com `confianca?: number` e `metodo_medicao?: 'cota' \| 'escala' \| 'estimativa_visual'` |
| 1.5 | Diagnóstico de dados em falta | ✅ | `diagnoseMissingData()` (`useIcfPlantAnalysis.ts:64-90`) — deteta altura ausente, baixa confiança, escala ausente |
| 1.6 | Modal "Dados em falta" com confirmação humana | ✅ | `IcfPlantMissingDataDialog` — aplicado em `IcfPlantAnalyzer.tsx:160-184` |
| 1.7 | Pré-rasterização opcional para PDFs grandes | ✅ | `renderPdfFirstPageToPngBlob` reutilizado no pipeline PDF (referenciado em Fase 2 do plano) |
| 1.8 | Fluxo antigo intacto — nada quebrado | ✅ | Audit Fase 12 confirmou zero regressões nos fluxos ICF legacy (`icf_panos_parede`, etc.) |

---

## 2. Pipeline DXF (parser vetorial)

| # | Critério | Estado | Prova / Onde |
|---|----------|--------|--------------|
| 2.1 | Upload aceita DXF (≤20 MB) | ✅ | `IcfPlantAnalyzer.tsx:127-146` + `PlanUploadForm` (Fase 3) — `accept` inclui `.dxf` |
| 2.2 | Parsing determinístico sem IA visual | ✅ | Edge function `plan-dxf-parse` — `DxfParser` puro, sem chamadas a modelos |
| 2.3 | Lê entidades LINE / LWPOLYLINE / POLYLINE / INSERT | ✅ | `plan-dxf-parse/index.ts:112-141` — `extractSegments()` cobre todos os tipos |
| 2.4 | Classificação por layer (paredes/portas/janelas/etc.) | ✅ | `LAYER_PATTERNS` (`plan-dxf-parse/index.ts:40-49`) — regex whitelist PT+EN |
| 2.5 | Inferência de unidade via `$INSUNITS` | ✅ | `metersPerUnit()` (`plan-dxf-parse/index.ts:64-73`) — mapeia 0→14 |
| 2.6 | Unidade assumida → confirmação obrigatória | ✅ | `__requires_unit_confirmation` + `DxfUnitConfirmDialog` (`IcfPlantAnalyzer.tsx:70-87`) |
| 2.7 | Sanity checks de escala (bbox, comprimentos) | ✅ | `validacao.sanity_warnings[]` na edge function + exposição em `__sanity_warnings` |
| 2.8 | Heurística de paredes (emparelhamento de linhas) | ✅ | `pairWalls()` (`plan-dxf-parse/index.ts:144+`) — paralelas a 0.05–0.60 m |
| 2.9 | Vãos distribuídos round-robin pelos panos | ✅ | Lógica na edge function — tipos `door`/`window` atribuídos a paredes |
| 2.10 | Output compatível com pipeline PDF | ✅ | Mesmo formato `IcfPlantAnalysisResult` — consumido sem alterações pelo frontend |

---

## 3. Quantitativos ICF Unificados

| # | Critério | Estado | Prova / Onde |
|---|----------|--------|--------------|
| 3.1 | Motor unificado (PDF + DXF → mesmo output) | ✅ | `src/lib/icf-unified-quantities.ts` — `buildIcfUnifiedQuantities()` |
| 3.2 | Classificação ext/int/indeterminado | ✅ | Regex sobre `referencia` (`PE/Ext/Fachada` vs `PI/Int/Divisória`) |
| 3.3 | Cálculo de ml paredes, área bruta/vãos/líquida | ✅ | `IcfUnifiedQuantities.totais` — `area_bruta_m2`, `area_vaos_m2`, `area_liquida_m2` |
| 3.4 | Cálculo de blocos (base + desperdício) | ✅ | `blocos_base` / `blocos_com_desperdicio` com `%` configurável |
| 3.5 | Cálculo de betão (paredes/fundações/lajes) | ✅ | `volume_betao_paredes_m3`, `volume_betao_fundacoes_m3`, `volume_betao_lajes_m3` |
| 3.6 | Estimativa de armadura (kg) | ✅ | `armadura_kg = volume_total * kgArmaduraPorM3` |
| 3.7 | Parâmetros pré-fecho editáveis em tempo real | ✅ | `IcfUnifiedParams` + `useMemo` no painel — recálculo instantâneo |
| 3.8 | Painel com tabela por parede + KPIs | ✅ | `IcfUnifiedQuantitiesPanel` — tabela, badges, cards de resumo |

---

## 4. Revisão Técnica e Persistência

| # | Critério | Estado | Prova / Onde |
|---|----------|--------|--------------|
| 4.1 | Edição inline por linha (comprimento, altura, espessura) | ✅ | `IcfUnifiedQuantitiesPanel.tsx:83-118` — `startEdit` / `commitEdit` |
| 4.2 | Ações Validar / Editar / Remover por parede | ✅ | Botões por linha com ícones `Check`, `Pencil`, `Trash2` |
| 4.3 | "Validar todas" em batch | ✅ | `approveAll()` (`IcfUnifiedQuantitiesPanel.tsx:141-149`) |
| 4.4 | Edição manual eleva confiança para 0.85 | ✅ | `commitEdit()` seta `confianca = max(atual, 0.85)` + `metodo_medicao = 'cota'` |
| 4.5 | Validação manual adiciona tag `[validado_humano]` | ✅ | `approveRow()` concatena `\| [validado_humano]` às notas |
| 4.6 | Persistência em `plan_analysis_versions` | ✅ | `useIcfQuantitiesReview.ts` — `update` na versão com `human_reviewed=true` |
| 4.7 | Evento `revisao_humana_guardada` em logs | ✅ | Insert em `plan_analysis_logs` com `status: success/warning` |
| 4.8 | Notas de revisão opcionais | ✅ | Campo `Textarea` de `reviewNotes` passado no payload |

---

## 5. Regras de Confiança (Gate)

| # | Critério | Estado | Prova / Onde |
|---|----------|--------|--------------|
| 5.1 | Thresholds: ≥0.85 confiável, 0.60–0.85 revisão, <0.60 bloqueado | ✅ | `CONFIDENCE_THRESHOLDS` (`icf-confidence-rules.ts:20-23`) |
| 5.2 | Regras duras: escala DXF por confirmar | ✅ | `__requires_unit_confirmation` → `blockingReasons` |
| 5.3 | Regras duras: parede sem cota (`estimativa_visual`) | ✅ | Contagem de `metodo_medicao === 'estimativa_visual'` |
| 5.4 | Regras duras: parede sem altura útil ≥1.5 m | ✅ | Filtro `!altura_util \|\| altura_util < 1.5` |
| 5.5 | Regras duras: parede com confiança individual <0.60 | ✅ | Filtro `confianca < REVIEW` |
| 5.6 | Badge global no cabeçalho (Confiável / Revisão / Bloqueado) | ✅ | `confidenceBadgeProps()` + Badge no `IcfUnifiedQuantitiesPanel` |
| 5.7 | Botões de orçamento desativados quando `isBlocked=true` | ✅ | `IcfPlantAnalyzer.tsx` — gate aplicado antes de renderizar ações |
| 5.8 | Banner vermelho com razões de bloqueio | ✅ | Banner condicional com `blockingReasons` mapeados |

---

## 6. Integração com Orçamento

| # | Critério | Estado | Prova / Onde |
|---|----------|--------|--------------|
| 6.1 | Criar novo orçamento (rascunho) | ✅ | Modo `"new"` em `IcfPlanToBudgetDialog` + `useIcfPlanToBudget.ts` |
| 6.2 | Adicionar a orçamento existente | ✅ | Modo `"append"` — lista filtrada por obra, exclui adjudicados |
| 6.3 | Capítulos automáticos (paredes ext/int, blocos, betão, armadura, mão de obra) | ✅ | `buildIcfPlanChapters()` (`useIcfPlanToBudget.ts:42-204`) |
| 6.4 | Rastreabilidade `source='axia_icf_planta'` | ✅ | Todos os artigos inseridos com `source: 'axia_icf_planta'` |
| 6.5 | Rastreabilidade `linked_element_id=version_id` | ✅ | `linked_element_id: versionId ?? null` nos artigos |
| 6.6 | Códigos de capítulo/artigo prefixados `ICF_PLANTA_*` | ✅ | `chapter_code: 'ICF_PLANTA'`, `article_code: 'ICF_PLANTA_BLOCO'` etc. |
| 6.7 | Eventos `orcamento_criado` / `orcamento_atualizado` em logs | ✅ | `plan_analysis_logs.insert` em `useIcfPlanToBudget.ts:318-344` |
| 6.8 | Sem clique humano → zero linhas em orçamento | ✅ | Diálogo só abre por clique explícito; botões desativados sem análise |

---

## 7. UX / Stepper e Mensagens

| # | Critério | Estado | Prova / Onde |
|---|----------|--------|--------------|
| 7.1 | Stepper de 7 etapas visível | ✅ | `IcfPlantaStepper.tsx` — Upload → Tipo → Escala → Parâmetros → Revisão → Quantitativo → Orçamento |
| 7.2 | Estados visuais (atual/concluído/bloqueado/pendente) | ✅ | Cores primary/emerald/destructive/muted + ícones |
| 7.3 | Etapa derivada automaticamente do estado | ✅ | `deriveIcfPlantaStep()` — sem fluxo forçado, puramente reativa |
| 7.4 | Catálogo central de mensagens ao utilizador | ✅ | `src/lib/plan-error-messages.ts` — `PLAN_MESSAGES` + `humanizeError()` |
| 7.5 | Mensagens em PT-PT, tom calmo, sem jargão | ✅ | Todas as strings revisadas — "A analisar a planta", "Revisão humana recomendada" etc. |
| 7.6 | Sem paths internos nem PII nas mensagens | ✅ | Regra explícita no cabeçalho do catálogo |
| 7.7 | Mapeamento de erros técnicos para mensagens humanas | ✅ | `ERROR_PATTERNS` — 413, timeout, 401/403, 429, raster, escala |

---

## 8. Auditoria e Logs

| # | Critério | Estado | Prova / Onde |
|---|----------|--------|--------------|
| 8.1 | Snapshot versionado em `plan_analysis_versions` | ✅ | Criado por ambas as edge functions; atualizado na revisão |
| 8.2 | Eventos em `plan_analysis_logs` | ✅ | 9 tipos: `analise_iniciada`, `analise_concluida`, `analise_concluida_com_revisao`, `erro`, `erro_persistencia`, `dados_validados`, `revisao_humana_guardada`, `orcamento_criado`, `orcamento_atualizado` |
| 8.3 | Trilha de auditoria visível no UI | ✅ | `PlanAnalysisAuditTrail.tsx` — últimos 50 eventos, expansível |
| 8.4 | Metadata expansível (totais, origem, etc.) | ✅ | Campo `metadata JSONB` renderizado como `<pre>` quando expandido |

---

## 9. Segurança e Isolamento

| # | Critério | Estado | Prova / Onde |
|---|----------|--------|--------------|
| 9.1 | RLS habilitada em todas as tabelas tocadas | ✅ | `plan_analysis_versions`, `plan_analysis_logs` — RLS ON |
| 9.2 | Políticas por `organization_id` (SECURITY DEFINER) | ✅ | `organization_id = get_user_org_id()` — sem recursão |
| 9.3 | Zero políticas `anon` | ✅ | Confirmado no audit Fase 12 |
| 9.4 | GRANTs para `authenticated` + `service_role` | ✅ | Confirmado no audit Fase 12 |
| 9.5 | Edge functions validam JWT | ✅ | `getUser(token)` em `icf-plant-analysis` e `plan-dxf-parse` |
| 9.6 | Anti-IDOR (cruzamento `file_path → organization_id`) | ✅ | 403 quando import não pertence ao caller |
| 9.7 | Logs sempre scoped por `organization_id` server-side | ✅ | Nunca usa org do request — sempre da BD |
| 9.8 | Zero migrações novas (compatibilidade) | ✅ | Reutilização de colunas TEXT existentes — análises antigas legíveis |

---

## 10. Extensibilidade (preparado para BIM/IFC)

| # | Critério | Estado | Prova / Onde |
|---|----------|--------|--------------|
| 10.1 | Interface `IcfPlantAnalysisResult` extensível | ✅ | Campos prefixados `__*` para metadata interna; arrays principais estáveis |
| 10.2 | Motor de quantitativos desacoplado da origem | ✅ | `buildIcfUnifiedQuantities()` recebe `IcfPlantAnalysisResult` — origem opaca |
| 10.3 | Hook `useIcfPlantAnalysis` com routing por extensão | ✅ | `isDxf = /\.dxf$/i.test(filePath)` — fácil adicionar `.ifc` |
| 10.4 | Versionamento reutilizável para novas fontes | ✅ | `plan_analysis_versions` com `source TEXT` sem CHECK |
| 10.5 | Catálogo de mensagens independente do pipeline | ✅ | `plan-error-messages.ts` — não refere PDF nem DXF explicitamente |

---

## Backlog pós-aceitação (não bloqueante)

| # | Item | Prioridade | Notas |
|---|------|------------|-------|
| B1 | Rate-limit dedicado por org no `plan-dxf-parse` | Baixa | Parser é determinístico (sem custo IA); abuso limitado a 20 MB/ficheiro |
| B2 | Migrar `plan_budget_links` para quantitativos agregados | Média | Atualmente `measurement_id NOT NULL` — requer alteração de schema |
| B3 | `event_type` enum em `plan_analysis_logs` | Baixa | Hoje é `TEXT` — typos possíveis mas controlados no código |
| B4 | Pré-visualização gráfica do DXF (canvas 2D) | Baixa | Fora do pedido original; arquitetura preparada |
| B5 | Classificação de layers ambíguos via IA textual | Média | Gemini Flash para layers não mapeados pelo regex |

---

## Assinatura

- **Checklist elaborado em:** 2026-06-06
- **Fases auditadas:** 1–12
- **Resultado:** ✅ Aprovado — todos os critérios do pedido original satisfeitos.
- **Pronto para:** merge / publicação
