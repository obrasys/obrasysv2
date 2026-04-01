

## Plano: Suporte a PDF e DOCX na Importação de Orçamentos

### Resumo
Adicionar suporte para importação de ficheiros PDF e DOCX no modal de importação de orçamentos, mantendo o fluxo existente (upload → IA organiza → preview → confirmar).

### Como Funciona

Para PDF e DOCX, não é possível usar o parser Excel. Em vez disso, o conteúdo será extraído como texto e enviado diretamente à Edge Function, que usará a IA para interpretar e estruturar o orçamento.

### Alterações

**1. `src/components/importar/ImportOrcamentoModal.tsx`**
- Expandir os formatos aceites no dropzone: adicionar `.pdf`, `.docx`
- Atualizar texto de formatos aceites na UI
- Alterar o `onDrop` para detetar o tipo de ficheiro:
  - **Excel/CSV**: manter fluxo atual (parseExcelFile → enviar rows/headers)
  - **PDF**: ler como base64 e enviar à edge function como `rawText` com prefixo `[PDF_BASE64]`
  - **DOCX**: ler como texto usando a biblioteca `mammoth` (extrai texto limpo de DOCX) e enviar como `rawText`
- Atualizar o ícone conforme o tipo de ficheiro (FileSpreadsheet → FileText para PDF/DOCX)

**2. `supabase/functions/organize-budget-import/index.ts`**
- Aceitar um novo campo `rawText` no body (alternativo a `rows`/`headers`)
- Quando `rawText` estiver presente, enviar o texto diretamente ao prompt da IA em vez dos dados tabulares
- Para PDFs em base64, usar o modelo Gemini com suporte multimodal (enviar como `image_url` com `data:application/pdf;base64,...`)
- Manter o mesmo formato de saída (capítulos + artigos)

**3. Dependência**
- Instalar `mammoth` para extração de texto de DOCX no frontend

### Detalhes Técnicos

```text
Fluxo PDF:
  File → FileReader (ArrayBuffer → base64) → Edge Function → Gemini (multimodal PDF) → JSON estruturado

Fluxo DOCX:
  File → mammoth.extractRawText() → texto limpo → Edge Function → Gemini (texto) → JSON estruturado

Fluxo Excel (inalterado):
  File → parseExcelFile → rows/headers → Edge Function → Gemini (tool call) → JSON estruturado
```

