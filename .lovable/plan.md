# Integrar simbologia oficial PT no prompt da Axia "Análise Elétrica"

## Objetivo
Carregar no system prompt da edge function `axia-electrical-analysis` toda a simbologia elétrica extraída do PDF `simbologia.pdf` (norma PT-PT da T2DP), para que a Axia reconheça e classifique corretamente cada símbolo encontrado em plantas, legendas e diagramas.

## O que muda
Apenas dois blocos no ficheiro `supabase/functions/axia-electrical-analysis/index.ts`:

1. **Expandir `SYMBOL_KEYS`** (hoje ~25 chaves) para o catálogo completo PT-PT (~55 chaves), agrupado por categoria. Manter `outro` como fallback.
2. **Adicionar uma secção "SIMBOLOGIA DE REFERÊNCIA (PT-PT)"** ao `systemPrompt`, listando descrição visual + significado + `symbol_key` correspondente, para a Axia mapear rigorosamente.

Não há alterações em UI, BD nem outras funções. Os novos `symbol_key` já passam automaticamente para `plan_placed_elements.symbol_type_id` e aparecem nos quantitativos.

## Catálogo a incluir (extraído do PDF)

### Proteção & quadros
`interruptor_tetrapolar`, `interruptor_unipolar`, `interruptor_unipolar_chave`,
`interruptor_diferencial_tetrapolar`, `interruptor_diferencial_bipolar`,
`disjuntor_diferencial_tetrapolar`, `disjuntor_diferencial_bipolar`,
`disjuntor_tetrapolar`, `disjuntor_tripolar`, `disjuntor_bipolar`, `disjuntor_unipolar`,
`porta_fusivel_unipolar`, `porta_fusivel_bipolar`, `porta_fusivel_tripolar`,
`tribloco_fusiveis`, `quadro_eletrico`, `portinhola`,
`contador_energia`, `contador_energia_tripla_tarifa`,
`caixa_coluna`, `caixa_derivacao`, `caixa_visita`, `caixa_alimentacao`,
`ligacao_terra`, `ligador_amovivel`, `sinalizador_tensao_modular`

### Comando
`interruptor_simples`, `comutador_escada`, `comutador_escada_duplo`,
`comutador_lustre`, `comutador_chave`, `inversor`,
`botao_pressao`, `botao_chave`, `botao_pressao_sinalizacao`,
`detector_movimento`

### Iluminação
`ponto_luz`, `ponto_luz_embebido_parede`, `ponto_luz_parede`,
`ponto_luz_downlight`, `ponto_luz_uplight`, `projetor_250w`,
`bloco_emergencia_permanente`, `bloco_emergencia_nao_permanente`,
`bloco_emergencia_protecao_mecanica`,
`armadura_fluorescente_1x18`, `armadura_fluorescente_1x36`, `armadura_fluorescente_1x58`,
`armadura_fluorescente_2x18`, `armadura_fluorescente_2x36`, `armadura_fluorescente_2x58`,
`armadura_fluorescente_4x18`,
`armadura_fluorescente_2x36_antideflagrante`,
`armadura_incandescente_60w_antideflagrante`,
`armadura_fluorescente_2x36_kit_emergencia`,
`armadura_fluorescente_quadro_parede`,
`luminaria_industrial_suspensa_250w`, `sinalizador_parede`

### Tomadas
`tomada_schuko_obturadores`, `tomada_estabilizada_ups`, `tomada_trifasica_terra`

### Outros
`sirene`, `canalizacao_geral`, `canalizacao_geral_enterrada`

(Mais `outro` como fallback obrigatório.)

## Detalhes técnicos

- O `enum` em `toolSchema.placed_symbols.items.symbol_key`, `declared_quantities.items.symbol_key` e `legend_map.items.symbol_key` herda de `SYMBOL_KEYS`, portanto a expansão valida automaticamente as novas chaves.
- A vista `plan_quantitativos_v` agrupa por `symbol_type_id`, logo os novos símbolos passam a aparecer em Quantitativos sem migração.
- Mantém compatibilidade com chaves antigas (ex: `tomada_baixa`, `quadro_distribuicao`) — vou manter como aliases para não invalidar análises já persistidas.
- O bloco de simbologia no system prompt vai ser uma tabela compacta no formato `símbolo visual → significado → symbol_key`, instruindo a Axia: *"Quando reconheceres um destes símbolos, usa exatamente esta `symbol_key`. Se não for nenhum destes, usa `outro` e descreve em `technical_note`."*

## Resultado esperado
A Axia, ao analisar uma planta T2DP (ou similar PT), passa a identificar com nome correto: ex. "armadura fluorescente 2x36W", "disjuntor diferencial tetrapolar", "bloco autónomo de emergência permanente", em vez de cair tudo em `outro` ou `fluorescente` genérico — e os quantitativos refletem isso.

Aprovas para implementar?
