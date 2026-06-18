# Plano: Corrigir truncamento da Axia no módulo Planta/ICF

## Diagnóstico

A análise da planta em `supabase/functions/axia-plan-vision/index.ts` faz uma única chamada multimodal pedindo um JSON estruturado enorme (sheet_classification + dimensions + rooms + elements + walls + openings + exterior_elements + reading_quality + limitations + summary). Com `max_tokens` apenas **4000** (tool mode) ou **6000** (json mode), Gemini corta a resposta (`finish_reason=length`) — o parser falha e a planta volta vazia. Além disso a cadeia de fallback termina em `google/gemini-2.5-flash-lite`, que é o pior modelo para esta tarefa técnica densa. `icf-plant-analysis/index.ts` tem o mesmo padrão monolítico.

## Mudanças (apenas backend de análise — sem mexer no UI)

### 1. Token budget e timeout (axia-plan-vision + icf-plant-analysis)
- `tokenLimit()`: subir para `16000` (json) / `12000` (tool) por chamada em modelos Gemini Pro/Flash, mantendo `4000`/`6000` apenas na etapa de classificação.
- Subir `HARD_DEADLINE_MS` de 140s para o máximo seguro (~150s do edge runtime) e aumentar `timeoutMs` das tentativas Pro para 90s.
- Antes de gravar, exigir `finish_reason === "stop" | "tool_calls"`. Se vier `length` → tratar como truncado e seguir para fallback compacto/etapas.

### 2. Validação robusta de JSON
- Após `parseJsonWithRepair`, validar braces/brackets balanceados e ausência de padrões `...`/`[truncated]` (helper novo `detectTruncation`).
- Se truncado/incompleto: **não gravar** como `final`, devolver `{ success:false, error.code:"AI_STRUCTURED_OUTPUT_TRUNCATED", message:"A análise ficou demasiado extensa e precisa ser processada em etapas." }` e registar em `axia_call_logs` com `status="truncated"` + `error_message` (motivo: truncated / invalid_json / timeout).
- Acrescentar status `"truncated"` ao enum usado em `persistCallLog`.

### 3. Análise em etapas (novo pipeline "staged")
Quando a chamada monolítica truncar OU quando `approxBytes > 3.2MB` (planta densa) OU `high_res_retry`, partir para pipeline:
- **Etapa 1 — Classificação**: `gemini-2.5-flash-lite`, schema mínimo (`sheet_classification`, `scale_detected`, `reading_quality`). ~1500 tokens.
- **Etapa 2 — Elementos construtivos**: `gemini-2.5-pro`, schema só com `elements`, `walls`, `openings`. ~10000 tokens.
- **Etapa 3 — Medidas/cotas/áreas/vãos/observações**: `gemini-2.5-pro`, schema só com `dimensions`, `rooms`, `exterior_elements`, `limitations`, `validation_questions`. ~10000 tokens.
- **Etapa 4 — Quantitativos**: reaproveitar `plan-quantitativos-engine.ts` já existente sobre o output consolidado (sem nova chamada AI).
- **Etapa 5 — Consolidação**: merge em memória num único JSON conforme o schema actual; passa por `normalizeAnalysis` + `hasMinimumFields` antes de devolver.
- Para PDFs multi-folha em `icf-plant-analysis`: processar 1 folha por chamada e consolidar.

### 4. Prompt da Axia (systemPrompt em axia-plan-vision e icf-plant-analysis)
Adicionar regras explícitas:
- "Devolve APENAS JSON válido e fechado. Sem markdown, sem texto antes/depois."
- "Usa `null` quando a informação não existir; nunca inventes."
- "Observações em máximo 80 caracteres; nunca repetir dados de outros campos."
- "Não repetir entradas em arrays — uma parede/dimensão por ID lógico."
- "Se faltar espaço, prioriza fechar o JSON em vez de continuar a listar."

### 5. Fallback em cascata
Nova cadeia em `attempts`:
1. `gemini-2.5-pro` tool mode, 90s, token budget alto (monolítico).
2. Se truncar → `gemini-2.5-pro` json mode compacto (mesmo schema, prompt reforçado "responde no menor número de tokens possível").
3. Se truncar de novo → pipeline staged (etapas 1–5 acima).
4. Para multi-folha → loop folha-a-folha.
- `flash-lite` deixa de ser tentativa final para vision crítica; fica reservado apenas à Etapa 1 (classificação).

### 6. Troca de modelo principal
- `axia-plan-vision`: `visionChain.primary` passa a `google/gemini-2.5-pro` (já é o fallback hoje); `fallback` passa a `google/gemini-2.5-flash`.
- `icf-plant-analysis`: idem na sua `chain`.
- Manter as overrides via `AXIA_MODEL_CRITICAL_VISION_ANALYSIS_PRIMARY/_FALLBACK`.

### 7. Telemetria
- Em cada tentativa: logar `model`, `mode`, `finish_reason`, `output_tokens`, `truncated:boolean`, `stage` ("monolithic" | "classification" | "elements" | "measures" | "consolidation").
- Persistir `stage` num novo campo (opcional) ou concatenar em `error_message` quando não houver coluna.

## Ficheiros tocados
- `supabase/functions/axia-plan-vision/index.ts` — token budget, detecção truncamento, prompt, cadeia de fallback, novo pipeline staged.
- `supabase/functions/icf-plant-analysis/index.ts` — mesmas mudanças + loop folha-a-folha.
- `supabase/functions/axia-classify-sheets/index.ts` — alinhar prompt compacto (sem reescrita estrutural).
- `src/hooks/usePlanQuantitativos.ts` / `useSheetClassification.ts` / `PlanMeasurementAxiaPanel.tsx` — só tratar novo erro `AI_STRUCTURED_OUTPUT_TRUNCATED` para mostrar a mensagem "A análise ficou demasiado extensa e precisa ser processada em etapas." (UI mínima, sem redesenho).

## Fora de scope
- Não alterar schema das tabelas.
- Não mexer em outros módulos Axia (chat, budget, foundation, mce).
- Sem mudanças no layout/visual do módulo Planta.
