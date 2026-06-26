# Axia — Registo Central de Prompts

Este documento é o índice humano dos system prompts usados pelas edge
functions Axia. O **runtime** lê os prompts de `prompts.ts` (ou
`system-prompts.ts` para blocos partilhados); este `.md` existe para
revisão editorial e auditoria, não é importado pelo Deno.

## Como adicionar/editar um prompt

1. Edita o texto em `prompts.ts` (registry estático) ou cria um builder
   nas secções "Dynamic prompt builders".
2. Sobe a `version` quando o texto muda de forma semanticamente
   relevante (afeta o output).
3. Reflete a alteração nesta tabela.
4. Toda chamada de modelo IA tem de ser registada via
   `logAxiaCall(admin, ...)` (`./logCall.ts`).

## Blocos partilhados (`system-prompts.ts`)

| Símbolo                          | Uso                                                                 |
| -------------------------------- | ------------------------------------------------------------------- |
| `AXIA_GLOBAL_SAFETY_BLOCK`       | Bloco obrigatório em todas as tarefas técnicas Axia (PT-PT, fontes, draft_ai). |
| `AXIA_ANTI_HALLUCINATION_BLOCK`  | Reforço anti-alucinação para extrações técnicas (escala, cotas, confidence). |
| `AXIA_ENVELOPE_HINT`             | Forma do envelope JSON técnico (confidence_score, missing_data, …). |

## Prompts registados (`prompts.ts`)

| ID                  | Versão | Descrição                                                          |
| ------------------- | ------ | ------------------------------------------------------------------ |
| `axia-nvidia-test`  | 1.0.0  | Prompt do path NVIDIA do `axia-chat` (smoke-test e fallback rápido). |

## Builders dinâmicos

| Builder                       | ID base      | Versão | Quando usar                                              |
| ----------------------------- | ------------ | ------ | -------------------------------------------------------- |
| `buildAxiaChatSystemPrompt`   | `axia-chat`  | 1.0.0  | `axia-chat`: copiloto operacional com `contextBlock`.    |

## Funções por migrar

As funções abaixo ainda têm o system prompt inline. Migração mecânica:
mover texto para `prompts.ts` (novo `AxiaPrompt` ou builder) + substituir
o uso por `getPrompt(...)`.

- `axia-analysis`
- `axia-budget-insights`
- `axia-classify-sheets`
- `axia-electrical-analysis`
- `axia-foundation-suggestion`
- `axia-infra-scenarios`
- `axia-plan-suggestions`
- `axia-plan-vision`
- `axia-specialty-vision`
- `axia-suggestions`
- `mce-axia-analyze`
- `orcamento-rai-axia`
- `optimize-with-ai`
- `organize-budget-import`
- `parse-supplier-pricelist`
- `plant-leitura-analyze`
- `process-voice-command`
- `research-material-prices`
- `support-chat`
- `validate-budget-ai`

Cada migração deve incluir:
1. `getPrompt(...)` ou builder em `prompts.ts` (+ entrada nesta tabela).
2. `logAxiaCall(admin, { module, task_type, provider_used, model_used,
   status, latency_ms, organization_id, user_id, error_message? })`
   em sucesso, fallback e erro.
