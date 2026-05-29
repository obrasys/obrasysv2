## Objectivo
Tal como já acontece nos campos % do bloco **Terreno** (Taxa IMT, Imposto do Selo, Custos Notário), passar a mostrar a linha auxiliar `= 44 771,60 €` por baixo de **todos** os restantes campos em percentagem da Folha de Fecho, com o resultado calculado em tempo real a partir da base correcta.

## Ficheiro a alterar
`src/components/orcamentos/ClosingSheetFullView.tsx` (apenas UI — sem mexer em schema, cálculos ou hooks).

## Campos a actualizar e respectiva base de cálculo
Bases já disponíveis em `totals` (já calculadas em `computeClosingTotals`).

**Indirectos (3)**
- Seguros (% s/ constr.) → `custo_industrial × seguros_pct`
- Taxas/Impostos/Encargos Prediais (% s/ constr.) → `custo_industrial × taxas_impostos_prediais_pct`
- Publicidade / Marketing (% s/ vendas) → `valor_vendas × publicidade_marketing_pct`
- Honorários Comercialização (% s/ vendas) → `valor_vendas × honorarios_comercializacao_pct`

**Outros (4)**
- Projectos (% s/ constr.) → `custo_industrial × projectos_pct`
- Imprevistos / Áleas (% s/ indirectos) → `total_indirectos × imprevistos_aleas_pct`

**IVA (6)**
- Taxa IVA Terreno (%) → `total_terreno × taxa_terreno_pct` (0 € se zona ARU/ORU activa — refletir esse caso)
- Taxa IVA Construção Civil (%) → `base_iva_construcao × taxa_construcao_pct`
- Taxa IVA Honorários & Outros (%) → `(total_indirectos + total_admin) × taxa_honorarios_pct`

## Implementação (UI)
Para cada campo acima, inserir, logo abaixo do `<NumCell>`, o mesmo padrão visual já usado no Terreno:

```tsx
<p className="text-[11px] text-muted-foreground text-right mt-1">
  = {fmt(baseValue * pctValue)}
</p>
```

- Reutilizar o helper `fmt` já existente no ficheiro.
- Manter alinhamento à direita, tamanho e tom igual aos campos do Terreno para coerência visual.
- Para o IVA Terreno, quando `zona_aru || zona_oru` for `true`, mostrar `= 0,00 €` (isento) em vez do cálculo bruto.

## Fora do âmbito
- Não alterar `closing-sheet.ts`, hooks, RPCs ou lógica de cálculo.
- Não alterar bloco Terreno (já tem este padrão).
- Não tocar nos campos em € (não aplicável).
