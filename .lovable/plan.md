# Padronização Global dos Prompts da Axia — Módulo Planta

## Objetivo
Unificar voz, regras e segurança dos 5 prompts da Axia ligados a plantas, sem mexer no fluxo visual nem refatorar módulos. Manter compatibilidade com os schemas atuais (campos novos são **opcionais**).

## Ficheiros a alterar
1. `supabase/functions/axia-plan-vision/index.ts`
2. `supabase/functions/axia-plan-suggestions/index.ts`
3. `supabase/functions/axia-electrical-analysis/index.ts`
4. `supabase/functions/axia-infra-scenarios/index.ts`
5. `supabase/functions/icf-plant-analysis/index.ts`

Sem alterações no frontend nesta fase (os campos novos são aditivos e ignorados se não usados).

---

## 1. Bloco de identidade comum (inserido no início de cada `systemPrompt`)

```
Tu és a Axia, a camada de inteligência operacional do Obra Sys
para construção civil em Portugal.
Trabalhas em português de Portugal.
Apoias leitura de planta, medições, validação e orçamento, mas
NÃO substituis revisão humana, projeto técnico, engenheiro
responsável ou fornecedor.
Nunca inventas valores. Quando não houver evidência suficiente,
devolves valor null ou 0 conforme o schema, marcas confidence
baixa, review_required=true e explicas a limitação.
```

## 2. Bloco de regras globais (inserido a seguir à identidade)

```
REGRAS GLOBAIS DA AXIA NO MÓDULO PLANTA
1. Nunca devolver medições como definitivas sem evidência.
2. Diferenciar sempre a origem do valor:
   lido | calculado | inferido | estimado | indisponivel
3. Sem escala/calibração confiável → não devolver quantidades
   lineares ou áreas como definitivas.
4. Em caso de dúvida → review_required=true.
5. Não contar elementos em cortes, alçados, detalhes, legendas,
   carimbos ou tabelas como elementos da planta.
6. Não duplicar elementos entre planta geral, detalhe, corte
   e legenda.
7. Coordenadas e bbox sempre normalizadas entre 0 e 1.
8. Nada vai para orçamento sem origem, confidence e estado
   de validação.
```

---

## 3. Ajustes específicos por função

### `axia-plan-vision`
- Substituir "Eres Axia™" pelo bloco comum.
- Remover obrigação de `estimated_area > 0`. Se ilegível: devolver `0`/`null` + `area_source="indisponivel"` ou `"estimada_por_tipologia"` + `confidence <= 0.45` + `review_required=true`.
- Portas/janelas sem dimensão legível: `dimension_source="inferida_padrao"` + `confidence <= 0.55` + `review_required=true`.
- Se folha for corte/alçado/detalhe/legenda/carimbo: classificar e devolver `rooms=[]`, `walls=[]`, `openings=[]`.
- Adicionar campos opcionais ao schema: `area_source`, `dimension_source`, `value_origin` (enum lido/calculado/inferido/estimado/indisponivel).

### `axia-plan-suggestions`
- Corrigir "Eres" → bloco comum ("Tu és").
- Cada sugestão passa a ter (campos opcionais aditivos): `affected_measurement_ids[]`, `reason`, `suggested_action`, `auto_apply_allowed=false`.
- Não sugerir complementares como definitivos se medição base tiver `estado=pendente` ou confidence baixa.

### `axia-electrical-analysis`
- Substituir "Sê EXAUSTIVO — não deixes nenhum símbolo por identificar" por "Sê detalhado, mas **não inventes símbolos**".
- Separar resposta em: `confirmed_elements`, `uncertain_elements`, `ignored_marks`, `circuits`, `materials_estimate`.
- Só estimar comprimento de cablagem/conduta se houver escala/calibração; caso contrário marcar `length_source="indisponivel"`.
- Se houver legenda elétrica → usar como prioridade absoluta.

### `axia-infra-scenarios`
- Bloco comum ("Tu és a Axia").
- Preços passam a ser **preliminares/placeholders** se não houver base de preços interna no input — marcar `price_source="preliminar"`.
- Reforçar: "não substitui projeto de estabilidade, sondagem geotécnica nem cálculo estrutural".
- Priorizar fórmulas, quantidades e premissas sobre valores monetários.

### `icf-plant-analysis`
- Substituir "Você é um engenheiro estrutural" por "Tu és a Axia, assistente técnico de pré-medição ICF" + bloco comum.
- Reforçar que não substitui engenheiro responsável.
- Para cada parede devolver (campos aditivos): `evidence_type`, `confidence`, `review_required`, `source_page`, `possible_duplicate`.
- Adicionar chave técnica de deduplicação: `floor + orientation + normalized_location + estimated_length_m`.

---

## 4. Garantia anti-erro fatal
Confirmar em todas as 5 funções que falha de leitura ou parsing devolve **HTTP 200** com JSON válido (arrays vazios, `risk_level="alto"`, `review_required=true`). O `axia-plan-vision` já tem `controlledFailure`/`emptyFallbackAnalysis` — replicar o mesmo padrão nas outras 4 (atualmente devolvem 500).

---

## 5. Compatibilidade com schemas
- Todos os campos novos são **opcionais e aditivos** → não quebram tool-calls existentes nem o frontend.
- Enums novos (`value_origin`, `area_source`, etc.) são strings livres no schema atual; serão validados só onde o frontend já consumir.
- O fluxo visual e os componentes `PlanAIAnalysis.tsx`, `AxiaPlanSuggestionsPanel.tsx`, etc. continuam a funcionar sem alterações.

---

## 6. Testes a executar
Para cada Edge Function:
1. Deploy via `supabase--deploy_edge_functions`.
2. Curl com payload mínimo válido → confirmar 200 + JSON estruturado.
3. Curl com payload "vazio"/inválido → confirmar 200 + fallback seguro (não 500/502).
4. Verificar logs (`supabase--edge_function_logs`) sem erros.

---

## 7. Entregável final
- Diff dos 5 ficheiros.
- Lista de campos novos por função.
- Resumo dos riscos de compatibilidade (esperado: nenhum, pois são aditivos).
- Resultado dos testes curl por função.

## Fora de âmbito
- Refactor de componentes React.
- Alterações de schema de base de dados.
- Mudanças de modelo (Gemini Flash/Pro mantêm-se).
