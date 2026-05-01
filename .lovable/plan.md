## Objetivo

Adequar o motor `axia-plan-vision` e a UI da Análise Visual ao novo prompt técnico (classificação de folha, paredes/vãos tipados, cotas com `raw_text`, regiões normalizadas em bbox, `confidence` + `review_required`, limitações e perguntas de validação), **mantendo compatibilidade** com o fluxo atual de envio para Quantitativos.

---

## 1. Edge function: `supabase/functions/axia-plan-vision/index.ts`

### 1.1 Substituir o `systemPrompt`
Trocar o prompt atual pela versão limpa do novo prompt técnico (Etapas 1 a 9, regras críticas anti-alucinação). O `${calibrationContext}` continua a ser injetado no fim.

### 1.2 Estender o schema do tool call `plan_analysis` (todos os novos campos opcionais)

**Novos blocos de topo** (não obrigatórios, para manter retrocompat):
- `sheet_classification`: `{ type: enum["planta_piso","implantacao","corte","alcado","detalhe","legenda","outro"], piso?, titulo?, escala?, norte_presente?, legenda_presente?, carimbo_presente? }`
- `walls`: array de `{ tipo: enum["parede_exterior","parede_interior","muro_lote","muro_contencao","parede_indefinida"], orientacao: enum["horizontal","vertical","diagonal","irregular"], bbox?, compartimento_associado?, confidence_score, review_required, evidencias?: string[], notes? }`
- `exterior_elements`: array de `{ tipo: enum["lote","rua","acesso","estacionamento","jardim","vegetacao","muro","patio","terraco","cota_altimetrica","confrontacao"], bbox?, confidence_score, notes? }`
- `reading_quality`: `{ overall_confidence: 0-1, image_quality: enum["alta","media","baixa"], text_legibility, dimensions_legibility, risk_level: enum["baixo","medio","alto"], human_intervention_required: bool }`
- `limitations`: `string[]`
- `validation_questions`: `string[]`

**Enriquecer blocos existentes** (campos novos opcionais):
- `dimensions[i]`: `raw_text?`, `valor_nao_legivel?: bool`, `bbox?`, `review_required?`, `associated_to?: string`. Manter `value/unit/label/position_x/position_y/confidence` obrigatórios.
- `rooms[i]`: `tipo_normalizado?: enum["sala","cozinha","sala_cozinha","quarto","suite","instalacao_sanitaria","circulacao","escada","arrumos","zona_tecnica","garagem","estacionamento","terraco","varanda","jardim","churrasqueira","exterior","indefinido"]`, `bbox?`, `evidencias?: string[]`, `review_required?`, `area_legivel?: bool`. Manter `name/center_x/center_y/confidence`.
- `elements[i]`: enum `type` ampliado com `["porta_interior","porta_exterior","porta_correr","janela","portao_garagem","portao_lote","vao_indefinido"]` mais os antigos `["porta","janela","pilar","escada","parede","outro"]` (compatibilidade). Adicionar `parede_associada?`, `compartimentos_conectados?: string[]`, `largura_legivel?: bool`, `confidence_score?`, `review_required?`.

`bbox` em todos os sítios = `{ x_min, y_min, x_max, y_max }` (números 0–1) ou ausente.

### 1.3 Sem mudanças noutras partes
Modelo continua `google/gemini-2.5-flash`. Headers, auth, logging mantêm-se.

---

## 2. Tipos no frontend: `src/components/plantas/PlanAIAnalysis.tsx`

Estender a interface exportada `PlanAnalysisResult` (todos os novos campos opcionais para não partir consumidores actuais):

```ts
sheet_classification?: { type, piso?, titulo?, escala?, norte_presente?, legenda_presente?, carimbo_presente? }
walls?: Array<{ tipo, orientacao, bbox?, compartimento_associado?, confidence_score, review_required, evidencias?, notes? }>
exterior_elements?: Array<{ tipo, bbox?, confidence_score, notes? }>
reading_quality?: { overall_confidence, image_quality, text_legibility, dimensions_legibility, risk_level, human_intervention_required }
limitations?: string[]
validation_questions?: string[]
// E nos itens existentes:
dimensions[i].raw_text?, valor_nao_legivel?, bbox?, review_required?
rooms[i].tipo_normalizado?, bbox?, review_required?, evidencias?
elements[i].confidence_score?, review_required?, parede_associada?
```

### Mudanças no card colapsado (lado direito do canvas)

- **Header da folha**: se vier `sheet_classification`, mostrar uma linha com badges: `Tipo`, `Piso`, `Escala`, `Norte`. Dá ao utilizador feedback imediato do que a Axia leu.
- **Banner de qualidade**: se `reading_quality.human_intervention_required === true` ou `risk_level === "alto"`, mostrar banner âmbar com `AlertTriangle` no topo do card.
- **Nova secção colapsável "Paredes"** abaixo de "Elementos", com contagem por tipo (Exterior X · Interior Y · Muro Z).
- **Limitações & Perguntas**: secção colapsável "Validações da Axia" listando `limitations` e `validation_questions`.
- Para cada item com `review_required`, mostrar um pequeno `AlertTriangle` âmbar à direita do nome.

---

## 3. Tabela completa: `src/components/plantas/PlanAxiaResultsTable.tsx`

- Substituir o `ConfidenceBadge` local pelo `ConfidenceBadge` partilhado de `src/components/plantas/ConfidenceBadge.tsx` (já existe e segue o standard visual da app — mapeia score → `confirmado`/`provavel`/`precisa_validar`).
- Adicionar **2 novos tabs**: "Paredes" e "Exterior".
- Em "Cotas": adicionar coluna **"Texto original"** que mostra `raw_text` quando existir e badge "Ilegível" quando `valor_nao_legivel === true`.
- Em "Compartimentos": adicionar coluna **"Tipo"** (do `tipo_normalizado`).
- Em todos os tabs: adicionar coluna **"Validar?"** com badge âmbar quando `review_required === true`.
- Atualizar exports CSV para incluir novas colunas.
- Header do dialog: se houver `sheet_classification`, mostrar badge com o `type` da folha ao lado de `pageLabel`.

Para isto receber os dados, o componente precisa do objecto `PlanAnalysisResult` completo (não só dos 3 arrays). Adicionar props opcionais `sheetClassification`, `readingQuality`, `walls`, `exteriorElements`, `limitations`, `validationQuestions`, e passá-las a partir de `PlanAIAnalysis.tsx`.

---

## 4. Envio para Quantitativos: `src/components/plantas/PlanAxiaBudgetSendDialog.tsx`

- Adicionar checkbox **"Excluir itens marcados para validar humana"** (default: ligado). Quando ligado, filtra qualquer item com `review_required === true`.
- Para `rooms` com `tipo_normalizado`, mapear para `plan_rooms.tipo_compartimento` quando o valor existir na taxonomia atual; caso contrário usar `"habitacao"` como fallback.
- Para `dimensions` com `valor_nao_legivel === true`: nunca enviar, mesmo sem o filtro acima (não é honesto criar cota com valor inventado).
- Mostrar contador "Filtrados por validação humana: N" no resumo.

Fora do âmbito desta iteração: criar registos em `plan_walls` a partir do output da Axia (a estrutura de dados é diferente — `walls` da Axia não tem `start_point`/`end_point`, só `bbox`). Apenas mostramos no UI; a inserção em `plan_walls` fica para iteração futura quando a Axia conseguir devolver pontos.

---

## 5. Pequenas correcções

- **Erro runtime atual** "Failed to fetch dynamically imported module: Detail.tsx" — ao tocar em `Detail.tsx` para passar as novas props, o módulo é re-emitido e o erro de cache resolve-se. Não requer mudança adicional.
- Confiança: o componente atual usa `confidence` (0–1). Vamos preferir `confidence_score` quando vier (sinónimos), com fallback. Helper único `pickConfidence(item)` em `PlanAIAnalysis.tsx`.

---

## 6. QA manual após implementação

Na rota actual `/obras/:id/plantas/:planId`:
1. Carregar o PDF anexo (`Autodesk_Viewer_Free_Online_File_Viewer.pdf`).
2. Correr "Analisar com IA". Verificar:
   - Badges de classificação da folha aparecem.
   - Cotas têm `raw_text` (quando legível) e marca "Ilegível" quando aplicável.
   - Paredes aparecem separadas por tipo (exterior/interior/muro).
   - Vãos com tipos detalhados (porta_interior, janela, portão_garagem...).
   - Banner de qualidade só aparece quando `human_intervention_required`.
3. Abrir tabela completa → confirmar 5 tabs (Cotas, Compartimentos, Elementos, Paredes, Exterior) + nova coluna "Validar?".
4. Enviar para Quantitativos com filtro ligado → confirmar que itens com `review_required` ficam de fora.
5. Logs da edge function: confirmar que o JSON do tool call parseia (sem `Unexpected end of JSON`).

---

## Ficheiros que vão ser tocados

- `supabase/functions/axia-plan-vision/index.ts` — novo prompt + schema estendido
- `src/components/plantas/PlanAIAnalysis.tsx` — tipos + UI do card (header de folha, banner de qualidade, secção Paredes, secção Validações)
- `src/components/plantas/PlanAxiaResultsTable.tsx` — 2 novos tabs, coluna Validar, coluna Texto original, ConfidenceBadge partilhado
- `src/components/plantas/PlanAxiaBudgetSendDialog.tsx` — filtro `review_required`, mapeamento `tipo_normalizado`, exclusão de cotas ilegíveis
- `src/pages/plantas/Detail.tsx` — passar novas props (`sheetClassification`, etc.) ao tabela completa via `PlanAIAnalysis`

Aprovas para implementar?