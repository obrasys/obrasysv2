## Objetivo

Nos capítulos do **orçamento avançado**, mostrar os artigos no formato de tabela do orçamento essencial, mas expondo as **6 categorias completas de decomposição de custo** já existentes na BD (MO, MAT, SUB, SRV, ALU, DIV). **O PDF do orçamento passa a refletir exatamente as colunas que o utilizador marcou no ecrã.**

## Colunas disponíveis

Identificação + quantidade:
- **Item** → `descricao` (com `codigo` em badge se existir)
- **Unidade** → `unidade`
- **Qtd** → `quantidade`

Preços unitários (decomposição — todas opcionais, escondidas por defeito):
- **MO €/un** → `custo_mo` (Mão de Obra)
- **MAT €/un** → `custo_mat` (Materiais)
- **SUB €/un** → `custo_sub` (Subempreitadas)
- **SRV €/un** → `custo_srv` (Serviços)
- **ALU €/un** → `custo_alu` (Alugueres)
- **DIV €/un** → `custo_div` (Diversos)

Totais por categoria (`quantidade × custo_X` — todos opcionais):
- **Tot. MO**, **Tot. MAT**, **Tot. SUB**, **Tot. SRV**, **Tot. ALU**, **Tot. DIV**

Total final:
- **Subtotal** → `valor_total` (sempre visível, não pode ser desligado)

Cada categoria mostra `—` quando o valor é `0`, para evitar ruído visual.

## Toggle de colunas (ecrã)

Barra de checkboxes por cima da tabela de artigos, agrupada por: **Identificação**, **Preços unitários**, **Totais por categoria**. Persistido em `localStorage` na chave `avancado_capitulo_columns` (partilhada entre capítulos).

Defaults visíveis: Item, Unidade, Qtd, Tot. MO, Tot. MAT, Subtotal.
Defaults escondidas: as restantes (preços unitários e totais SUB/SRV/ALU/DIV) — utilizador liga as que precisa.

Item e Subtotal são obrigatórios e não podem ser desligados.

## PDF respeita a escolha do utilizador

`src/lib/orcamento-pdf.ts` passa a:

1. Ler `localStorage.getItem('avancado_capitulo_columns')` no momento da geração (com fallback para os defaults caso esteja vazio ou inválido).
2. Construir cabeçalho e linhas da tabela de artigos dinamicamente a partir dessa lista.
3. Recalcular larguras de coluna proporcionalmente ao número de colunas ativas; se ultrapassar a largura útil da página, **rodar a página de artigos para landscape** automaticamente (mantendo o resto do PDF em portrait).
4. Manter a paginação inteligente existente (sem orphans).
5. Para valores `0` mostrar `—`.

O total do capítulo e total geral continuam a usar `valor_total` — **a escolha de colunas é puramente visual, não altera valores**.

## Compatibilidade com artigos antigos

Artigos sem decomposição (todos os `custo_*` a `0`) mostram `—` em todas as colunas de categoria. Subtotal continua correto via `valor_total`.

## Ficheiros alterados

1. **`src/components/orcamentos/CapituloAccordion.tsx`**
   - Substituir o header de 6 colunas pelo header dinâmico com até 16 colunas + ações.
   - Adicionar barra de toggles agrupados, com persistência `localStorage`.
   - Passar `visibleCols` ao `ArtigoRow`.

2. **`src/components/orcamentos/ArtigoRow.tsx`**
   - Renderização dinâmica baseada em `visibleCols`.
   - Calcular totais por categoria (`quantidade × custo_X`).
   - Mostrar `—` para valores `0`.

3. **`src/lib/orcamento-pdf.ts`**
   - Ler `localStorage` e construir tabela dinâmica.
   - Auto-landscape quando o número de colunas exceder o espaço útil.
   - Larguras proporcionais, fonte ajustada se necessário.

## Fora de scope

- Schema da BD (as 6 colunas `custo_*` já existem).
- `ArtigoForm.tsx` (já permite editar as 6 categorias — o utilizador irá ajustar a label "SUB/INS" → "SUB" no modal separadamente).
- PDF comercial (`orcamento-pdf-comercial.ts`) — continua a usar a vista resumida atual para o cliente.
- Cálculo de totais, margem e fiscalidade.