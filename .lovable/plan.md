
# Evolução Incremental do Módulo ICF — Plano em 3 Fases

Princípios transversais:
- **Não remover nem reescrever** lógica ICF existente (Configuração, Panos, Fundações, Lajes, Resumo, Manual, MapaVisualPanos, AssistenteArquitetura, motor de composição já existente).
- Reaproveitar tabelas e tipos atuais (`icf_block_library`, `icf_wall_panels`, `icf_assistant_sessions`, `icf_panos_parede`, etc.).
- Multi-tenant via `organization_id`/`empresa_id` + RLS + GRANTs no padrão do projeto.
- Axia sempre como **assistida** (`confidence`, `review_required`, `issues`), nunca executiva.
- UI: Deep Teal, cards `rounded-xl`, abas com scroll horizontal em mobile, padrão Obra Sys.

---

## FASE 1 — Fundação (Biblioteca + Seletor de Modo)

### 1.1 Biblioteca Técnica HOMEBLOCK (SVGs)
- Receber os 7 SVGs anexados pelo utilizador e gravar em `public/icf/homeblock/` (nomes conforme spec).
- Página `BibliotecaTecnica.tsx` **já existe**: estender card (`ICFBlockCard`) para renderizar SVG via `<img>`/`<object>` seguro (sem `dangerouslySetInnerHTML`) e abrir modal com zoom básico (wheel + +/−).
- Novo componente `ICFBlockSvgViewer.tsx` (modal com zoom/reset).
- Seed/atualização dos 7 itens HOMEBLOCK em `icf_block_library` via `supabase--insert` (não migration — só dados), mantendo `system_seed = true` e `empresa_id = NULL` (catálogo global).

### 1.2 Seletor de Modo de Análise ICF
- Novo componente `ICFAnalysisModeSelector.tsx` exibido como dialog/page inicial ao criar nova análise ICF (entry point a partir de `icf/Index.tsx` e da página da obra).
- 3 opções: **Planta Arquitetónica para ICF** (ativa), **Projeto ICF Completo** (ativa em F2), **Modelo IFC/BIM** (desativada — "Em breve").
- Opção 1 → encaminha para `AssistenteArquitetura.tsx` existente (com calibração já implementada). **Reaproveitamento puro, sem fluxo paralelo.**
- Opção 2 → encaminha para nova rota `/icf/dossier/novo` (F2).

### 1.3 Tipo `ICFAnalysisMode` e marcação de origem
- Adicionar coluna `analysis_mode` (`text`, default `'architectural_to_icf'`) em `icf_assistant_sessions` para distinguir origem; sessões antigas mantêm default.

**Entregáveis F1:** seletor funcional, biblioteca técnica com SVGs reais e modal de zoom, seed HOMEBLOCK aplicado, modo arquitetónico ligado ao seletor sem regressão.

---

## FASE 2 — Modo "Projeto ICF Completo" + Dossiê Técnico

### 2.1 Schema (migration única)
Novas tabelas (todas com `organization_id`, GRANTs, RLS, policies `auth.uid()`-scoped via org membership — mesmo padrão de `icf_assistant_sessions`):

- `icf_project_analyses` — `id, organization_id, obra_id, user_id, mode, title, status, system_code, created_at, updated_at`. Status enum: `draft | uploading | classifying_documents | extracting_data | crosschecking | review_required | validated | sent_to_budget`.
- `icf_project_documents` — `id, analysis_id, organization_id, file_name, file_path, file_type, declared_category, axia_detected_category, page_number, confidence, review_required, notes`.
- `icf_project_checklist_items` — `id, analysis_id, organization_id, key, label, status, confidence, notes` (status: `found | missing | partial | manual_required`).
- `icf_project_issues` — `id, analysis_id, organization_id, severity, category, title, description, related_wall_panel_id, related_document_ids jsonb, resolution_status`.
- `icf_analysis_snapshots` — `id, analysis_id, organization_id, version, status, summary_json jsonb, wall_panels_json jsonb, composition_json jsonb, issues_json jsonb, created_at, created_by`.

Reutilizar `icf_wall_panels` existente para os panos (já tem `source: 'axia' | 'manual' | 'corrigido'`, `confidence`, `openings`, `composition_result`).

Storage: bucket privado **já existente** `plan-files` é reaproveitado (não criar novo) — pasta `icf-dossier/{analysis_id}/`.

### 2.2 Edge Function `icf-complete-project-analyzer`
- Recebe `{ analysis_id, document_ids[] }`.
- Para cada documento: download → `data:` URL (padrão já usado em `icf-architecture-assistant`) → chamada Gemini 2.5 Pro via Lovable AI Gateway.
- Prompt da spec (secção 16), output JSON estruturado por tool-calling (`AxiaCompleteICFProjectOutput`).
- Persistência transacional: docs classificados, checklist gerado, panos criados em `icf_wall_panels`, issues registadas.
- Validações Zod no body; rate limit / 402 / 429 propagados ao cliente.

### 2.3 UI — Dossiê Técnico ICF
Nova página `src/pages/icf/Dossier.tsx` (rota `/icf/dossier/:id`) com abas (apenas as desta fase):

```
[Resumo] [Documentos] [Checklist] [Panos]
```

Componentes novos:
- `ICFCompleteProjectUpload.tsx` — upload múltiplo com categoria declarada por ficheiro.
- `ICFDossierSummaryTab.tsx` — KPIs (sistema, pisos, panos, aberturas, confiança média, pendências).
- `ICFDocumentsTab.tsx` + `ICFDocumentClassifierBadge.tsx` — lista, comparação categoria declarada vs Axia, corrigir categoria.
- `ICFChecklistTab.tsx` — itens com estados visuais (found/partial/missing/manual_required).
- `ICFWallPanelsTab.tsx` + `ICFWallPanelCard.tsx` + `ICFWallPanelDetailsDrawer.tsx` — listar P01…, separar por piso, editar dimensões/aberturas, confirmar/excluir.
- `ICFIssueList.tsx` — lista de issues filtrável por severidade.

Hooks:
- `useIcfProjectAnalysis(id)`, `useIcfProjectDocuments`, `useIcfChecklist`, `useIcfProjectIssues`, `useUploadIcfDocuments`, `useClassifyDocuments` (invoca edge function).

**Entregáveis F2:** criar análise → upload multi-categoria → Axia classifica → checklist + panos + issues → utilizador corrige/confirma panos. Sem composição/manual/orçamento ainda.

---

## FASE 3 — Composição, Visualização, Manual, Orçamento, Snapshots

### 3.1 Composição HOMEBLOCK
- Motor `src/lib/icf-homeblock-composition.ts` **já existe** e cobre 80% da spec (`calculateICFWallComposition`). Estender para:
  - Acessórios (topo + espaçador) configuráveis por sistema (HB-220 → HB-TOPO-220 + HB-ESP-220; HB-300 → derivar).
  - Helper `composeAllPanelsForAnalysis(analysisId)` que itera panos confirmados/corrigidos.
- Nova aba `ICFHomeblockCompositionTab.tsx` + `ICFCompositionSummary.tsx` no dossiê.

### 3.2 Mapa Visual dos Panos
- Componente `ICFWallPanelVisualizer.tsx` **já existe** — reaproveitar e integrar dentro do `ICFWallPanelDetailsDrawer` e em vista de mapa agregada (grid de panos por piso).

### 3.3 Modelo Isométrico (esquemático)
- Componente `ICFIsometricModelViewer.tsx` novo — SVG 2.5D simples:
  - Panos enfileirados por piso, sem coordenadas reais.
  - Altura/comprimento proporcionais, aberturas como recortes, cor por estado.
  - Filtro por piso, toggle de panos excluídos, aviso "estimativa".
- Tipo `ICFWallSegmentGeometry` derivado dos panos (sem XY real).

### 3.4 Manual Técnico ICF Dinâmico
- Nova aba `ICFManualTab.tsx` agregando: identificação, sistema, docs, checklist, panos, composição, cortes, aberturas, isométrico, materiais, pendências, aviso legal.
- Botão "Preparar relatório" → render HTML pronto para `window.print()` (sem jsPDF agora; preparar estrutura para PDF futuro reaproveitando engine vetorial existente).

### 3.5 Envio para Orçamento + Snapshot
- Aba `ICFBudgetTab.tsx` + dialog `ICFBudgetSendDialog.tsx`.
- Reaproveitar fluxo de envio para orçamento já existente no módulo ICF (`useIcfBudget`, `useIcfBudgetSnapshot`).
- Regras de bloqueio: só panos `validado`/`corrigido` entram silenciosamente; `em_revisao` exige confirmação; `excluido` ignorado.
- Capítulo "Sistema ICF / HOMEBLOCK" com artigos pré-mapeados aos códigos da biblioteca.
- Ao validar ou enviar → criar registo em `icf_analysis_snapshots` (versão incremental por análise).

### 3.6 Testes mínimos (Vitest)
- `icf-homeblock-composition.test.ts` **já existe** — adicionar casos: HB-300, sobra horizontal, remate superior, desconto por aberturas.
- `icf-project-checklist.test.ts` — geração de checklist com mapa de vãos em falta gera issue.
- `icf-analysis-mode.test.ts` — seletor encaminha rotas corretamente.

**Entregáveis F3:** dossiê completo com 8 abas, composição automática, mapa visual + isométrico, manual imprimível, envio para orçamento com snapshot versionado.

---

## Detalhes Técnicos

### Rotas novas
- `/icf/dossier/novo` — seletor + upload (F2)
- `/icf/dossier/:id` — dossiê com abas (F2/F3)

### Padrões de segurança aplicados
- Todas as edge functions: Zod + JWT validation + CORS shared + 402/429 surfaced.
- RLS via `is_member_of_organization(auth.uid(), organization_id)` (padrão do projeto).
- GRANT block obrigatório por tabela nova: `authenticated` (CRUD scoped por RLS) + `service_role` (ALL). Sem `anon`.
- Storage: bucket privado, paths prefixados com `organization_id`.

### Memória a criar após F3
- `mem://features/icf/dossier-completo` — arquitetura do dossiê e fluxo das 8 abas.
- `mem://features/icf/biblioteca-homeblock` — fonte de medidas e uso dos SVGs como referência visual.

### ASCII — fluxo geral

```text
[Nova Análise ICF]
        |
        v
[ICFAnalysisModeSelector]
    /        |              \
   v         v               v
[Arq->ICF] [Projeto Completo] [IFC/BIM]
(existente)        |          (desativado)
                   v
            [Upload multi-doc]
                   v
       [Edge: icf-complete-project-analyzer]
                   v
   [Dossiê: Resumo|Docs|Checklist|Panos|Composição|Isométrico|Manual|Orçamento]
                   v
            [Snapshot + Envio Orçamento]
```

---

## Confirmação para arrancar

Após aprovação, começo pela **Fase 1**: aguardo o upload dos 7 SVGs HOMEBLOCK, implemento seletor + viewer + seed, e só avanço para F2 com nova aprovação.
