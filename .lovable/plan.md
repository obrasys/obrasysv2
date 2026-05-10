## Objetivo

Quando a Axia analisar uma planta, o utilizador passa a ter três peças de informação claras e acionáveis:

1. **Overlay visual sobre a planta** (estilo da imagem de referência) com cada compartimento colorido e identificado.
2. **Quadro discriminativo por compartimento** (uma linha por compartimento).
3. **Quadro geral de quantitativos** consolidado da planta inteira.

Tudo controlado por dois parâmetros editáveis pelo utilizador (pé direito e altura das portas), com defaults **2.60 m** e **2.00 m**.

---

## 1. Overlay visual na planta (`PlanViewer.tsx`)

Cada compartimento já é desenhado como polígono. Vamos enriquecer:

- Aumentar `fill opacity` (0.10 → 0.18) para o look da imagem.
- Substituir os dois `<Text>` atuais por um bloco multi-linha único centrado no centróide:
  - Linha 1 (negrito): `{nome do compartimento}`
  - Linha 2: `{área} m² (Área)`
  - Linha 3: `— Paredes (h={pé direito} m) · {área paredes} m²`
  - Linha 4 (resumo elementos, opcional): `2 portas · 1 janela · rodapé`
- `<Rect>` semi-transparente branco (opacity 0.7, `cornerRadius={4/zoom}`) por baixo do bloco para legibilidade.
- Etiquetas de aresta (comprimento `14.01 m` + tag `(Rodapé)` / `(Soleira)` se houver porta no segmento) — só com `zoom ≥ 0.6` para evitar poluição.
- Toggle "Mostrar análise Axia" no canto superior direito do viewer para esconder/mostrar o overlay.

---

## 2. Quadro discriminativo por compartimento

Novo componente `PlanRoomBreakdownTable.tsx` (em `src/components/plantas/`).

**Colunas**

| Compartimento | Área (m²) | Rodapé (m) | Paredes (m²) | Elementos |
|---|---|---|---|---|
| Sala (✏️ renomear) | 32.83 | 18.40 | 41.20 | 2× Porta 80×200, 1× Janela 120×120 |

**Detalhes de UI**
- Nome editável inline: clique abre input; Enter ou blur salva via mutação `updatePlanRoom` (já existe em `usePlanRooms`); Esc cancela.
- Área = `room.area_m2` (apenas valor numérico, sem texto).
- Rodapé = `perímetro − Σ larguras de portas que abrem para o compartimento`.
- Paredes = `perímetro × pé direito − Σ áreas de vãos (portas + janelas)`.
- Elementos = portas + janelas associadas, agrupadas por `(tipo, largura×altura)`, ordenadas por largura desc; formato `{n}× Porta {largura}×{altura}`.
- Linha de totais no rodapé da tabela (soma de Área, Rodapé, Paredes).
- Cor da bolinha à esquerda de cada linha = mesma cor do compartimento no overlay (consistência visual).

---

## 3. Quadro geral de quantitativos da planta

Segundo componente `PlanGlobalQuantityTable.tsx` colocado **abaixo** do anterior.

**Secções (cards/tabelas pequenas lado a lado)**

1. **Portas — total por tamanho**
   `2× Porta 80×200`, `1× Porta 90×200`, `1× Portão 240×200` …
2. **Janelas — total por tamanho**
   `4× Janela 120×120`, `2× Janela 60×60` …
3. **Rodapé — total m lineares** (soma da coluna Rodapé do quadro discriminativo).
4. **Paredes interiores — total m²** (soma das paredes dos compartimentos `tipo ≠ exterior`).
5. **Paredes exteriores — estimativa m²** (perímetro do *contorno externo* da planta × pé direito − área de vãos exteriores). O contorno externo é derivado por união (convex hull simplificado) dos polígonos dos compartimentos quando não há um polígono explícito.

Cada bloco fica num card compacto (estilo `kpi-card` já existente) com ícone, valor grande e label.

---

## 4. Parâmetros editáveis (pé direito + altura porta)

Novo card pequeno **acima** dos quadros: "Parâmetros de cálculo".

- Dois `<Input type="number">` com sufixo `m`:
  - **Pé direito** (default `2.60`)
  - **Altura padrão das portas** (default `2.00`)
- Botão `Recalcular` (também recalcula automaticamente `onBlur` com debounce 400ms).
- Persistência: guardados em `plan_site_conditions` (já existe a tabela e o hook `usePlanSiteConditions`); se não houver linha, criar com upsert.
- Banner discreto na primeira análise: *"A Axia usou pé direito **2.60 m** e altura de portas **2.00 m**. Confirma ou ajusta acima."* — fecha em "Confirmar".
- A alteração propaga para: overlay (linha "h=…"), quadro discriminativo, quadro global. Recálculo é feito em memória via `useMemo`, sem nova chamada à Axia.

---

## 5. Camada de cálculo (lib pura, testável)

Novo `src/lib/plan-room-analysis.ts` que recebe:

```ts
{
  rooms,            // PlanRoom[] (com boundary_coords e area_m2)
  walls,            // opcional
  openings,         // PlanOpening[] (largura/altura/parede)
  placedElements,   // PlacedPlantElement[] (point-in-polygon)
  pixelsPerMeter,
  ceilingHeightM,   // default 2.60
  defaultDoorHeightM, // default 2.00
}
```

Devolve:

```ts
{
  perRoom: Array<{
    room_id; name; color;
    area_m2; perimeter_m; baseboard_m; walls_m2;
    elements: Array<{ tipo: "porta"|"janela"; largura_cm; altura_cm; qtd }>;
    edges: Array<{ length_m; tag?: "Rodapé"|"Soleira" }>;
  }>;
  totals: {
    doorsByDim: Array<{ largura_cm; altura_cm; qtd }>;
    windowsByDim: Array<{ largura_cm; altura_cm; qtd }>;
    baseboard_m_total: number;
    interior_walls_m2_total: number;
    exterior_walls_m2_estimate: number;
  };
}
```

Implementação:
- **Perímetro**: soma das distâncias entre vértices consecutivos do `boundary_coords`, convertida para metros via `pixelsPerMeter`.
- **Atribuição de elementos**: ray-casting point-in-polygon entre `placedElement.position` e cada `boundary_coords`.
- **Largura/altura faltante**: usa defaults do utilizador (porta 80×{altura_porta}, janela 120×120) — reutiliza `defaultsForElement` de `plan-quantitativos-engine.ts`.
- **Contorno exterior**: união aproximada por convex hull (Andrew's monotone chain, ~30 linhas) dos vértices de todos os compartimentos.

Função pura → testes unitários simples (`plan-room-analysis.test.ts`).

---

## 6. Integração no `Detail.tsx` da planta

- `useMemo` chama `computePlanRoomAnalysis(...)` quando dados mudam.
- Render abaixo do viewer:
  1. Card "Parâmetros de cálculo".
  2. `PlanRoomBreakdownTable`.
  3. `PlanGlobalQuantityTable`.
- Passa `roomAnalysis.perRoom` para `PlanViewer` como nova prop `roomAnalysis` para alimentar o overlay.
- Reutiliza o `usePlanSiteConditions` para ler/gravar pé direito + altura porta.

---

## Fora do âmbito

- Não toca em edge functions nem no motor da Axia (a estrutura JSON existente já chega).
- Não altera o envio para orçamento, PDFs ou exportações (próxima iteração pode reutilizar estes quadros para o PDF).
- Não modifica as RLS/migrações — `plan_site_conditions` já tem as colunas necessárias (caso falte `default_door_height_m`, será adicionada via migração simples antes do passo 4).

## Notas técnicas

- Konva: `<Text>` multi-linha com `\n` e `lineHeight={1.15}`.
- Edge labels: ocultar quando `zoom < 0.6`.
- Cores reutilizam `ROOM_COLORS` já definido em `PlanViewer`.
- Tabelas usam `Table` do design system + `rounded-xl` standard.
- Ordenação dos elementos: por largura desc, depois altura desc (consistente entre per-room e global).
