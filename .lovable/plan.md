

# Selector de Cliente no Formulário de Obras

## Resumo
Substituir o campo de texto livre "Cliente" no formulário de criação/edição de Obras por um selector que lista os clientes cadastrados. Ao selecionar um cliente, exibir automaticamente o telefone e e-mail. Isso garante que a obra fique vinculada ao cliente (via `cliente_id`), facilitando o fluxo posterior de criação de orçamentos.

---

## Alteracoes

### 1. `src/types/obras.ts` - Adicionar `cliente_id` ao `ObraFormData`

Adicionar o campo `cliente_id` como opcional no tipo `ObraFormData` e manter `cliente` (nome) para compatibilidade.

### 2. `src/components/obras/ObraForm.tsx` - Reformular campo Cliente

- Importar `useClientes` de `@/hooks/useClientes`
- Substituir o `<Input>` de texto "Cliente" por um `<Select>` com a lista de clientes ativos
- Cada opcao mostra o nome do cliente (e empresa se houver)
- Ao selecionar um cliente, preencher automaticamente `cliente_id` e o campo `cliente` (nome)
- Abaixo do selector, exibir em campos somente-leitura o telefone e e-mail do cliente selecionado
- Adicionar link "Criar novo cliente" caso nao haja clientes cadastrados

### 3. `src/hooks/useObras.ts` - Enviar `cliente_id` na criacao/atualizacao

Na mutation `createObra` e `updateObra`, incluir o campo `cliente_id` ao inserir/atualizar na base de dados.

---

## Detalhes Tecnicos

### ObraForm.tsx - Mudancas principais

```text
Antes:
  Campo texto livre "Cliente" -> salva string em obras.cliente

Depois:
  Select dropdown com clientes ativos -> salva:
    - obras.cliente_id (uuid do cliente)
    - obras.cliente (nome do cliente, para retrocompatibilidade)
  + Exibe telefone e email do cliente selecionado (readonly)
  + Link para /clientes/criar se lista vazia
```

### Fluxo do formulario

```text
1. Utilizador abre formulario de nova obra
2. No campo "Cliente", ve dropdown com clientes cadastrados
3. Seleciona um cliente
4. Telefone e email aparecem automaticamente abaixo
5. Ao submeter, obra fica vinculada via cliente_id
6. No fluxo de orcamento, o cliente ja esta disponivel
```

### Ficheiros alterados
- `src/types/obras.ts` - Adicionar `cliente_id` ao `ObraFormData`
- `src/components/obras/ObraForm.tsx` - Selector de clientes + exibicao de contactos
- `src/hooks/useObras.ts` - Incluir `cliente_id` no insert/update
