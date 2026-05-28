## Objetivo

Reduzir alucinações da Axia introduzindo uma **camada central de seleção de modelo + validação de output**, sem reescrever edge functions existentes nem remover funcionalidades.

## Arquitetura

```text
Edge Function (existente)
   │
   ├─► supabase/functions/_shared/axia/model-router.ts   ← escolhe modelo por task_type
   ├─► supabase/functions/_shared/axia/ai-client.ts      ← chama Lovable AI Gateway (+ retry/fallback)
   ├─► supabase/functions/_shared/axia/schemas.ts        ← Zod schemas do envelope técnico
   ├─► supabase/functions/_shared/axia/validator.ts      ← valida JSON, unidades, somatórios, confiança
   └─► supabase/functions/_shared/axia/envelope.ts       ← normaliza resposta + flags review_required
```

Tudo é opt-in: cada função existente passa a chamar `runAxiaTask({ task_type, prompt, context, schema })` em vez de fazer `fetch` direto ao gateway. Comportamento atual mantém-se até cada função ser migrada.

## 1. ModelRouter (`_shared/axia/model-router.ts`)

Mapa `task_type → { primary, validator?, fallback }`, com override por env var `AXIA_MODEL_<TASK_TYPE>`:

| task_type | primary | validator | fallback |
|---|---|---|---|
| `critical_vision_analysis` (plan-vision, specialty-vision, icf-plant-analysis) | openai/gpt-5.5 | openai/gpt-5.5 | google/gemini-2.5-pro |
| `plan_measurements` | openai/gpt-5.5 | openai/gpt-5.5 | google/gemini-2.5-pro |
| `budget_import` (organize-budget-import) | openai/gpt-5.5 | — | google/gemini-2.5-flash |
| `budget_validation` (validate-budget-ai, budget-ai-engine) | openai/gpt-5.5 | openai/gpt-5.5 | google/gemini-2.5-pro |
| `close_sheet_analysis` | openai/gpt-5.5 | — | google/gemini-2.5-pro |
| `icf_analysis` (icf-architecture-assistant, icf-complete-project-analyzer) | openai/gpt-5.5 | openai/gpt-5.5 | google/gemini-2.5-pro |
| `specialties_analysis` (axia-electrical-analysis, axia-specialty-vision) | openai/gpt-5.5 | — | google/gemini-2.5-pro |
| `simple_chat` (axia-chat, support-chat) | openai/gpt-5.4-mini | — | google/gemini-2.5-flash |
| `classification` / `summary` / `suggestions` / `rephrase` | openai/gpt-5-nano | — | google/gemini-2.5-flash-lite |
| `fallback` | google/gemini-2.5-flash | — | — |

Validator só corre se `primary.confidence_score < 0.85` ou se `review_required=true` no primeiro pass — economiza custo.

## 2. Envelope técnico obrigatório (`_shared/axia/schemas.ts`)

Zod schema para **toda resposta técnica**:

```ts
{
  confidence_score: number (0..1),
  review_required: boolean,
  assumptions: string[],
  missing_data: string[],
  warnings: string[],
  calculation_basis: string[],
  extracted_items: unknown[],   // schema específico por task_type
  source_reference: { page?, zone?, room?, sheet? }[]
}
```

Pedido ao modelo via **tool calling** (não "responda em JSON"), conforme guideline Lovable AI, garantindo JSON válido.

## 3. Validador backend (`_shared/axia/validator.ts`)

Depois da chamada ao modelo:
1. Parse Zod do envelope → se falhar, 1 retry com mensagem de correção; senão `review_required=true` + warning.
2. Verifica unidades coerentes (m, m², m³, un, kg, h).
3. Detecta duplicações em `extracted_items` (hash de referência+dimensão).
4. Recalcula somatórios declarados em `calculation_basis`.
5. Aplica regras de confiança:
   - `confidence_score < 0.75` → `review_required = true`
   - `confidence_score < 0.55` → `block_auto_submit = true` (campo extra adicionado pelo validator)
6. Persiste sempre com `status = 'draft_ai'` nas tabelas que já têm coluna de estado (plan_*, icf_*, orcamento_items via flag). Onde ainda não existe coluna, plano cria migration mínima `status text default 'draft_ai'` + `ai_meta jsonb`.

## 4. Regras anti-alucinação (system prompt partilhado)

`_shared/axia/system-prompts.ts` injeta bloco fixo em todas as tasks técnicas:
- proibido inventar medidas/preços/materiais/quantidades
- ausência → `missing_data`
- estimativa → marcar e justificar em `calculation_basis`
- sem escala fiável → pedir calibração (`warnings`)
- cotas vs desenho divergentes → prevalece cota, `review_required=true`

## 5. Migração incremental (sem breaking changes)

Ordem proposta (cada item = 1 PR pequeno):
1. Criar `_shared/axia/*` + testes Deno (router, validator, envelope).
2. Migrar `axia-plan-vision` e `icf-plant-analysis` (já em timeout, ganho imediato).
3. Migrar `validate-budget-ai` + `budget-ai-engine` com validator duplo.
4. Migrar `organize-budget-import` e `analyze-caderno`.
5. Migrar `axia-specialty-vision`, `axia-electrical-analysis`, `icf-architecture-assistant`, `icf-complete-project-analyzer`.
6. Migrar chats leves (`axia-chat`, `support-chat`, `axia-suggestions`, `axia-plan-suggestions`) para modelos mini.
7. Para tarefas que excedem 150s (planta densa): mudar para padrão **job-queue** (tabela `axia_jobs` + worker via cron edge function) — apenas para `critical_vision_analysis`.

## 6. UI/UX (frontend, mudanças mínimas)

Componente partilhado `src/components/axia/AxiaResultPanel.tsx` que recebe o envelope e mostra:
- chips: confiança %, nº itens, review_required
- listas: `missing_data`, `warnings`, `assumptions`
- botões: **Confirmar e enviar para orçamento** (disabled se `block_auto_submit`), **Corrigir manualmente**, **Pedir nova análise**, **Criar orçamento novo com estes quantitativos**

Integrar primeiro em `PlanWorkflowBar` / painel ICF, depois nos restantes módulos.

## 7. Configuração

Env vars opcionais (todas têm default no router):
`AXIA_MODEL_CRITICAL_VISION_ANALYSIS`, `AXIA_MODEL_PLAN_MEASUREMENTS`, `AXIA_MODEL_BUDGET_VALIDATION`, `AXIA_VALIDATOR_ENABLED`, `AXIA_CONFIDENCE_REVIEW_THRESHOLD` (default 0.75), `AXIA_CONFIDENCE_BLOCK_THRESHOLD` (default 0.55).

## Detalhes técnicos

- Reasoning effort: `medium` para tasks críticas com gpt-5.5, `low` para mini.
- Validator usa mesmo schema + prompt "audite e devolva delta"; envelope final faz merge (intersecção de itens, união de warnings).
- Retry policy: 1 retry em 429, fallback automático para `fallback` model em 5xx ou timeout >120s.
- Logs: cada chamada grava `{task_type, model_used, confidence, latency_ms, tokens}` em tabela `axia_ai_calls` para observabilidade.
- Sem alteração nos tipos `src/integrations/supabase/types.ts` exceto se passo 5 adicionar colunas `status`/`ai_meta`.

## Fora de escopo

- Não alteramos lógica de negócio das funções (engenharia ICF, cálculo de margem, etc.).
- Não removemos nem renomeamos edge functions.
- Claude Sonnet/Opus fica como hook no router mas não é ativado já (não disponível no Lovable AI Gateway hoje).
