# Motor de Leitura Assistida de Plantas — Separação rigorosa Elements vs Ignored

## Problema
A edge function `plant-leitura-analyze` persiste tudo na tabela `plant_elements` (incluindo `ignored_regions` com `status="ignored"`). A aba "Elementos" mostra todos os registos, então itens como *title block* e *topographic contour lines* aparecem como aprováveis e o botão "Enviar para Orçamento" considera-os no fluxo.

## Mudanças

### 1. Edge Function `supabase/functions/plant-leitura-analyze/index.ts`
- Substituir o system prompt pelo novo prompt Axia (separação rigorosa, regras de ignorados < 15% da folha, schema completo, categorias PT-PT, status `ok|review|proposed`).
- Validação JSON robusta:
  - Garantir `elements` e `ignored_regions` como arrays.
  - Normalizar `unit` (aceitar `un, m, m2, m3, ml`), converter vírgula decimal para ponto em `quantity`.
  - Aceitar categorias da lista PT-PT; **não** descartar elementos por categoria.
  - Manter `status="review"` e `status="proposed"` (não rebaixar nem descartar).
- Defesa contra `ignored_region` cobrindo o edifício:
  - Calcular área da `coordinates` vs área útil da folha; se > 15% e `region_type != "title_block"|"text"`, dividir em quadrantes externos ou descartar a região e emitir warning.
- Persistência:
  - Continuar a guardar `ignored_regions` em `plant_elements` com `status="ignored"` (mantém compatibilidade) **ou** mover para coluna/JSON separado em `plant_sheets` (proposto: gravar JSON `ignored_regions` no `plant_sheets` e parar de inserir como elements). Recomendação: gravar `ignored_regions` em `plant_sheets.ignored_regions_json` (jsonb) e deixar `plant_elements` apenas com itens orçamentáveis.

### 2. Migration
- Adicionar coluna `ignored_regions_json jsonb` em `plant_sheets` (se optarmos pela separação física).
- Limpeza opcional: marcar registos antigos com `status="ignored"` para não aparecer em listagens (já filtrados na UI).

### 3. Frontend — Aba Elementos
`src/components/planta-leitura/PlantElementsList.tsx` e `src/pages/planta-leitura/Index.tsx`:
- Filtrar para mostrar **apenas** elementos com:
  ```ts
  el.status !== "ignored" &&
  Number(el.quantity) > 0 &&
  ["un","m","m2","m3","ml"].includes(el.unit) &&
  ["ok","review","proposed","approved","edited"].includes(el.status)
  ```
- Badges: `Rever` (review), `Proposto` (proposed), `OK`, `Aprovado`, `Editado`.
- Empty state: *"Nenhum quantitativo orçamentável encontrado nesta folha. Verifique a escala, OCR ou reprocessamento."*
- Botão "Aprovar todos" só itera sobre `budgetElements`.

### 4. Frontend — Aba/Secção Ignorados
- Nova `TabsTrigger value="ignored"` (ou subsecção) que lê `ignored_regions` da sheet (JSON) ou `plant_elements` com `status="ignored"`.
- Render somente leitura, sem ações de aprovação.

### 5. Botão "Enviar para Orçamento (N)"
`PlantExportToBudgetModal.tsx` e callsite:
- Contador = `budgetElements.length` (lista já filtrada acima, excluindo `ignored`).
- Garantir que o payload enviado nunca contém `ignored_regions`.

### 6. Visualização (PlantViewer)
- Continuar a desenhar `ignored_regions` com estilo distinto (cinza translúcido) só para referência, sem permitir clique de aprovação.

## Detalhes técnicos
- Os filtros JSON corrigidos vivem em um helper partilhado `src/lib/plant-elements-filter.ts` para evitar duplicação entre lista, contador e modal de export.
- Logs do edge function devem registar `elements_count`, `ignored_count`, `dropped_oversize_regions`.
- Nenhuma alteração nas tabelas `plant_files`, `plant_processing_logs`.

## Validação
1. Reprocessar uma folha que antes mostrava *title block* como elemento → aparece só em "Ignorados".
2. Folha com elementos `status="review"` → aparecem na aba Elementos com badge "Rever" e contam no botão.
3. JSON com `ignored_region` 960×960 cobrindo o edifício → edge function divide/descarta e gera warning.
4. Contador do botão coincide com `budgetElements.length` em todos os cenários.
