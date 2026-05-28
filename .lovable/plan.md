# Plantas a partir do Orçamento (sem depender de Obra)

## Objetivo
Atualmente o módulo "Plantas" exige uma `obra_id`, mas obras só existem após adjudicação. Vamos permitir importar uma planta diretamente ao **criar/editar um orçamento**, com extração de quantitativos, e linkar tudo ao orçamento. Quando o orçamento for adjudicado e gerar a obra, as plantas seguem automaticamente para a obra criada.

Sem quebrar nada: rotas atuais `/obras/:id/plantas/*` continuam a funcionar.

## 1. Backend (migration)

**`plan_imports`**
- Tornar `obra_id` nullable.
- Adicionar `budget_id uuid` (FK → `orcamentos(id) ON DELETE CASCADE`), index.
- Constraint: `CHECK (obra_id IS NOT NULL OR budget_id IS NOT NULL)` — sempre ligado a um dos dois.
- RLS atualizada: utilizador pode ler/escrever plantas se for dono do orçamento OU dono da obra (manter policies existentes + nova condição via `budget_id`).
- GRANTs preservados.

**Sincronização automática (trigger)**
- No momento da adjudicação, quando o `budget_award` cria/associa uma `obra_id` ao orçamento, um trigger faz `UPDATE plan_imports SET obra_id = <nova_obra> WHERE budget_id = <orcamento>` (sem apagar `budget_id`). Assim a planta passa a estar visível também dentro da obra adjudicada.

## 2. Hooks

**`usePlanImports`**
- Aceitar `{ obraId?, budgetId? }`. Query filtra por um ou outro.
- Upload: passar `budget_id` ou `obra_id` consoante o contexto. File path passa a usar `${user.id}/${budgetId ?? obraId}/...`.

Nenhuma chamada existente quebra — assinatura permanece compatível (parâmetro string continua a ser `obraId`, novo overload por objeto).

## 3. Rotas e páginas

Adicionar rotas paralelas para o contexto de orçamento (reaproveitando as páginas existentes):
- `/orcamentos/:budgetId/plantas`
- `/orcamentos/:budgetId/plantas/:planId`
- `/orcamentos/:budgetId/plantas/:planId/quantitativos`

As páginas `plantas/Index.tsx`, `Detail.tsx`, `Quantitativos.tsx` passam a detetar o contexto via `useParams` (`obraId` vs `budgetId`) e ajustam:
- Botão "Voltar" → `/orcamentos/:id/editar` ou `/obras/:id`.
- Hooks recebem o id correto.

Rotas antigas mantidas tal e qual.

## 4. UI no fluxo de criação/edição do orçamento

**`src/pages/orcamentos/Criar.tsx`** e **`src/pages/orcamentos/Essencial.tsx`**
- Logo após o orçamento ser criado (já existe `createOrcamento.mutateAsync` que devolve `id`), exibir, ao lado do card "Importar Excel", um segundo card **"Importar Planta"** com o mesmo padrão visual.
- Antes de existir `budget_id`, o botão fica desativado com tooltip "Guarde o orçamento primeiro" — alternativamente, dispara `handleSaveDraft` automaticamente e depois redireciona.

**`src/pages/orcamentos/Editar.tsx`**
- Adicionar uma secção/CTA "Plantas e Quantitativos" que lista as plantas ligadas ao orçamento (via `usePlanImports({ budgetId })`) e botão para importar/abrir.
- A partir dos quantitativos, manter a ação já existente "Enviar para orçamento" — passa a alimentar diretamente o orçamento atual (sem precisar de obra).

## 5. Linkagem quantitativos → orçamento

O fluxo "Enviar para orçamento" (`useCanSendPlanToBudget`, `plan-budget-mapping`) hoje gera artigos a partir de uma obra. Ajuste mínimo: quando a planta tem `budget_id`, usa-se esse `budget_id` diretamente em vez de procurar o orçamento da obra.

## 6. Compatibilidade

- Botão "Importar Planta" dentro de obras continua a existir.
- Plantas antigas (só com `obra_id`) continuam a funcionar.
- Após adjudicação, o trigger garante que plantas criadas no orçamento aparecem também na obra.

## Detalhes técnicos

```text
plan_imports
├── obra_id    uuid NULL  (FK obras)
├── budget_id  uuid NULL  (FK orcamentos)  ← novo
└── CHECK (obra_id IS NOT NULL OR budget_id IS NOT NULL)

trigger orcamentos.adjudicacao:
  on award → UPDATE plan_imports
             SET obra_id = NEW.obra_id
             WHERE budget_id = NEW.budget_id AND obra_id IS NULL
```

## Fora de âmbito
- Não tocar no engine de medição/Konva.
- Não alterar permissões além do necessário para `budget_id`.
- Não remover rotas/fluxos antigos.

Confirmas que avanço com esta abordagem (manter ambos `obra_id` e `budget_id`, com sincronização automática na adjudicação)?
