
## Objetivo

A leitura da planta deixa de gerar "1 porta = Qtd 1, 0 €" sem dimensão. Passa a produzir **quantitativos orçamentáveis** prontos a calcular preço:

- **Vãos (portas/janelas)** agrupados por **dimensão** (ex.: `Porta interior 80×210` = 6 un, `Janela 120×120` = 4 un).
- **Rodapé** em **metros lineares**, calculado pelo **perímetro do compartimento menos a largura dos vãos de porta** que abrem para esse compartimento.
- **Paredes** em **m² (revestimento/pintura/barramento)** e **m linear (cantos, perfis)**, usando perímetro total × pé direito, descontando vãos.
- **Pavimento e teto** em **m²** já existentes, mas agora coerentes com os mesmos compartimentos.

Tudo isto chega à Tabela Unificada com **Qtd. já preenchida** e segue para o orçamento sem ficar a 0 €.

---

## Alterações principais

### 1. Edge function `axia-plan-vision` — extrair largura dos vãos

Adicionar ao schema do tool `plan_analysis`, em cada `element`:

- `largura_cm` (number) — largura nominal do vão em cm. Quando há cota legível na planta, usar; caso contrário inferir pelos padrões PT:
  - Porta WC: 70
  - Porta interior quarto/sala/cozinha: 80
  - Porta entrada: 90
  - Porta correr: 120
  - Janela pequena: 60–80, média: 100–140, grande: ≥160
- `altura_cm` (number) — altura do vão (210 portas, 120 janelas típicas).
- `dimensao_legivel` (boolean) — true se foi lida da cota, false se foi inferida (`review_required=true`).
- `compartimentos_conectados` continua, mas reforçar: para porta interior, identificar o compartimento "interior" (o que recebe rodapé descontado).

E em cada `room`, adicionar:

- `perimetro_estimado_m` — perímetro real estimado pelo bbox/cotas (não 4·√área), aproximando ao retângulo do bbox quando não há contorno melhor.
- `vaos_porta_associados` (array de índices/labels de elementos) — para o motor de rodapé.

Manter o resto do prompt como está.

### 2. Novo módulo `src/lib/plan-quantitativos-engine.ts`

Função pura `buildBudgetableQuantities(analysis)` que, a partir do JSON da Axia, devolve linhas prontas para a Tabela Unificada:

```text
INPUT  : analysis.rooms[], analysis.elements[], analysis.walls[]
OUTPUT : {
  rooms,          // pavimento + teto (m²)
  baseboards,     // rodapé por compartimento (ml)  ← perímetro − Σ larguras de portas que abrem para o compartimento
  wallSurfaces,   // paredes (m²) por compartimento = perímetro × pé_direito − Σ área de vãos
  openingsByDim,  // {tipo: porta_interior, largura: 80, altura: 210, qtd: 6}
}
```

Regras:

- Perímetro do compartimento: usa `perimetro_estimado_m` da Axia; fallback `2·(w+h)` do bbox normalizado convertido por escala; último recurso `4·√área`.
- Pé direito por defeito 2.70 m (já em `plan_rooms`).
- Largura do vão para descontar = `largura_cm/100`. Altura idem para área.
- Agregação de vãos: chave `${tipo}|${largura_cm}x${altura_cm}` → soma `count`. Output legível: "Porta interior 80×210" un.

### 3. `PlanAxiaBudgetSendDialog.tsx` — usar o motor

Substituir o cálculo atual (`perimetro = 4·√área`, elementos lançados 1 a 1 sem dimensão) por:

- Para cada folha selecionada, correr `buildBudgetableQuantities`.
- Inserir em `plan_rooms` o `perimetro_m` real do motor (não a aproximação quadrada).
- Inserir em `plan_measurements` registos do tipo `linha` para **rodapé** (um por compartimento) com `valor_bruto = perímetro útil`, `unidade = m`, `etiqueta = "Rodapé — <nome compartimento>"`, `camada = "rodape"`.
- Inserir em `plan_measurements` registos do tipo `area` para **paredes** com `valor_bruto = m² líquido`, `camada = "paredes"`.
- Inserir em `plan_placed_elements` os vãos agrupados por dimensão: um registo por (tipo, largura, altura) com `quantity = total`, `note = "Folha N · 80×210"`, e `subcategory = "porta_interior_80x210"` para que a categoria no orçamento já distinga vãos.

Adicionar nova secção no diálogo "Quantitativos derivados":
- ☑ Rodapé (perímetro − vãos)
- ☑ Paredes (m² para revestir/pintar)
- ☑ Vãos agrupados por dimensão

Estes toggles substituem a granularidade atual "Elementos" para o caso de portas/janelas (mantém-se para outros símbolos: pilar, escada, etc.).

### 4. View `plan_quantitativos_v` — leve ajuste

Já mostra rodapé/teto a partir de `plan_rooms`. Vamos:

- Acrescentar UNION para `plan_measurements` filtrado por `camada IN ('rodape','paredes')` com descrição já bonita (ex.: "Rodapé — Sala") — na verdade já cai no ramo `medicao`, basta garantir que `etiqueta` chega populada (responsabilidade do dialog).
- Para `plan_placed_elements`, melhorar `descricao` no UNION existente para usar `subcategory` (ex.: "Porta interior 80×210") e `quantity` real em vez de 1.

(Migration SQL pequena, só recria a view.)

### 5. `PlanBudgetSendDialog.tsx` — sem alterações funcionais grandes

O agrupamento por `camada` já existe, portanto ao agrupar verás capítulos: "Rodapé", "Paredes", "Pavimento", "Teto", "Vãos". Apenas:

- Substituir o aviso atual "X itens com Qtd 0" para também sugerir re-correr a leitura Axia se >50% estiver a 0 (já não deve acontecer depois desta alteração).

---

## Impacto na UI (resumo visual)

Antes:
```text
9. porta_interior   10 itens  0,00 €
   - Porta casa de banho  un  1.00  0,00 €
   - Porta wc social      un  1.00  0,00 €
   ...
```

Depois:
```text
9. Vãos
   - Porta interior 70×210   un  2.00   0,00 €
   - Porta interior 80×210   un  6.00   0,00 €
   - Porta exterior 90×210   un  1.00   0,00 €
   - Janela 120×120          un  4.00   0,00 €
10. Rodapé
   - Rodapé — Sala           m   18.40
   - Rodapé — Quarto 1       m   12.80
   ...
11. Paredes
   - Paredes — Sala (revestir)  m²  49.68
   ...
```

O preço unitário continua por preencher (responsabilidade do utilizador / Base de Preços), mas a **quantidade chega correta**.

---

## Detalhes técnicos

**Ficheiros a editar**
- `supabase/functions/axia-plan-vision/index.ts` — schema + prompt (largura_cm, altura_cm, perimetro_estimado_m, vaos_porta_associados).
- `src/lib/plan-quantitativos-engine.ts` — **novo** (motor puro + testes leves).
- `src/components/plantas/PlanAxiaBudgetSendDialog.tsx` — usa o motor, novos toggles, novos inserts.
- `src/components/plantas/PlanAIAnalysis.tsx` — mostrar dimensões dos vãos no preview (campo `largura_cm`).
- `src/components/plantas/PlanAxiaResultsTable.tsx` — coluna "Dimensão" no separador Elementos.
- `src/components/plantas/PlanBudgetSendDialog.tsx` — ajustar mensagem de aviso de Qtd 0.
- **Nova migration**: recriar `plan_quantitativos_v` para usar `subcategory + quantity` em `plan_placed_elements`.

**Não toca em**: tabelas existentes, `client.ts`, `types.ts`, fluxos fora de plantas/quantitativos.

**Compatível com dados existentes**: rooms já criados sem `perimetro_m` correto continuam a funcionar (motor recalcula no envio); plantas antigas precisam de re-correr a Axia para obter `largura_cm`/`altura_cm` dos vãos.
