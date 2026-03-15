

# Corrigir Lógica de Cálculo de Margem no Obra Sys

## Problema

Todos os cálculos de margem usam **markup** (`custo × (1 + margem%)`) em vez de **margem real** (`custo / (1 - margem%)`). Isto faz com que uma margem de 30% resulte em apenas ~23% de margem real sobre o preço de venda.

## Locais a Corrigir

Identifiquei **8 ficheiros** com cálculos incorretos:

| Ficheiro | Cálculo atual (errado) | Linha(s) |
|---|---|---|
| `ArtigoForm.tsx` | `precoBase * (1 + margem/100)` | 100 |
| `useOrcamentos.ts` (updateArtigo) | `preco_base * (1 + margem/100)` | 622 |
| `ResumoTotal.tsx` | `subtotal * (margem/100)` → soma | 27-28 |
| `Ver.tsx` | `subtotalComIndiretos * (1 + margemDecimal)` | 83 |
| `Ver.tsx` | `artigo.preco_unitario * (1 + margemDecimal)` | 497, 533, 564, 573, 579, 585 |
| `orcamento-pdf.ts` | `art.preco_unitario * (1 + margemDecimal)` | 337, 394, 435, 439-441 |
| `useFiscalReports.ts` | `(valor_total + custos) * (1 + margemDecimal)` | 84 |
| `useRelatorios.ts` | `valorComMargem / (1 + margemMedia/100)` | 90 |
| `MargensLucroCard.tsx` | Exibição (sem fórmula errada, mas margem média calculada como markup) | 141 |
| `BudgetSummaryTable.tsx` | Hardcoded 85% cost estimate | 48 |

## Fórmula Correta

```text
ANTES (markup):  preço_venda = custo × (1 + margem%)
DEPOIS (margem):  preço_venda = custo / (1 - margem%)

Validação: margem deve ser >= 0 e < 100 (estritamente menor que 100)
```

## Plano de Implementação

### 1. Criar utilitário central de cálculo de margem

Novo ficheiro `src/lib/margin.ts` com funções reutilizáveis:
- `calcPrecoVenda(custo, margemPercent)` → `custo / (1 - margem/100)`
- `calcLucro(custo, margemPercent)` → `precoVenda - custo`
- `calcMargemReal(custo, precoVenda)` → `(precoVenda - custo) / precoVenda * 100`
- Validação: margem < 100%, >= 0

### 2. Corrigir ArtigoForm.tsx (linha 100)
De: `precoBase * (1 + margemLucro / 100)`
Para: `precoBase / (1 - margemLucro / 100)`
Adicionar tooltip de ajuda contextual no campo "Margem".

### 3. Corrigir useOrcamentos.ts (linha 622)
De: `formData.preco_base * (1 + margem / 100)`
Para: `formData.preco_base / (1 - margem / 100)`

### 4. Corrigir ResumoTotal.tsx (linhas 27-28)
De: `subtotal * (margem / 100)` + soma
Para: `subtotal / (1 - margem/100)` como valorFinal, lucro = valorFinal - subtotal

### 5. Corrigir Ver.tsx (linha 83 + todas as referências)
De: `subtotalComIndiretos * (1 + margemDecimal)`
Para: `subtotalComIndiretos / (1 - margemDecimal)`
Todas as multiplicações `* (1 + margemDecimal)` passam a `/ (1 - margemDecimal)`.

### 6. Corrigir orcamento-pdf.ts (linhas 337, 394, 435, 439-441)
Mesma substituição: `* (1 + margemDecimal)` → `/ (1 - margemDecimal)`

### 7. Corrigir useFiscalReports.ts (linha 84)
De: `* (1 + margemDecimal)`
Para: `/ (1 - margemDecimal)`

### 8. Corrigir useRelatorios.ts (linha 90)
De: `valorComMargem / (1 + margemMedia / 100)`
Para: `valorComMargem * (1 - margemMedia / 100)` (inverso correto)

### 9. Corrigir BudgetSummaryTable.tsx (linha 48)
Remover o hardcoded 85% e usar a margem real do orçamento.

### 10. Corrigir validação do campo margem
- `OrcamentoForm.tsx`: `.max(100)` → `.max(99.99, 'Margem deve ser inferior a 100%')`
- `ArtigoForm.tsx`: `.max(100)` → `.max(99.99, 'Margem deve ser inferior a 100%')`
- Slider max de 50 mantém-se (limite prático).

### 11. Adicionar ajuda contextual no campo Margem
Tooltip no `OrcamentoForm.tsx` e `ArtigoForm.tsx`:
> "Margem é calculada sobre o preço de venda final. Ex: 30% de margem sobre custo de 100€ = preço de venda de 142,86€."

### 12. Melhorar UI do ResumoTotal
Mostrar claramente: Custo → Margem % → Lucro € → Preço de Venda → Margem Real %.

### 13. Criar testes unitários
Ficheiro `src/lib/margin.test.ts`:
- custo 100 / margem 30% → preço 142.86
- custo 250 / margem 20% → preço 312.50
- custo 80 / margem 50% → preço 160.00
- margem 0% → preço = custo
- margem 100% → erro/inválido

