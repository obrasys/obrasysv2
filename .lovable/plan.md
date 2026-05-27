## Objetivo

No calibrador de plantas do ICF (`/icf/assistente` → passo de calibração) o utilizador só consegue arrastar a planta (pan) depois de já ter colocado os dois pontos da medida conhecida. Vamos adicionar uma ferramenta **Pan / Mão** explícita que permite arrastar a planta a qualquer momento, sem afetar os pontos já marcados.

## Alterações (apenas frontend)

Ficheiro único: `src/components/icf/assistant/IcfPlanCalibrator.tsx`

1. **Novo estado `tool`**: `'measure' | 'pan'` (predefinição `'measure'`).
2. **Novo botão na toolbar** do cabeçalho do card de visualização, junto ao Zoom In/Out/Reset:
   - Ícone `Hand` (lucide-react), com `variant` alternando entre `ghost` e `default` consoante esteja ativo.
   - Tooltip/`title`: "Mover planta (Pan)".
   - Atalho de teclado opcional: barra de espaço pressionada → modo pan temporário (nice-to-have; incluir).
3. **Comportamento do Stage Konva**:
   - `draggable = tool === 'pan' || method !== 'known_distance' || (!!pointA && !!pointB)` (mantém compatibilidade atual e ativa quando pan está selecionado).
   - `onClick`: ignorar quando `tool === 'pan'` (não coloca pontos).
   - `cursor`: `'grab'` no modo pan (e `'grabbing'` enquanto arrasta), `'crosshair'` no modo measure conhecido, `'grab'` nos restantes.
4. **Indicador visual**: badge pequeno "Modo: Pan" ao lado do título quando ativo, para o utilizador saber porque não consegue marcar pontos.
5. **Repor para `measure`** automaticamente ao clicar em "Limpar pontos" ou ao mudar de método.

## Fora de âmbito

- Sem alterações de schema, hooks, ou lógica de cálculo de escala.
- Sem alterações no `PlanCalibrationTool.tsx` (módulo de Plantas é distinto).
