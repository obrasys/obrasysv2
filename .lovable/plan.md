## Problema

Ao carregar uma planta de **pontos elétricos**, a Axia também leu a arquitetura (compartimentos, paredes, rodapés, portas) e mostrou todos os quadros arquitetónicos no detalhe. Isto polui a vista e confunde — para uma planta elétrica só interessam pontos, circuitos e quantitativos elétricos.

A causa: o campo `disciplina` já existe (arquitetura, estruturas, elétrica, canalização, AVAC, telecom, outra) mas:
1. No upload está pouco destacado (default `arquitetura`).
2. No detalhe, **todos** os painéis aparecem independentemente da disciplina.

## Objetivo

Tornar a disciplina o **filtro mestre** da experiência: ao carregar a planta o utilizador escolhe explicitamente o tipo, e o detalhe mostra **apenas** as ferramentas e cálculos dessa disciplina.

## Alterações propostas

### 1. Upload (`PlanUploadForm.tsx`)
- Promover a escolha de disciplina para o **topo do formulário**, com cards/botões grandes e ícone (Arquitetura, Estruturas, Elétrica, Canalização, AVAC, Telecom, Outra) em vez de um select discreto.
- Mostrar uma frase contextual por disciplina (ex.: *"A Axia vai detetar pontos elétricos, quadros e circuitos. Não fará leitura arquitetónica."*).
- Remover o default silencioso `arquitetura` — obrigar escolha consciente (ou manter mas com aviso visível).

### 2. Detalhe da planta (`src/pages/plantas/Detail.tsx`)
Adicionar um helper local `disciplineScope(disciplina)` que devolve flags:
- `showArchitectureTables` — Parâmetros de cálculo, Quadro discriminativo por compartimento, Quadro geral de quantitativos, Paredes, Compartimentos.
- `showElectricalAnalysis` — Botão/painel "Analisar Planta Elétrica".
- `showSpecialtyAnalysis` — Painel Axia de especialidade (canalização, AVAC, telecom, gás).
- `showSymbolPicker` — quais símbolos aparecem na barra de inserção.

Mapeamento:
| Disciplina | Arquitetura | Elétrica | Especialidade |
|---|---|---|---|
| arquitetura | sim | não | não |
| estruturas | sim (limitado) | não | não |
| eletrica | **não** | sim | não |
| canalizacao | não | não | sim (água) |
| avac | não | não | sim (avac) |
| telecom | não | não | sim (telecom) |
| outra | sim | sim | sim (tudo, modo livre) |

Aplicar as flags nos blocos:
- Bloco `Axia analysis tables` (linhas ~895-931) → só renderiza se `showArchitectureTables`.
- `PlanElectricalAnalysis` (~linha 1206) → só renderiza se `showElectricalAnalysis`.
- `PlanSymbolPicker` / `PlanInsertToolbar` → filtrar categoria de símbolos pela disciplina.
- `PlanWorkflowStepper` → ocultar passos não aplicáveis (ex.: "Compartimentos" não faz sentido para planta elétrica).

### 3. Edge function de análise
- `axia-plan-vision` (arquitetura) só é invocada quando `disciplina === 'arquitetura'` ou `'outra'`.
- `axia-electrical-analysis` para `'eletrica'`.
- `axia-specialty-vision` (já existe) para canalização/AVAC/telecom/gás, passando o tipo correto.

Não criar nova função; reusar as três existentes consoante a disciplina.

### 4. Card da planta na listagem (`PlanCard.tsx`)
- Mostrar badge da disciplina com cor/ícone para o utilizador identificar de relance.

## Fora de âmbito (não tocar)
- Estrutura da BD (a coluna `disciplina` já existe).
- Lógica financeira / orçamento.
- Módulo Especialidades em `/obras/:id/especialidades` — mantém-se como está.

## Resultado esperado

Ao carregar uma planta elétrica, o utilizador escolhe "Elétrica" no upload e no detalhe vê **apenas** o visualizador, símbolos elétricos, e o painel "Analisar Planta Elétrica" — sem quadros de paredes, rodapés ou compartimentos.
