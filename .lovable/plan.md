# Planta / Leitura Assistida — Plano de Implementação

Módulo novo, aditivo, dentro do fluxo existente de Obras. Reaproveita componentes já existentes (`PlanUploadForm`, `usePlanAnalysisAudit`, `usePdfRenderer`, `useDxfRenderer`, `useIcfPlantAnalysis`) e introduz uma nova camada de "Leitura Assistida" estruturada por folha, com pipeline Axia em JSON estruturado e exportação rastreável para orçamento.

## 1. Escopo desta fase

Implementar a página, schema, edge function de análise e ligação ao orçamento. Excluímos desta fase: edição vetorial avançada (medições manuais com ferramentas tipo CAD), DXF interativo (será apenas viewer básico reutilizando `useDxfRenderer`), pacotes drag-and-drop entre capítulos (aba Pacotes será editável mas simples).

Critérios de aceitação cobertos integralmente: validação 20MB / formatos, split de PDF por folha, classificação Axia, estados por item, aprovação/edição/ignorar, reprocessar folha, envio só de aprovados, rastreabilidade no orçamento, RLS multi-tenant.

## 2. Rota e navegação

- Nova rota: `/obras/:obraId/planta-leitura` (dentro da obra, consistente com `/obras/:id/plantas` existente).
- Entrada secundária no Dashboard "Analisar planta" continua a apontar para `/obras` (já corrigido); dentro da obra, novo card no menu lateral da obra: **Planta / Leitura Assistida**.
- Não substitui o módulo `/plantas` atual nem o ICF — coexiste.

## 3. Layout (desktop ≥1024px)

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ Resumo: Confiança média │ Extraídos │ Rever │ Aprovados │ Folhas 2/4      │
├──────────────────────────────────────────────┬────────────────────────────┤
│ Toolbar: módulo · ficheiro · PÁG 2/4 · ESC   │ Extração assistida         │
│         1:100 · sync · zoom- + fit · pan ·   │ [IA + Humano]              │
│         select · medir · grelha · pins       │ ficheiro · data · user     │
├──────────────────────────────────────────────┤ folha · tipo · confiança   │
│                                              │ [Aprovar todos][Auto-fix]  │
│              VIEWER (canvas)                 │ [Substituir][Reprocessar]  │
│         grelha + planta + pins               │ Tabs: Elementos · Pacotes  │
│         (~70% largura)                       │       · Histórico          │
│                                              │ lista de itens (scroll)    │
│                                              │ ────────────────────────── │
│                                              │ [Enviar para Orçamento]    │
└──────────────────────────────────────────────┴────────────────────────────┘
```

- Tablet: painel lateral recolhível (Sheet).
- Mobile: tabs no topo (Folhas · Elementos · Viewer); viewer simplificado.

## 4. Banco de dados (migração única)

7 tabelas novas, todas com `organization_id`, RLS estrita via `has_role` / membership existente, GRANTs explícitos para `authenticated` e `service_role`.

- `plant_files` — ficheiro carregado, status (uploaded/processing/ready/error), total_sheets.
- `plant_sheets` — uma linha por folha; sheet_index, discipline, floor_level, scale, image_path, status, confidence.
- `plant_elements` — elementos extraídos; code, category, description, quantity, unit, dimensions_json, coordinates_json, confidence, status (ok/review/approved/edited/ignored/error/proposed), read_method, validation_required, budget_chapter_suggestion, budget_item_suggestion.
- `plant_element_reviews` — auditoria de ações (approve/edit/ignore) com old/new JSON.
- `plant_budget_exports` — uma linha por envio para orçamento; budget_id, items_exported, status.
- `plant_processing_logs` — passos do pipeline (preprocess/classify/extract/validate).
- Coluna nova em `artigos_orcamento`: `plant_source_json jsonb` (file_id, sheet_id, element_id, confidence, approved_by, approved_at) — opcional, para rastreabilidade.

Storage: bucket privado `plant-files` (criar via tool) com policy por `organization_id`.

## 5. Edge functions

- `plant-process` — recebe `plant_file_id`. Para PDF: usa `pdfjs-dist` em Deno para extrair páginas como imagens, escreve em storage, cria `plant_sheets`. Para imagem: cria 1 folha. Para DXF: cria 1 folha sem imagem (viewer client-side).
- `plant-axia-analyze` — recebe `plant_sheet_id`. Chama Lovable AI Gateway (`google/gemini-2.5-pro` para visão) com o prompt definido na spec, valida JSON com Zod, faz upsert em `plant_elements`, escreve logs, atualiza confidence/status da folha.
- `plant-axia-autofix` — recebe `plant_sheet_id`. Heurísticas: deduplicação por code+bbox próximo, normalização de unidades (m²/m2 → m²), categorização de itens órfãos via dicionário, merge de descrições semelhantes (Levenshtein).
- `plant-export-budget` — recebe `plant_file_id`, `budget_id` (ou cria novo), lista de `element_ids` aprovados. Cria/atualiza `capitulos_orcamento` e `artigos_orcamento` com `plant_source_json`. Insere `plant_budget_exports` e marca elementos como `sent_to_budget`.

Todas com CORS, validação Zod, JWT check em código, e respeitando RLS via `service_role` apenas para escritas auditadas.

## 6. Frontend (componentes novos em `src/components/planta-leitura/`)

- `PlantaLeituraPage.tsx` (página em `src/pages/obras/PlantaLeitura.tsx`).
- `PlantUploadZone.tsx` — drag-and-drop, valida 20MB e extensão antes do upload, mensagens da spec.
- `PlantSummaryCards.tsx` — 5 KPIs no topo.
- `PlantViewerToolbar.tsx` — barra com info + botões.
- `PlantViewer.tsx` — `react-konva` (já no projeto) com camada de imagem, grelha, pins coloridos por categoria, tooltip, sincronização bidirecional com painel.
- `PlantReviewPanel.tsx` — header IA+Humano, ações principais.
- `PlantElementsList.tsx` (aba Elementos) — itens com aprovar/editar/ignorar.
- `PlantPackagesList.tsx` (aba Pacotes) — agrupa por `budget_chapter_suggestion`, permite reatribuir capítulo via Select.
- `PlantHistoryList.tsx` (aba Histórico) — lê `plant_processing_logs` + `plant_element_reviews`.
- `PlantExportToBudgetModal.tsx` — confirmação, escolha de obra (já fixada), orçamento novo/existente, resumo, aviso da spec.
- `PlantSheetSelector.tsx` — chips/dropdown para alternar folha.

Hooks novos: `usePlantFiles`, `usePlantSheets`, `usePlantElements`, `usePlantProcessing` (com realtime via Supabase channel), `usePlantExport`.

Realtime: inscrever em `plant_sheets` e `plant_elements` por `plant_file_id` para refletir progresso do pipeline ao vivo.

## 7. Pipeline Axia — contrato JSON

Edge function `plant-axia-analyze` envia para Gemini Vision a imagem da folha + o prompt da spec literal. Schema Zod no servidor valida exatamente os campos pedidos (`file_summary`, `sheet`, `elements[]`, `warnings`, `suggestions`). Itens com `confidence < 0.85` → `status='review'`; `read_method='inferred'` → `status='proposed'` + `requires_human_validation=true`. Erros de parse JSON → re-tentativa única com mensagem `"Responda apenas JSON válido conforme schema"`.

## 8. Segurança e permissões

- RLS: SELECT/INSERT/UPDATE/DELETE só para membros da `organization_id` via função `is_org_member(_org uuid)` (já existe padrão no projeto — reaproveitar `has_role`/membership).
- Papéis: `admin`, `gestor_obra`, `orcamentista` → tudo. `tecnico` → carregar/rever (sem export). `viewer` → SELECT. `cliente`/`fornecedor` → bloqueado (sem policy para eles).
- Anti-IDOR: edge functions validam `organization_id` do JWT vs registo antes de qualquer escrita.
- Validação Zod em todas as edge functions; tamanho/extensão validados client + server.

## 9. Fases de entrega (commits incrementais)

1. Migração DB + bucket storage + GRANTs + RLS.
2. Edge function `plant-process` (split PDF, criação de sheets).
3. Edge function `plant-axia-analyze` + Zod schema.
4. Página + upload + summary cards + sheet selector + viewer básico com imagem + grelha.
5. Painel lateral com aba Elementos (aprovar/editar/ignorar) + sincronização viewer↔lista.
6. Auto-fix + Reprocessar + Substituir ficheiro.
7. Abas Pacotes e Histórico.
8. Modal "Enviar para Orçamento" + edge function `plant-export-budget` + rastreabilidade em `artigos_orcamento`.
9. Responsivo mobile/tablet + estados vazios/erro + mensagens da spec.

## 10. Fora do escopo desta fase

- Edição vetorial avançada (medições com ferramentas CAD reais) — botão "medir manualmente" fica visível mas abre tooltip "Em breve".
- Render interativo de DXF com pins — DXF aceita upload, viewer mostra wireframe básico via `useDxfRenderer`, pins são listados no painel sem sobreposição visual.
- Drag-and-drop entre pacotes — reatribuição via Select.

## Confirmação

Confirma este plano e começo pela migração da base de dados?
