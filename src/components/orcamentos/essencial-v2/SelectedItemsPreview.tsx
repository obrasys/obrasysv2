import { type BudgetItem, type AreaConfig, formatEUR, computeItemTotals } from '@/types/orcamento-essencial';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface Props {
  items: BudgetItem[];
  allAreas: AreaConfig[];
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemoveItem: (id: string) => void;
}

export function SelectedItemsPreview({ items, allAreas, onUpdateQuantity, onRemoveItem }: Props) {
  // Group items by area
  const grouped = items.reduce<Record<string, BudgetItem[]>>((acc, item) => {
    (acc[item.areaKey] ||= []).push(item);
    return acc;
  }, {});

  const getAreaLabel = (key: string) => allAreas.find((a) => a.key === key)?.label || key;

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-6 md:p-8 shadow-sm">
      <h2 className="text-lg md:text-xl font-bold text-foreground">Itens selecionados</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Os itens escolhidos no pop-up aparecem aqui, por área.
      </p>

      {items.length === 0 ? (
        <div className="min-h-[80px]" />
      ) : (
        <div className="mt-5 space-y-5">
          {Object.entries(grouped).map(([areaKey, areaItems]) => (
            <div key={areaKey}>
              <h3 className="text-sm font-semibold text-primary mb-2">{getAreaLabel(areaKey)}</h3>
              <div className="space-y-1.5">
                {areaItems.map((item) => {
                  const { subtotal } = computeItemTotals(item);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                    >
                      <span className="flex-1 text-sm text-foreground truncate">{item.name}</span>
                      <span className="text-xs text-muted-foreground w-10 text-center">{item.unit}</span>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => onUpdateQuantity(item.id, Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 h-8 text-sm text-center"
                      />
                      <span className="text-sm font-medium tabular-nums w-20 text-right">{formatEUR(subtotal)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
                        onClick={() => onRemoveItem(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
