
## Problema 1 — Não consigo enviar a planta para o orçamento

Hoje, em `PlanBudgetGenerator.tsx`, o botão "Gerar Pré-Orçamento" só fica ativo se houver `measurements` manuais ou `openings` (`canGenerate`). Quando a Axia analisa a planta cria sobretudo `plan_rooms`, `plan_walls` e elementos colocados — não `plan_measurements`. Resultado: o utilizador "lê" a planta mas o botão fica desativado / o diálogo abre vazio sem capítulos. Além disso a lógica é centrada em construção nova (descrições "rodapé", "paredes", "pavimentos") e ignora cenários típicos de remodelação (substituir piso, pintura).

### O que vou alterar (UI/lógica frontend, sem alterar BD)

1. **`PlanBudgetGenerator.tsx`**
   - Aceitar novo prop `rooms` (lista de `plan_rooms` com áreas/perímetros calculados) e usá-lo como **fonte adicional** de quantitativos quando não há mappings/measurements.
   - Expandir `canGenerate` para `measurements.length || openings.length || rooms.length || placedElements.length`.
   - Quando o diálogo abre num plano só com rooms/elements (sem measurements), gerar automaticamente artigos placeholder a partir de cada compartimento (área de pavimento, perímetro de rodapé, área de paredes via pé-direito) — mesma estratégia já usada para placeholders, mas alimentada pelos `rooms`.
   - Adicionar um seletor visível no topo do diálogo: **"Tipo de obra desta planta"** com 2 opções:
     - `Remodelação` (default quando a base ativa é `remodelacao`) → títulos de capítulo e descrições neutras ("Pintura de paredes", "Substituição de pavimento", "Substituição de rodapé"), preço fica em branco para o utilizador preencher; aplica tipoBase=`remodelacao` no auto-match.
     - `Construção nova` → mantém títulos/descrições atuais ("Paredes - revestimento/pintura", "Pavimento - fornecimento e aplicação").
   - Trocar título default do orçamento de `Pré-Orçamento - …` para algo neutro (ex.: `Orçamento - {planName}`).

2. **`src/pages/plantas/Quantitativos.tsx`**
   - Passar `rooms` ao `PlanBudgetGenerator` (já está disponível via `usePlanRooms`).
   - Garantir que `targetBudgetId` continua a anexar capítulos ao orçamento existente (já implementado, não mexer).

3. **`src/pages/plantas/Detail.tsx`**
   - O botão "Orçamentar" (linha 852) já navega para `quantitativos?openBudget=1`. Verificar que mesmo sem `measurements` o diálogo deixa o utilizador prosseguir (resolvido pela alteração ao `canGenerate`).

Resultado: depois de carregar/analisar uma planta a partir de um orçamento, o utilizador clica "Orçamentar", escolhe Remodelação ou Construção Nova, e os capítulos/artigos são acrescentados ao orçamento atual (`targetBudgetId`) com descrições adequadas.

---

## Problema 2 — Escolha "Remodelação" vs "Construção Nova" no orçamento avançado

Hoje o orçamento avançado (`/orcamentos/criar`) cria sempre um orçamento em branco e o utilizador acrescenta os capítulos um a um. O Essencial já tem essa distinção (`BudgetType` com `remodelacao` / `construcao_nova` / lsf / icf), mas o avançado não.

### O que vou alterar

1. **`src/pages/orcamentos/Criar.tsx`** — acrescentar um passo visual antes do `OrcamentoForm`:
   ```
   ┌─────────────────────────┐ ┌─────────────────────────┐
   │ ☐ Remodelação            │ │ ☐ Construção Nova        │
   │ Orçamento em branco —    │ │ Orçamento com 38         │
   │ adiciona apenas o que    │ │ capítulos canónicos      │
   │ vai intervir.            │ │ (estrutura, acabamentos, │
   │ (estratégia Essencial)   │ │ instalações, etc.)       │
   └─────────────────────────┘ └─────────────────────────┘
   ```
   - São mutuamente exclusivos (radio com aparência de checkbox), default `remodelacao`.
   - Selecionar `remodelacao` mantém o comportamento atual (orçamento vazio).
   - Selecionar `construcao_nova` faz com que, após `createOrcamento.mutateAsync(...)`, a página invoque um helper `seedCanonicalChapters(orcamentoId)` antes de navegar para `/orcamentos/:id/editar`.

2. **Novo helper `src/lib/orcamento-seed-chapters.ts`**
   - Função `seedCanonicalChapters(orcamentoId: string)`:
     - Lê `DEFAULT_DIRECT_COST_LINES` (38 itens, já existe em `src/types/closing-sheet.ts`).
     - Insere em `capitulos_orcamento` um capítulo por entrada (`numero` 1..38, `titulo` com o label sem o prefixo numérico duplicado, `ordem` 1..38) — operação `insert(...).select()` em lote.
     - Não cria artigos (utilizador adiciona depois via catálogo / paramétrico).
   - Reutilizado pelos 3 pontos de entrada: criar orçamento avançado, criar+importar planta (quando o utilizador escolhe Construção Nova) e botão "Orçamentar" da planta (passa o tipo escolhido).

3. **`OrcamentoForm.tsx`**
   - Receber prop opcional `budgetMode: 'remodelacao' | 'construcao_nova'` (apenas para passar adiante no submit; não muda o schema do form). O `Criar.tsx` controla o estado e injeta no `onSubmit/onSaveDraft/onImportPlanta`.

4. **Sem alterações de BD** — os 38 capítulos vêm de constante TS e a inserção usa a tabela existente `capitulos_orcamento`.

5. **Compatibilidade**
   - Orçamentos existentes não são afetados.
   - Fluxo "Importar Excel" não é afetado (continua a criar capítulos a partir do ficheiro).
   - Fluxo "Criar e Importar Planta" passa a respeitar a escolha: se `construcao_nova`, semeia os 38 capítulos no orçamento criado antes de redirecionar para `/orcamentos/:id/plantas`; depois, ao gerar pré-orçamento, os capítulos da planta são anexados aos 38 existentes (já suportado por `baseChapterOrder` em `PlanBudgetGenerator`).

---

## Detalhes técnicos (resumo)

- Ficheiros editados: `src/pages/orcamentos/Criar.tsx`, `src/components/orcamentos/OrcamentoForm.tsx`, `src/pages/plantas/Quantitativos.tsx`, `src/components/plantas/PlanBudgetGenerator.tsx`.
- Ficheiros novos: `src/lib/orcamento-seed-chapters.ts`.
- Sem migração SQL. Sem alterações em RLS/grants.
- Sem alterações em `Editar.tsx` (os 38 capítulos aparecem naturalmente no editor após o seed).
