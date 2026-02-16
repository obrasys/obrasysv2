

## Corrigir Erros 406 no Console

### Problema Identificado

Os erros **406 (Not Acceptable)** nos pedidos a `relatorios_diarios` acontecem porque o codigo usa `.single()` para buscar o ultimo relatorio diario de cada obra. Quando uma obra nao tem nenhum relatorio, o servidor retorna erro 406 em vez de resultado vazio.

Adicionalmente, existe uma referencia a uma coluna inexistente (`descricao_geral`) numa consulta do portal do cliente.

O erro `Cannot use 'import.meta' outside a module` vem de uma extensao do browser (frame_ant.js) e nao do codigo da aplicacao.

### Correcoes

**1. Ficheiro `src/hooks/useRDOs.ts` (linha 94)**
- Substituir `.single()` por `.maybeSingle()` na consulta do ultimo RDO por obra
- `.maybeSingle()` retorna `null` quando nao ha resultados em vez de lancar erro 406

**2. Ficheiro `src/hooks/useObraAlerts.ts` (linha 57)**
- Mesmo problema: substituir `.single()` por `.maybeSingle()`

**3. Ficheiro `src/hooks/useClientPortal.ts` (linha 68)**
- Remover `descricao_geral` da lista de colunas selecionadas (esta coluna nao existe na tabela `relatorios_diarios`)
- Substituir por `observacoes` que e a coluna correta

### Resultado
- Os erros 406 desaparecem do console
- Obras sem relatorios diarios deixam de causar erros
- O portal do cliente passa a carregar os relatorios corretamente
