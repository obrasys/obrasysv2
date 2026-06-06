
## Diagnóstico (Fase 1)

O pipeline DXF atual (`supabase/functions/plan-dxf-parse/index.ts`) só processa `LINE`, `LWPOLYLINE`, `POLYLINE` e `INSERT` (apenas para vãos). **Não lê** nenhuma entidade de texto: `TEXT`, `MTEXT`, `ATTRIB`, `ATTDEF`, `DIMENSION`. Também não resolve `BLOCKS` (entidades internas de inserts) nem aplica transformação (posição/escala/rotação). Por isso nomes de compartimentos, áreas, cotas e legendas vêm vazios em DXF — o PDF funciona porque passa por outro caminho com OCR/IA.

## Objetivo

Corrigir apenas o pipeline DXF. PDF fica intocado.

## Mudanças

### 1) Novo módulo `supabase/functions/plan-dxf-parse/dxf-text.ts`
- `extractTexts(dxf)`: percorre `dxf.entities` e `dxf.blocks` e devolve `DxfText[]` com:
  - `raw`, `normalized`, `layer`, `entity_type` (TEXT/MTEXT/ATTRIB/ATTDEF/DIMENSION/INSERT_TEXT), `x`, `y`, `rotation`, `height`, `style`, `color`, `block_source`, `confidence`, `needs_review`.
- `normalizeMText(raw)`: limpa códigos AutoCAD — `\P`→espaço, `\~`→espaço, `\f...;`, `\H...;`, `\C...;`, `\L`, `\O`, `{...}`, `\\`→`\`, `%%c`→Ø, `%%d`→°, `%%p`→±, `m2|M2`→m², `m3`→m³.
- `expandInsert(insert, blocksMap, parentTransform?)`: dado um `INSERT`, encontra a definição em `dxf.blocks[insert.name]`, percorre entidades internas (recursivo para inserts aninhados, profundidade máx. 5), aplica transformação composta (`basePoint` do bloco + `position`, `xScale`, `yScale`, `rotation` do insert) a cada `TEXT`/`MTEXT`/`ATTRIB` e devolve textos com coords no espaço do modelo.
- `extractAttribsFromInsert(insert)`: lê `insert.attributes ?? []` (dxf-parser já os anexa) com a mesma transformação.
- `extractDimensions(entities)`: para `DIMENSION`, extrai `text` (override), `actualMeasurement` quando disponível, `defaultValue`, ponto de inserção, rotação, layer.
- `classifyTextLayer(layer)`: regex para `TEXT|TEXTO|ANNO|ANNOTATION|ROOM_TEXT|COMPARTIMENTOS|AREAS|COTAS|DIM|LEGENDA|NOTES|ARQ_TEXT|A-TEXT|A-ANNO`. Não filtra — só anota `is_text_layer` para diagnóstico. Toda entidade textual é extraída independentemente do layer.

### 2) Novo módulo `supabase/functions/plan-dxf-parse/dxf-text-classify.ts`
- `classifyText(text)`: heurística — extrai possível **área** (`/([\d.,]+)\s*m[²2]/i`), **dimensão linear** (`/([\d.,]+)\s*(m|cm|mm)\b/i`), **nome de compartimento** (match contra dicionário PT: `SALA|COZINHA|QUARTO|SUITE|WC|I\.?S\.?|BANHO|GARAGEM|LAVANDARIA|HALL|ENTRADA|ESCRITÓRIO|DESPENSA|VARANDA|TERRAÇO|ARRUMO|CIRCULAÇÃO`).
- Devolve `{ kind: "room_label" | "area" | "dimension_text" | "note" | "legend" | "unknown", roomName?, areaM2?, value? }`.

### 3) Associação texto→compartimento (Fase 6) em `dxf-rooms.ts`
- `detectRooms(segments)`: deteta polilinhas fechadas (já existentes em entities `LWPOLYLINE` com `shape=true` ou `POLYLINE`) num layer tipo `room` ou em qualquer layer, calcula área pelo shoelace.
- `associateTexts(rooms, texts)`:
  - Se ponto do texto está dentro de polígono (ray-casting) → atribui a esse compartimento.
  - Senão, atribui ao compartimento cujo centroide é o mais próximo (`maxDist` = 5 m).
  - Junta `room_label` + `area` próximos (≤ 2 m) no mesmo compartimento.
  - Compartimento sem nome → `Compartimento N`.
  - Texto sem geometria → guarda em `unassigned_texts` com `needs_review: true`.

### 4) Atualizar `supabase/functions/plan-dxf-parse/index.ts`
- Chamar os novos módulos após `extractSegments`.
- Construir `blocksMap = dxf.blocks` (objeto `{name: BlockDef}`).
- Para cada `INSERT` no espaço do modelo, expandir em textos transformados.
- Adicionar ao payload `extracted`:
  - `textos_dxf`: array completo (com coords em metros via `toMeters`).
  - `compartimentos`: lista com `{ id, nome, area_declarada_m2, area_calculada_m2, centroide, textos_associados[] }`.
  - `cotas_dxf`: lista de DIMENSION normalizadas.
  - `textos_nao_associados`: array com `needs_review`.
- Adicionar `validacao.dxf_diagnostico`:
  - contagens: `total_entidades`, `n_text`, `n_mtext`, `n_attrib`, `n_attdef`, `n_dimension`, `n_block`, `n_insert`, `n_textos_de_blocos`, `n_textos_extraidos`, `n_textos_associados`, `n_textos_nao_associados`.
  - `layers_encontrados`, `layers_texto_reconhecidos`, `erros_parsing[]`.
- Manter retrocompatibilidade — `paredes/fundacoes/lajes/totais` continuam iguais. Apenas adicionamos campos.

### 5) Frontend — `src/hooks/useIcfPlantAnalysis.ts`
- Estender o tipo do payload com `textos_dxf?`, `compartimentos?`, `cotas_dxf?`, `textos_nao_associados?`, `validacao.dxf_diagnostico?`.

### 6) Novo componente `src/components/icf/DxfDiagnosticPanel.tsx`
- Aba colapsável dentro do `IcfPlantAnalyzer` (visível só quando há `dxf_diagnostico`).
- Mostra contagens de entidades, layers, textos extraídos (com filtro), e tabela de textos não associados marcados “Precisa revisão”.

### 7) Overlay visual (Fase 8/10)
- Em `DxfPreviewDialog.tsx`, adicionar toggle “Mostrar textos DXF”: quando ativo, renderiza `Konva.Text` para cada texto extraído nas coords do modelo (usa o mesmo bbox/scale já calculados). Faz `fetch` ao novo endpoint só uma vez, partilha o resultado via prop ou refaz parse local (preferir prop a partir do hook se o componente estiver no fluxo de análise).

### 8) Logs e auditoria
- `plan_analysis_logs` ganha eventos:
  - `dxf_textos_extraidos` (info) com metadata = contagens.
  - `dxf_textos_nao_associados` (warning) se > 0.

## Não-objetivos

- Não tocar pipeline PDF (`icf-plant-analysis`, OCR, IA).
- Não inventar textos: se a heurística não conseguir associar, fica como `needs_review`.
- Sem migrações SQL — todo o detalhe novo entra em `analysis_payload` (jsonb) e `metadata` (jsonb).

## Critérios de aceitação

Conforme Fase 10 do pedido: textos de compartimentos, áreas, DIMENSIONs, MTEXT limpos, ATTRIB de blocos, e associação a polígonos — todos presentes no payload e visíveis no painel de diagnóstico; toggle de overlay no preview; PDF continua a funcionar exatamente como antes.
