## Objetivo

Refinar o módulo Plantas com 3 alterações:

1. Rótulo "Perímetro" passa a aparecer como **"Rodapé"** no resumo de dimensões e nas medições derivadas (já é calculado como soma das arestas do polígono — só muda o label).
2. Reduzir a barra de leitura da planta a **dois botões**: `Segmento` e `Contagem` (remover Linha, Área, Compartimento, Parede, Vão da barra principal — a lógica de área de polígono passa a ser acionada **dentro do Segmento** quando o utilizador fecha um polígono).
3. Adicionar ao Segmento um painel de **ação construtiva** com 5 opções (Demolir / Construir / Barrar / Pintar / Revestir) e campos contextuais (espessura, material).

---

## 1. Renomear "Perímetro" → "Rodapé"

**Ficheiro:** `src/pages/plantas/Detail.tsx`

- Na função `handleConfirmSave` (linha ~444): a etiqueta auto-gerada para o registo de perímetro passa a ser `${baseEtiqueta} — Rodapé` em vez de `— Perímetro`.
- No `Dialog` de gravação de área: o label visível "Perímetro" passa a "Rodapé (perímetro)" para manter clareza técnica mas alinhar a terminologia pedida.
- No bloco de resumo (`Summary bar`, linha ~641): adicionar um chip dedicado "Rodapé: X m" (soma das medições com etiqueta a terminar em "— Rodapé").
- O cálculo continua a ser `calculatePolygonPerimeter` (já soma todas as arestas, incluindo a de fecho) — sem alteração de lógica.

---

## 2. Simplificar a barra de leitura

**Ficheiro:** `src/components/plantas/PlanMeasurementToolbar.tsx`

A toolbar atual expõe 7 modos. Vamos reduzi-la a **2 botões visíveis**:

- **Segmento** (`measure_line` reaproveitado e renomeado) — passa a ser a ferramenta única de desenho. Comportamento:
  - 2 cliques → segmento de parede isolada (abre painel de ação construtiva).
  - 3+ cliques + duplo-clique → fecha polígono → abre o diálogo já existente com Área + Rodapé + Paredes (mantém todo o cálculo atual de aberturas/pé-direito).
- **Contagem** (`measure_count`) — mantém-se como está.

Botões removidos da UI (mas modos preservados internamente para retrocompatibilidade com medições já guardadas): `measure_line` separado, `measure_area` separado, `draw_room`, `draw_wall`, `draw_opening`. Esses fluxos deixam de ser acessíveis a partir da barra principal — o "Segmento" cobre os dois casos (linha simples vs polígono fechado) consoante o utilizador faz duplo-clique ou pára em 2 pontos.

**Ficheiro:** `src/pages/plantas/Detail.tsx` (handler `handleCanvasComplete`)
- Quando `activePoints.length === 2` no modo Segmento → abrir o **novo diálogo de Segmento** (ver secção 3) em vez do diálogo genérico de linha.
- Quando `activePoints.length >= 3` → comportamento atual (diálogo de área com Rodapé/Paredes).

---

## 3. Diálogo de Segmento (parede isolada) com ações construtivas

**Novo componente:** `src/components/plantas/PlanSegmentDialog.tsx`

Aberto quando o utilizador conclui um segmento de 2 pontos. Mostra:

- **Comprimento** (m) — calculado a partir dos 2 pontos e do `pixelsPerMeter`.
- **Pé direito** (m) — campo editável, default `2.70`.
- **Área da parede** (m²) — calculada em tempo real (`comprimento × pé direito`).
- Bloco "Aberturas" (Janela / Porta) — reaproveitado da lógica já existente em `Detail.tsx`, subtrai à área bruta.
- **Ação construtiva** — `RadioGroup` com 5 opções:
  - `demolir` → mostra campo **Espessura da parede (cm)** → calcula e mostra **Volume a remover (m³)** = `comprimento × pé direito × espessura/100`.
  - `construir` → mostra `Select` **Material**, populado a partir da tabela `materials` da Base de Preços (categoria filtrada por keywords: "tijolo", "bloco", "pladur", "gesso cartonado", "madeira"…), com fallback a uma lista estática se nenhum material existir. Mostra também espessura.
  - `barrar` / `pintar` / `revestir` → apenas guardam a ação como tag (sem campos extra obrigatórios — só etiqueta livre opcional).
- Etiqueta opcional + camada (igual ao diálogo atual).

**Persistência (gravação):**

Ao confirmar, cria múltiplos registos via `addMeasurement.mutateAsync` para alimentar dimensionamento (pisos/pinturas/revestimentos):

| Tipo | Etiqueta | Unidade | Notas |
|---|---|---|---|
| `linha` | `Segmento — <ação>` | `m` | comprimento da parede |
| `area` | `Parede — <ação> (h=X.XX m)` | `m²` | área líquida (após aberturas) |
| `area` | `Volume — Demolição` (apenas demolir) | `m³` | gravado como área com observação contendo o volume; `unidade = "m³"` |

Em todos os casos a `observacao` regista: ação, material (se aplicável), espessura, número de aberturas e fórmula usada — para posterior cross-check com a Base de Preços e geração de orçamento.

---

## Hook auxiliar para materiais

**Novo helper** (dentro do dialog ou em `src/hooks/usePlanWallMaterials.ts`):

```ts
// Faz query a 'materials' filtrando por nomes/categorias relevantes para paredes.
// Devolve [{ id, nome, unidade_base }]. Fallback estático:
// ['Tijolo cerâmico', 'Bloco de betão', 'Pladur (gesso cartonado)', 'Madeira', 'Outro']
```

Reutiliza `useBasePrecos` se já expuser uma listagem; caso contrário, faz `supabase.from('materials').select(...).ilike('nome', ...)`.

---

## Detalhes técnicos

- O `MeasureMode` mantém todos os literais existentes para não partir tipos guardados; apenas a UI deixa de expor os botões removidos. Adiciona-se `"measure_segment"` como alias (ou reaproveita `measure_line` com flag interna) — proposta: **reaproveitar `measure_line`** e diferenciar pelo número de pontos no `handleCanvasComplete`, evitando migração de dados.
- O diálogo de área existente (`showSaveDialog` quando `pendingSave.tipo === "area"`) mantém-se como está, apenas com o label "Perímetro" → "Rodapé".
- As medições antigas continuam a funcionar — apenas os novos registos passam a usar a nova nomenclatura.

---

## Ficheiros impactados

- `src/components/plantas/PlanMeasurementToolbar.tsx` — reduzir para 2 botões.
- `src/components/plantas/PlanWorkflowBar.tsx` — verificar se passa props que precisem ajuste (provavelmente nenhum).
- `src/components/plantas/PlanSegmentDialog.tsx` — **NOVO**.
- `src/pages/plantas/Detail.tsx` — renomear "Perímetro"→"Rodapé", roteamento do `handleCanvasComplete` para o novo diálogo, integração da gravação multi-registo.
- (opcional) `src/hooks/usePlanWallMaterials.ts` — **NOVO**, lookup à Base de Preços.

## Fora do âmbito

- Não alterar a estrutura da BD `plan_measurements` (já suporta `observacao` livre + `etiqueta` + `unidade` — chega para tudo).
- Não mexer no fluxo de calibração nem em "Compartimento/Parede/Vão" persistidos (continuam a existir nas tabs laterais para edição de dados antigos, só não são iniciáveis pela barra).
