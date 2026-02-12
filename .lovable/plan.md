

# Modulo de Gestao de Pessoal / Recursos Humanos

## Resumo

Expandir o modulo de Recursos existente para incluir gestao completa de pessoal por obra, com alocacao de trabalhadores a obras e tarefas, historico de deslocacoes entre obras, e integracao financeira completa (custos do trabalhador visiveis no financeiro da obra e no financeiro global).

## O que muda para o utilizador

1. **Ficha completa do trabalhador** -- ao clicar num membro da equipa, abre uma pagina de detalhe com dados pessoais, documentos, historico de obras e resumo financeiro individual.
2. **Alocacao por obra** -- cada trabalhador pode ser alocado a uma ou mais obras com datas de inicio/fim, funcao e custo/hora ou custo/dia. Pode ser deslocado para outra obra a qualquer momento.
3. **Visao por obra** -- na pagina da obra aparece um separador "Equipa" listando todos os trabalhadores alocados, com os respetivos custos.
4. **Integracao financeira** -- os custos salariais dos trabalhadores alocados sao contabilizados automaticamente no financeiro da obra e no financeiro global como despesas de "mao de obra".
5. **Alocacao a tarefas** -- possibilidade de associar membros da equipa a tarefas do cronograma.

---

## Plano Tecnico

### Fase 1 -- Base de Dados (Migracao)

Criar nova tabela `alocacoes_obra` para registar a alocacao de membros da equipa a obras:

```text
alocacoes_obra
- id (uuid, PK)
- user_id (uuid, NOT NULL)
- membro_id (uuid, FK -> equipa_membros.id)
- obra_id (uuid, FK -> obras.id)
- data_inicio (date, NOT NULL)
- data_fim (date, nullable)
- funcao (varchar, nullable) -- funcao especifica nesta obra
- custo_hora (numeric, nullable)
- custo_dia (numeric, nullable)
- ativo (boolean, default true)
- observacoes (text, nullable)
- created_at, updated_at (timestamps)
```

Politicas RLS:
- SELECT/INSERT/UPDATE/DELETE restritas a `auth.uid() = user_id`
- Super admins podem ver todas

Adicionar coluna `obra_atual_id` (uuid, nullable) na tabela `equipa_membros` para referencia rapida da obra onde o trabalhador esta atualmente.

Adicionar coluna `membro_id` (uuid, nullable) na tabela `tarefas_cronograma` para permitir associar um membro da equipa a uma tarefa.

### Fase 2 -- Types e Hook

**Novo ficheiro** `src/types/alocacoes.ts`:
- Interface `AlocacaoObra` com joins para `equipa_membros` e `obras`
- Interface `AlocacaoObraFormData`

**Novo hook** `src/hooks/useAlocacoes.ts`:
- `useAlocacoesByObra(obraId)` -- listar trabalhadores de uma obra
- `useAlocacoesByMembro(membroId)` -- historico de obras de um trabalhador
- `createAlocacao`, `updateAlocacao`, `deleteAlocacao`
- `transferirMembro(membroId, novaObraId)` -- deslocar trabalhador, encerrando a alocacao anterior e criando nova

**Atualizar** `src/hooks/useRecursos.ts`:
- Adicionar campo `obra_atual_id` ao `createMembro` / `updateMembro`
- Fetch com join na obra atual

### Fase 3 -- UI do Modulo de Recursos (Expandido)

**Pagina de detalhe do membro** `src/pages/recursos/VerMembro.tsx`:
- Dados pessoais e contratuais
- Historico de alocacoes (obras onde trabalhou com datas)
- Resumo financeiro individual (total de custos gerados)
- Botao "Alocar a Obra" / "Transferir"

**Formulario de alocacao** `src/components/recursos/AlocacaoForm.tsx`:
- Dialog para selecionar obra, funcao, custo/hora ou custo/dia, data inicio

**Atualizar** `src/pages/recursos/Index.tsx`:
- Na tab "Equipa", mostrar coluna "Obra Atual"
- Link para pagina de detalhe do membro
- Filtro por obra

### Fase 4 -- Integracao com Obras

**Atualizar** `src/pages/obras/Ver.tsx`:
- Adicionar separador/seccao "Equipa" mostrando os membros alocados a esta obra
- Card resumo com total de custos de mao de obra

**Novo componente** `src/components/obras/ObraEquipaTab.tsx`:
- Lista de membros alocados com funcao e custo
- Botoes para alocar novo membro ou transferir

### Fase 5 -- Integracao Financeira

**Atualizar** `src/pages/obras/Financeiro.tsx`:
- Adicionar card "Custos de Pessoal" que soma os custos das alocacoes ativas para esta obra
- Estes valores aparecem na categoria "mao_de_obra" do dashboard

**Atualizar** `src/hooks/useFinanceiro.ts`:
- No calculo do dashboard, incluir custos de alocacoes da tabela `alocacoes_obra` na secao `contasPorOrigem.mao_de_obra`

**Atualizar** financeiro global (`src/pages/financeiro/Index.tsx`):
- Incluir custos de pessoal agregados por obra

### Fase 6 -- Integracao com Tarefas

**Atualizar** `src/components/tarefas/TarefaForm.tsx` e `CronogramaForm.tsx`:
- Adicionar campo opcional para selecionar membro da equipa (filtrado pela obra da tarefa)

### Fase 7 -- Rotas

Adicionar em `src/App.tsx`:
- `/recursos/:id` -> `VerMembro` (pagina de detalhe)

---

## Ficheiros a criar
- `src/types/alocacoes.ts`
- `src/hooks/useAlocacoes.ts`
- `src/pages/recursos/VerMembro.tsx`
- `src/components/recursos/AlocacaoForm.tsx`
- `src/components/obras/ObraEquipaTab.tsx`

## Ficheiros a modificar
- `src/types/recursos.ts` (campo obra_atual_id)
- `src/hooks/useRecursos.ts` (join obra atual)
- `src/pages/recursos/Index.tsx` (coluna obra, link detalhe)
- `src/pages/obras/Ver.tsx` (tab equipa)
- `src/pages/obras/Financeiro.tsx` (card custos pessoal)
- `src/hooks/useFinanceiro.ts` (incluir custos alocacoes)
- `src/pages/financeiro/Index.tsx` (custos pessoal global)
- `src/components/tarefas/TarefaForm.tsx` (campo membro)
- `src/App.tsx` (rota /recursos/:id)
- Migracao SQL (nova tabela + colunas)

