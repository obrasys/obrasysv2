
## Objetivo

Tornar a análise elétrica da Axia muito mais coerente com a realidade dos PDFs (planta de pontos, diagrama unifilar, tabela de cargas, quadro de distribuição, legenda) e fazer com que os resultados apareçam de facto na tabela de **Quantitativos** da planta.

---

## Problemas atuais (diagnóstico)

1. A função `axia-electrical-analysis` trata qualquer folha elétrica da mesma forma — conta símbolos mesmo num diagrama unifilar ou numa legenda.
2. Não há regra forte contra contar símbolos da legenda/quadro de cargas → contagens infladas.
3. Os resultados ficam apenas no estado do componente `PlanElectricalAnalysis` — **nunca são persistidos** em `plan_placed_elements`, por isso a vista `plan_quantitativos_v` (que alimenta a tabela de Quantitativos) fica vazia.
4. Não há leitura cruzada entre símbolos desenhados e tabelas quantitativas declaradas no PDF.
5. Faltam atributos técnicos elétricos (altura, circuito, quadro, tensão, potência, secção, disjuntor, ambiente).

---

## Plano

### 1. Migração de BD

Acrescentar à tabela `plan_placed_elements` (e/ou `specialty_detected_elements` para o módulo Especialidades) campos opcionais:
- `installation_height` text
- `circuit_number` text
- `distribution_board` text
- `voltage` numeric
- `power_w` numeric
- `cable_section_mm2` numeric
- `breaker_rating_a` numeric
- `is_existing` boolean
- `room_name` text
- `technical_note` text
- `data_source` text — `visual_symbol_detection` | `extracted_quantity_table` | `electrical_diagram` | `load_schedule` | `user_manual_input`
- `sheet_subtype` text — sub-classificação da folha

Acrescentar nova tabela leve `plan_electrical_circuits` para guardar circuitos/quadros/disjuntores extraídos de diagramas unifilares e quadros de cargas (informação técnica, não orçamentável diretamente).

Atualizar `plan_quantitativos_v` para incluir os novos elementos elétricos persistidos como linhas de quantitativo, com `source='eletrica'` e `source_subtype` igual ao `symbol_type` (tomada, interruptor, ponto_luz, sensor, eletroduto, eletrocalha, …).

### 2. Edge function `axia-electrical-analysis` — reescrita do prompt e do schema

- **Etapa 1 — `sheet_classification`** (obrigatória): classificar a folha como
  `planta_instalacoes_eletricas` | `planta_iluminacao` | `planta_tomadas_alimentacoes` | `pontos_eletricos_cotados` | `diagrama_unifilar` | `tabela_cargas` | `quadro_distribuicao` | `detalhe_vista_eletrica` | `legenda_simbolos` | `outro`.
- **Etapa 2 — modo de extração condicional**:
  - Plantas reais → contar símbolos posicionados; preencher `installation_height`, `room_name`, `circuit_number`, `distribution_board`.
  - `pontos_eletricos_cotados` → extrair pontos com altura/equipamento/observação.
  - `diagrama_unifilar` / `tabela_cargas` / `quadro_distribuicao` → preencher só `circuits[]` (potência, tensão, secção, disjuntor, quadro). **Não** devolver `placed_symbols`.
  - `legenda_simbolos` → devolver só mapeamento símbolo→significado em `legend_map[]`. **Nunca** contar como elementos da obra.
- **Etapa 3 — `quantity_table_extraction`**: se a folha contiver uma tabela quantitativa declarada (Tomadas Simples, Trifásicas, Interruptores, Luminárias, Sensores, Refletores, Eletrocalha, Eletroduto…), extrair para `declared_quantities[]` com `data_source='extracted_quantity_table'`.
- **Etapa 4 — Cross-validation**: comparar `visual_counts` vs `declared_quantities` por `symbol_key`. Em caso de divergência > 10%, gerar `recommendations` do tipo `warning` com a mensagem
  > "Há diferença entre a contagem visual e a tabela quantitativa da prancha. Confirme qual valor deseja usar."
  e marcar `review_required=true` nesses símbolos.
- **Regra dura no system prompt**: "Não contar símbolos presentes em legendas, tabelas de cargas, diagramas unifilares ou vistas técnicas como pontos executáveis da planta, salvo confirmação explícita do utilizador."
- Cada elemento devolvido inclui `data_source` (uma das 5 origens listadas acima).
- Persistência: a função (que passa a aceitar `plan_import_id` e `user_id` via JWT) escreve diretamente em `plan_placed_elements` (símbolos visuais e tabela quantitativa) e em `plan_electrical_circuits` (informação técnica), atualizando `plan_quantitativos_v` automaticamente.

### 3. Frontend — `PlanElectricalAnalysis.tsx`

- Mostrar a sub-classificação detetada no topo (chip).
- Se a folha for legenda/diagrama/tabela de cargas, esconder o cartão "Elementos" e mostrar antes "Circuitos" e "Mapa de símbolos da legenda".
- Adicionar painel de **divergência visual ↔ tabela** com botão "Usar tabela" / "Usar contagem visual" / "Manter ambos".
- Mostrar badges para cada elemento com `installation_height`, `room_name`, `circuit`, `distribution_board`.
- Após análise bem-sucedida invalidar `plan-quantitativos` query → a tabela de Quantitativos passa a refletir os novos elementos.

### 4. Mesma lógica para o módulo de Especialidades

Aplicar `sheet_classification`, regra anti-legenda e `data_source` também em `axia-specialty-vision` quando `specialty_type='eletrica'`, reaproveitando os novos campos em `specialty_detected_elements`.

### 5. Fora de âmbito

- Não tocar no fluxo de orçamento/PDF.
- Não alterar o módulo financeiro.
- Não criar novos modelos; reaproveitar `gemini-2.5-pro` para folhas elétricas e `gemini-2.5-flash` como fallback.

---

## Resultado esperado

Ao analisar `eletrica_1.pdf` (planta de instalações com tabela quantitativa), `pontos.pdf` (planta de pontos cotados) ou `Diagrama_elétrico_Bifanaria.pdf` (unifilar), a Axia:
1. Identifica corretamente o tipo de folha;
2. Extrai símbolos **só** quando faz sentido;
3. Lê a tabela quantitativa quando existir e cruza com a contagem visual;
4. Persiste os elementos com atributos técnicos completos;
5. A **tabela de Quantitativos da planta passa a mostrar as quantidades elétricas** automaticamente, organizadas por sub-tipo.

Aprova para eu começar pela migração?
