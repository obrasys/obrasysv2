

## Plano: Adicionar linha de Subtotal ao Capítulo

### Resumo
Adicionar uma linha de "Subtotal Capítulo" no final da lista de artigos, alinhada à direita, exatamente como no anexo. A tabela mantém todas as colunas.

### Alteração

**`src/components/orcamentos/CapituloAccordion.tsx`** (após linha 190, depois do map dos artigos)

Adicionar uma linha de subtotal dentro do `div.space-y-2`, após os `ArtigoRow`:

```tsx
<div className="grid grid-cols-12 gap-2 px-3 py-2 border-t mt-2">
  <div className="col-span-10 text-sm font-semibold text-right">
    Subtotal Capítulo:
  </div>
  <div className="col-span-2 text-sm text-right font-semibold">
    {formatCurrency(capitulo.valor_total)}
  </div>
</div>
```

### Ficheiro
- `src/components/orcamentos/CapituloAccordion.tsx`

