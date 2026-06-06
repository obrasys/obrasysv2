# Auditoria técnica — Módulo Planta / ICF (Fase 1)

Data: 2026-06-06
Âmbito: leitura de plantas (PDF/PNG/JPG), persistência, geração de quantitativos, integração com orçamento e ICF.
Modo: **read-only**. Nenhum ficheiro foi alterado nesta fase.

---

## 1. Mapa do sistema atual

### Frontend
- `src/components/plantas/PlanUploadForm.tsx` — dropzone, aceita `pdf/png/jpg`, máx 25 MB.
- `src/hooks/usePlanImports.ts` — upload para bucket `plan-files`, cria registo em `plan_imports`, calcula `revision_number` por scope.
- `src/components/plantas/PlanAIAnalysis.tsx` — renderiza página do PDF para canvas, downscale, invoca `axia-plan-vision`.
- `src/lib/pdf-to-image.ts` — `renderPdfFirstPageToPngBlob` (pdf.js, worker via cdnjs).
- `src/hooks/useIcfPlantAnalysis.ts` — chama `icf-plant-analysis` e materializa em `icf_panos_parede`/`icf_fundacoes`/`icf_lajes`.
- `src/pages/plantas/{Index,Quantitativos}.tsx` — listagem e revisão.
- `src/pages/icf/AssistenteArquitetura.tsx` — único ponto que pré-converte PDF→PNG antes do upload.

### Backend (edge functions)
- `axia-plan-vision/index.ts` — 835 linhas. Recebe `image_base64` (JPEG), monta tool call com schema enorme (`plan_analysis`), cadeia Gemini Flash → Pro → Flash-Lite.
- `icf-plant-analysis/index.ts` — 551 linhas. Recebe `file_path`, descarrega do storage como service-role, envia ao gateway. Cadeia forçada para Gemini quando MIME é PDF (correção recente).
- `_shared/axia/{model-router,system-prompts,envelope}.ts` — chains e prompts globais.

### Base de dados
- `plan_imports` (file_type: pdf|png|jpg), `plan_pages` (axia_analysis JSON por página, sem versionamento), `plan_floors`, `plan_walls`, `plan_openings`, `plan_rooms`, `plan_measurements`, `plan_placed_elements`, view `plan_quantitativos_v`.
- ICF: `icf_assistant_sessions/items`, `icf_panos_parede`, `icf_vaos`, `icf_fundacoes`, `icf_lajes`, `icf_wall_panels`.
- Logs: `axia_suggestions_log`, `axia_call_logs`.

---

## 2. Problemas encontrados

Severidade: **A = bloqueia leitura**, **B = degrada qualidade ou segurança**, **C = ergonomia / dívida**.

### A — Bloqueios funcionais

| # | Problema | Local | Evidência |
|---|----------|-------|-----------|
| A1 | **Limite de tamanho desalinhado**: frontend aceita 25 MB, `icf-plant-analysis` rejeita > 12 MB com 413. Utilizador faz upload bem-sucedido e depois a análise falha com erro genérico. | `PlanUploadForm.tsx` L46-49, `icf-plant-analysis/index.ts` L276-282 | `MAX_FILE_SIZE = 12 * 1024 * 1024` vs `f.size > 25 * 1024 * 1024`. |
| A2 | **`axia-plan-vision` assume sempre JPEG**: payload hard-coded `data:image/jpeg;base64,...` (L158). Se o cliente enviar PDF base64 (cenário plausível em retries futuros) o modelo Gemini interpreta mal e devolve vazio. Hoje o cliente renderiza para canvas, mas não há defesa no servidor. | `axia-plan-vision/index.ts` L150-161 | MIME hard-coded. |
| A3 | **Sem fallback quando AI devolve `walls=[]`/`rooms=[]`**: o utilizador vê apenas "Não foi possível extrair dados da planta" sem perguntas dirigidas (escala, pé-direito, tipo de folha). | `icf-plant-analysis/index.ts` L508, `PlanAIAnalysis.tsx` | Falta modal "Dados em falta". |
| A4 | **PDF multi-página tratado como página única no fluxo ICF**: `icf-plant-analysis` envia o PDF inteiro; Gemini analisa só a 1ª página de facto e dedup entre páginas não acontece. | `icf-plant-analysis/index.ts` L264-294 | Não há iteração por página. `axia-plan-vision` já trabalha por página, mas ICF não. |
| A5 | **MIME por extensão**: `file_path.endsWith(".pdf")`. Ficheiro renomeado ou sem extensão correta vai como `image/jpeg`. | `icf-plant-analysis/index.ts` L292-294 | Sniffing por bytes em falta. |

### B — Qualidade, segurança e robustez

| # | Problema | Local | Evidência |
|---|----------|-------|-----------|
| B1 | **Sem versionamento de análise**: `plan_pages.axia_analysis` é sobrescrito a cada reanálise. Versão anterior perde-se. Requisito da Fase 8 do plano. | `usePlanAxiaPersistence.ts` L115-125 | `update(...).eq("id", pageId)`. |
| B2 | **`icf-plant-analysis` confia em `file_path` arbitrário**: descarrega via service-role qualquer caminho do bucket `plan-files`. Tem auth+org check para obra, mas não valida se o `file_path` pertence à org/utilizador (IDOR potencial — qualquer user logado de qualquer org pode ler ficheiros de outra org se descobrir o path). | `icf-plant-analysis/index.ts` L264-271 | Não há `select id from plan_imports where file_path=? and organization_id=?`. |
| B3 | **Confiança ignorada no insert ICF**: `useIcfPlantAnalysis.createRecords` insere em `icf_panos_parede` sem ler `confianca` nem `requer_revisao_humana`. Itens de baixa confiança vão diretos para "rascunho" mas sem flag visual. | `useIcfPlantAnalysis.ts` L138-189 | `panoPayload` não tem `confidence`/`requires_review`. |
| B4 | **`espessura_nucleo` no schema da AI [0.1, 0.4] m** — bloqueia paredes finas tipo divisória reais ou paredes muito grossas. Quando a AI estima fora, devolve estrutura corrompida. | `icf-plant-analysis/index.ts` L110-115 | `minimum: 0.1, maximum: 0.4`. |
| B5 | **`axia_suggestions_log` sem `organization_id`**: insere com `user_id` apenas; quebra rastreio por organização. | `axia-plan-vision/index.ts` L802-806 | Falta coluna. |
| B6 | **Sem rate-limit por utilizador/org**: a função aceita pedidos sem throttle. Um PDF grande analisado em loop esgota créditos. | ambas | Sem `axia_call_logs` consultado antes da chamada. |
| B7 | **Worker pdf.js via cdnjs**: dependência externa de CDN. Se cair, todo o upload PDF deixa de pré-renderizar. | `pdf-to-image.ts` L4-6, `usePdfRenderer.ts` | Devia ter fallback local. |
| B8 | **Sem deduplicação entre páginas no fluxo `icf-plant-analysis`**: o dedup só ocorre dentro do mesmo array; PDFs multipágina podem duplicar a mesma parede. | `icf-plant-analysis/index.ts` L41-79 | `dedupeParedes` opera sobre array único. |
| B9 | **Storage policy não auditada nesta fase**: bucket `plan-files` deve ser privado; convém confirmar que policies só permitem `auth.uid()` ler os próprios paths e que admin/edge functions usam service role (relacionado com B2). | `mem://security/storage-policy-plan-files-standard` | A verificar nas migrações. |

### C — Ergonomia, dívida e preparação futura

| # | Problema | Local |
|---|----------|-------|
| C1 | Mensagens de erro dispersas e técnicas ("AI_STRUCTURED_OUTPUT_TRUNCATED", "Erro na análise: ..."). Catálogo único em falta. | toda a árvore |
| C2 | Sem indicador de etapa (stepper). UI atual mistura upload + revisão + mapeamento em tabs sem onboarding. | `Quantitativos.tsx` |
| C3 | Sem suporte DXF em frontend, backend ou DB (requisito Fase 3-5). | tudo |
| C4 | Logs técnicos por análise (`plan_analysis_logs`) inexistentes; só há `axia_call_logs` agregado. | DB |
| C5 | `hasMinimumFields` interno à edge function; sem cobertura de teste. | `axia-plan-vision/index.ts` |
| C6 | Frontend não distingue claramente "PDF rasterizado" de "PDF vetorial" — não avisa o utilizador. | `PlanUploadForm.tsx` |
| C7 | `MAX_BYTES` para imagem (12 MB) muito alto para downscale interno do gateway; muitas vezes o gateway responde mais rápido com 6-8 MB. | `axia-plan-vision/index.ts` L55 |
| C8 | Sem teste end-to-end do fluxo "upload PDF → análise → quantitativo → orçamento". | `src/test/` |

---

## 3. Casos-limite que falham hoje

1. **PDF sem escala nem cotas** → AI devolve `walls=[]` ou comprimentos inventados < 0.45 confidence; sem prompt para o utilizador calibrar.
2. **PDF rasterizado de baixa qualidade** → AI devolve `image_quality=baixa` mas o utilizador não vê aviso destacado.
3. **PDF > 12 MB** → upload OK, análise 413, mensagem genérica.
4. **Planta com folha de cortes/alçados** → prompt instrui a devolver arrays vazios, mas o utilizador não percebe porque é que "não há nada".
5. **Reanálise** → perde a versão anterior em silêncio.
6. **Ficheiro renomeado (`planta.bin`)** → MIME inferido como JPEG, gateway falha.
7. **Múltiplas páginas** → ICF analisa só a 1ª; vision analisa por página mas sem agregação entre páginas.

---

## 4. Correções recomendadas (preparam a Fase 2)

Agrupadas por entrega — todas aditivas, sem quebrar API atual.

### Lote 2.1 — Alinhamentos rápidos
- Alinhar `MAX_FILE_SIZE` (subir backend para 25 MB **ou** baixar frontend para 12 MB com mensagem clara; recomendo subir backend para 20 MB + sugerir "uma planta por piso" acima de 12 MB).
- Adicionar **sniff de MIME por bytes** (`%PDF-` → pdf, `89 50 4E 47` → png, `FF D8 FF` → jpg) em `icf-plant-analysis` antes de decidir o `mimeType`.
- Defensivo em `axia-plan-vision`: aceitar `image_mime` opcional no body e fallback `image/jpeg`.
- Insert em `axia_suggestions_log` com `organization_id`.

### Lote 2.2 — Segurança
- Em `icf-plant-analysis`, validar que `file_path` corresponde a um `plan_imports` cuja `organization_id` é a do utilizador autenticado (fecha B2).
- Verificar e, se necessário, reforçar policies do bucket `plan-files` (escreve uma migração separada se faltar algo — fica para Fase 12).
- Throttle simples (max N pedidos/min/org) lendo `axia_call_logs`.

### Lote 2.3 — Qualidade da leitura PDF
- Relaxar limites do schema ICF (`espessura_nucleo` 0.05–0.6 m).
- Propagar `confianca` / `requer_revisao_humana` para `icf_panos_parede` (adicionar 2 colunas via migração: `confidence numeric`, `requires_review bool`).
- No frontend, modal **"Dados em falta para calcular com segurança"** com: escala, pé-direito, ICF ext/int, espessura bloco, descontar vãos, fundações, tipo de folha.
- Mensagem destacada quando `image_quality === "baixa"` ou `walls.length === 0`.

### Lote 2.4 — Versionamento e logs
- Nova tabela `plan_analysis_versions` (plan_import_id, page_id, version_number, payload jsonb, model, created_at, created_by, organization_id) — guarda histórico, `plan_pages.axia_analysis` continua a ser o "current".
- Nova tabela `plan_analysis_logs` (mesmas FKs + status, error_code, duration_ms, input_bytes, model, output_summary) — auditoria por análise.
- RLS por `organization_id` + GRANTs `authenticated`/`service_role`.

### Lote 2.5 — Catálogo de mensagens
- `src/lib/plan-error-messages.ts` central, mapeando `AI_STRUCTURED_OUTPUT_TRUNCATED → "Esta planta é muito densa para uma única análise. Divida por piso ou tente de novo."`, etc.

---

## 5. Riscos abertos (pontos que precisam revisão humana)

1. **Migrações**: confirmar `plan_imports.file_type` (TEXT vs enum) antes de adicionar `'dxf'`.
2. **Storage policies**: a auditoria desta fase não correu queries — assumi os defaults documentados em memória. Validar com `supabase--linter` antes do lote 2.2.
3. **Custo Gemini Pro**: forçar Pro para todos os PDFs aumenta custo. Manter Flash como primeiro e Pro como fallback é alternativa — discutir.
4. **Compatibilidade `plan_quantitativos_v`**: estender a view para incluir origem `dxf` precisa migração coordenada com hooks.

---

## 6. Próximo passo

Confirmas avançar para a **Fase 2 (lotes 2.1 → 2.5 acima)** ou queres que ajuste prioridades?

Sugiro a ordem:
1. Lote 2.1 (rápido, descansa o fluxo) — ~30 min
2. Lote 2.2 (segurança) — ~45 min
3. Lote 2.3 (qualidade) — ~1h
4. Lote 2.4 (versionamento) — ~1h, inclui migração
5. Lote 2.5 (mensagens) — ~20 min

Depois passamos para a Fase 3 (suporte DXF no frontend).
