# Grips nas Interseções de Paredes — Módulo Plantas

## Objetivo
Adicionar marcadores visuais ("grips") nos pontos onde linhas de paredes se cruzam ou se encontram (cantos em L, junções em T, cruzamentos em X), facilitando a leitura da estrutura e servindo de base para futura edição por arrasto.

## O que muda para o utilizador

- Sempre que duas ou mais paredes partilharem o mesmo ponto (ou pontos muito próximos, dentro de uma tolerância de snap), um **grip** quadrado aparece sobre essa interseção.
- Cores do grip indicam o tipo de junção:
  - **Cinza/Teal** — canto simples (2 paredes, em L)
  - **Âmbar** — junção em T (3 paredes)
  - **Vermelho/Primário forte** — cruzamento em X (4+ paredes)
- Hover no grip mostra tooltip com o nº de paredes e o tipo de junção.
- Durante o desenho de uma nova parede (`draw_wall`), aproximar-se de um grip existente faz **snap** ao ponto exato (já existe lógica de snap para vértices de room; estendemos para wall endpoints).
- Os grips só aparecem nos modos **select / draw_wall / draw_opening** (escondem-se em modos não relevantes para não poluir).

## Implementação técnica

### 1. `src/components/plantas/PlanViewer.tsx`
- Após o bloco que renderiza `walls` (linha ~431), adicionar um novo bloco `{/* Wall intersection grips */}`.
- Construir, via `useMemo`, um mapa `Map<string, { x, y, wallIds: string[] }>` onde a chave é o ponto arredondado (tolerância ~4px no espaço da imagem) e o valor agrega todos os endpoints de paredes que ali coincidem.
- Filtrar entradas com `wallIds.length >= 2` → são interseções reais.
- Renderizar para cada uma um `<Rect>` do Konva (8/zoom px de lado, centrado), com `stroke="white"` e `fill` consoante o tipo:
  - 2 → `#0F4C5C` (Deep Teal)
  - 3 → `#F59E0B` (âmbar)
  - 4+ → `hsl(var(--primary))`
- Envolver em `<Group>` com `listening={mode === "select"}` para permitir hover/tooltip apenas no modo seleção.
- Visibilidade controlada por `mode` (esconder em `calibrate`, `draw_room`, `count`).

### 2. Snap durante desenho de parede
- No handler de clique do canvas (lógica `draw_wall`), antes de aceitar o ponto clicado, verificar se está dentro da tolerância de algum grip e, se sim, substituir pelas coordenadas exatas do grip. Isto garante que novas paredes "fecham" perfeitamente nas interseções.

### 3. Constantes
- Adicionar no topo do ficheiro:
  ```
  const GRIP_SNAP_TOLERANCE_PX = 6;   // em coordenadas da imagem
  const GRIP_SIZE_PX = 8;             // dividido por zoom no render
  ```

## Fora do âmbil (não incluído nesta entrega)
- Arrastar grips para mover/editar a interseção de várias paredes simultaneamente (pode vir numa fase 2).
- Persistência da “junção” como entidade separada na base de dados — os grips são derivados em runtime a partir dos endpoints das paredes.

## Ficheiros alterados
- `src/components/plantas/PlanViewer.tsx` (única alteração)

## Critério de aceitação
- Carregar uma planta com paredes desenhadas em L, T e cruz → ver 3 cores distintas de grip nos pontos certos.
- Iniciar desenho de nova parede e aproximar o cursor de um grip → ponto encaixa exatamente sobre ele.
- Mudar para modo `draw_room` → grips desaparecem; voltar a `select` → reaparecem.
