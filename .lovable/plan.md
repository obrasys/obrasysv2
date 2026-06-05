# Corrigir erro "Edge Function returned non-2xx" na análise da planta ICF

## Causa

Confirmado nos logs da edge function `icf-plant-analysis`:

1. O **Gemini 2.5 Pro** (modelo primário) deu **timeout/abort** ao processar a planta PDF.
2. O **fallback GPT-5.5** (OpenAI) rejeitou o ficheiro com:
   `Invalid MIME type. Only image types are supported` (HTTP 400).

Os modelos OpenAI não aceitam `application/pdf` na API de chat com imagens — só os modelos Google/Gemini aceitam PDF diretamente.

## Correção

Em `supabase/functions/icf-plant-analysis/index.ts`, ajustar a montagem da cadeia de modelos imediatamente antes do loop de tentativas (linha 450):

- Detetar se o ficheiro é PDF (`mimeType === "application/pdf"`).
- Se for PDF e o modelo primário/fallback **não** for Gemini, substituir por equivalente Google:
  - primário → `google/gemini-2.5-pro`
  - fallback → `google/gemini-2.5-flash` (mais rápido, reduz risco de timeout)
- Para imagens (PNG/JPEG), manter a cadeia original do `resolveChain("icf_analysis")`.

Diff conceptual:

```ts
const isPdf = mimeType === "application/pdf";
const pdfSafe = (m: string) => m.startsWith("google/");
const safePrimary  = isPdf && !pdfSafe(chain.primary)  ? "google/gemini-2.5-pro"   : chain.primary;
const safeFallback = isPdf && !pdfSafe(chain.fallback) ? "google/gemini-2.5-flash" : chain.fallback;

const attempts = [
  { model: safePrimary,  timeoutMs: 80_000 },
  { model: safeFallback, timeoutMs: 55_000 },
];
```

## Verificação

1. Re-tentar carregar a mesma planta PDF.
2. Confirmar nos logs da edge function: deve aparecer `gemini-2.5-flash` como fallback em vez de `gpt-5.5`, sem o erro `Invalid MIME type`.
3. Se a planta for muito grande e ainda assim demorar, mostrar mensagem ao utilizador a sugerir enviar por piso (já existe a verificação de 12 MB).

## Fora do âmbito

- Não altero o prompt, o schema da tool call, nem a UI.
- Não mexo no chain config (`resolveChain`) — a correção é local à função e degrada de forma segura.
