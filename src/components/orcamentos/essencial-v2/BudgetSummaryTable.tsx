import { useState, useEffect } from 'react';
import { type BudgetItem, type AreaConfig, type SummaryColumn, SUMMARY_COLUMNS, DEFAULT_VISIBLE_COLUMNS, formatEUR, computeItemTotals } from '@/types/orcamento-essencial';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { X, TrendingUp } from 'lucide-react';

const COL_STORAGE_KEY = 'essencial_summary_columns';

interface Props {
  items: BudgetItem[];
  allAreas: AreaConfig[];
  onClear: () => void;
}

export function BudgetSummaryTable({ items, allAreas, onClear }: Props) {
  const [visibleCols, setVisibleCols] = useState<SummaryColumn[]>(() => {
    try {
      const saved = localStorage.getItem(COL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_VISIBLE_COLUMNS;
    } catch {
      return DEFAULT_VISIBLE_COLUMNS;
    }
  });

  useEffect(() => {
    localStorage.setItem(COL_STORAGE_KEY, JSON.stringify(visibleCols));
  }, [visibleCols]);

  const toggleCol = (col: SummaryColumn) => {
    setVisibleCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const getAreaLabel = (key: string) => allAreas.find((a) => a.key === key)?.label || key;

  // Totals
  let totalLabor = 0;
  let totalMaterial = 0;
  items.forEach((item) => {
    const t = computeItemTotals(item);
    totalLabor += t.totalLabor;
    totalMaterial += t.totalMaterial;
  });
  const totalBase = totalLabor + totalMaterial;

  // Estimate profit (internal) — assume markup is ~15% of base
  const estimatedCost = totalBase * 0.85;
  const profit = totalBase - estimatedCost;
  const margin = totalBase > 0 ? (profit / totalBase) * 100 : 0;

  const renderCell = (item: BudgetItem, col: SummaryColumn) => {
    const t = computeItemTotals(item);
    switch (col) {
      case 'area': return getAreaLabel(item.areaKey);
      case 'item': return item.name;
      case 'unit': return item.unit;
      case 'qty': return item.quantity;
      case 'laborUnit': return formatEUR(item.laborUnitPrice);
      case 'materialTotal': return formatEUR(item.materialTotalPrice);
      case 'totalLabor': return formatEUR(t.totalLabor);
      case 'totalMaterial': return formatEUR(t.totalMaterial);
      case 'subtotal': return formatEUR(t.subtotal);
    }
  };

  const isNumeric = (col: SummaryColumn) => !['area', 'item', 'unit'].includes(col);

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-6 md:p-8 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg md:text-xl font-bold text-foreground">Resumo do Orçamento</h2>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive gap-1.5"
          onClick={onClear}
        >
          <X className="h-3.5 w-3.5" />
          Limpar orçamento
        </Button>
      </div>

      {/* Column toggles */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-5">
        {SUMMARY_COLUMNS.map((col) => (
          <label key={col.key} className="flex items-center gap-1.5 cursor-pointer select-none">
            <Checkbox
              checked={visibleCols.includes(col.key)}
              onCheckedChange={() => toggleCol(col.key)}
              className="h-4 w-4"
            />
            <span className="text-xs font-medium text-foreground">{col.label}</span>
          </label>
        ))}
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                {SUMMARY_COLUMNS.filter((c) => visibleCols.includes(c.key)).map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 font-semibold text-foreground whitespace-nowrap ${isNumeric(col.key) ? 'text-right' : 'text-left'}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.length} className="text-center py-10 text-muted-foreground">
                    Sem itens selecionados
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                    {SUMMARY_COLUMNS.filter((c) => visibleCols.includes(c.key)).map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-2.5 whitespace-nowrap ${isNumeric(col.key) ? 'text-right tabular-nums font-medium' : ''}`}
                      >
                        {renderCell(item, col.key)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Totals footer */}
        <div className="border-t bg-muted/20 px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="text-right md:text-right flex-1">
              <p className="text-sm font-semibold">
                Totais (base): <span className="text-lg tabular-nums">{formatEUR(totalBase)}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Mão de Obra: {formatEUR(totalLabor)} &nbsp;·&nbsp; Materiais: {formatEUR(totalMaterial)}
              </p>
            </div>

            {/* Profit card */}
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-5 py-4 text-center min-w-[260px]">
              <div className="flex items-center justify-center gap-2 mb-1">
                <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-700 dark:text-emerald-400">
                  Lucro previsto nesta obra
                </p>
                <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <TrendingUp className="h-3 w-3" /> PROFIT
                </span>
              </div>
              <p className="text-2xl font-black text-emerald-800 dark:text-emerald-300 tabular-nums">
                {formatEUR(profit)}
                <span className="text-sm font-normal text-emerald-600 dark:text-emerald-400 ml-1">
                  (margem ~ {margin.toFixed(1)}%)
                </span>
              </p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-1">
                Este valor é interno e <strong>não aparece no orçamento</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
