import { useMemo, useState } from 'react';
import { type BudgetItem, type AreaConfig, formatEUR, computeItemTotals } from '@/types/orcamento-essencial';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Pencil, Check, X, MapPin, Square } from 'lucide-react';

interface Props {
  items: BudgetItem[];
  allAreas: AreaConfig[];
  onUpdateQuantity: (id: string, qty: number) => void;
  onUpdateItem: (id: string, updates: Partial<BudgetItem>) => void;
  onRemoveItem: (id: string) => void;
}

export function SelectedItemsPreview({ items, allAreas, onUpdateQuantity, onUpdateItem, onRemoveItem }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ labor: number; material: number }>({ labor: 0, material: 0 });

  // Group items by area
  const grouped = items.reduce<Record<string, BudgetItem[]>>((acc, item) => {
    (acc[item.areaKey] ||= []).push(item);
    return acc;
  }, {});

  const getAreaLabel = (key: string) => allAreas.find((a) => a.key === key)?.label || key;

  // Datalists for autocomplete reuse of zones/areas
  const knownZonesPerChapter = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    items.forEach((it) => {
      if (it.zoneName?.trim()) ((m[it.areaKey] ||= new Set<string>()).add(it.zoneName.trim()));
    });
    return m;
  }, [items]);

  const knownAreasPerZone = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    items.forEach((it) => {
      const zone = it.zoneName?.trim();
      const area = it.areaName?.trim();
      if (zone && area) ((m[`${it.areaKey}::${zone}`] ||= new Set<string>()).add(area));
    });
    return m;
  }, [items]);

  const startEdit = (item: BudgetItem) => {
    setEditingId(item.id);
    setEditValues({ labor: item.laborUnitPrice, material: item.materialTotalPrice });
  };

  const confirmEdit = (id: string) => {
    onUpdateItem(id, { laborUnitPrice: editValues.labor, materialTotalPrice: editValues.material });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-6 md:p-8 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg md:text-xl font-bold text-foreground">Itens selecionados</h2>
        <span className="text-xs text-muted-foreground tabular-nums">{items.length} {items.length === 1 ? 'item' : 'itens'}</span>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Edite quantidades, valores e atribua Zona/Área (opcional) a cada serviço.
      </p>


      <div className="space-y-6">
        {Object.entries(grouped).map(([areaKey, areaItems]) => (
          <div key={areaKey}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">{getAreaLabel(areaKey)}</h3>

            {/* Header */}
            <div className="hidden md:grid grid-cols-[1fr_60px_72px_90px_90px_100px_72px] gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              <span>Descrição</span>
              <span className="text-center">Un.</span>
              <span className="text-center">Qtd</span>
              <span className="text-right">M.O. €/un</span>
              <span className="text-right">Mat. €/un</span>
              <span className="text-right">Subtotal</span>
              <span />
            </div>

            <div className="space-y-1">
              {areaItems.map((item) => {
                const { subtotal } = computeItemTotals(item);
                const isEditing = editingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group px-3 py-2.5 space-y-1.5"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_60px_72px_90px_90px_100px_72px] gap-2 items-center">
                      <span className="text-sm text-foreground truncate">{item.name}</span>
                      <span className="text-xs text-muted-foreground text-center">{item.unit}</span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        defaultValue={String(item.quantity)}
                        key={`qty-${item.id}-${item.quantity}`}
                        onBlur={(e) => {
                          const raw = e.target.value.replace(',', '.').trim();
                          if (raw === '') { e.target.value = String(item.quantity); return; }
                          const n = parseFloat(raw);
                          if (!isFinite(n) || n < 0) { e.target.value = String(item.quantity); return; }
                          const rounded = Math.round(n * 1000) / 1000;
                          if (rounded !== item.quantity) onUpdateQuantity(item.id, rounded);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
                        }}
                        className="w-full h-8 text-sm text-center"
                      />
                      {isEditing ? (
                        <>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={editValues.labor}
                            onChange={(e) => setEditValues(v => ({ ...v, labor: parseFloat(e.target.value) || 0 }))}
                            className="h-8 text-sm text-right"
                            autoFocus
                          />
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={editValues.material}
                            onChange={(e) => setEditValues(v => ({ ...v, material: parseFloat(e.target.value) || 0 }))}
                            className="h-8 text-sm text-right"
                          />
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(item)}
                            className="text-sm font-medium tabular-nums text-right hover:text-primary transition-colors cursor-pointer"
                            title="Clique para editar"
                          >
                            {formatEUR(item.laborUnitPrice)}
                          </button>
                          <button
                            onClick={() => startEdit(item)}
                            className="text-sm font-medium tabular-nums text-right hover:text-primary transition-colors cursor-pointer"
                            title="Clique para editar"
                          >
                            {formatEUR(item.materialTotalPrice)}
                          </button>
                        </>
                      )}
                      <span className="text-sm font-semibold tabular-nums text-right">{formatEUR(subtotal)}</span>

                      <div className="flex items-center gap-0.5 justify-end">
                        {isEditing ? (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary" onClick={() => confirmEdit(item.id)}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={cancelEdit}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity shrink-0" onClick={() => startEdit(item)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0" onClick={() => onRemoveItem(item.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Zona / Área opcional — datalist com nomes já usados */}
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-2 pl-1">
                      <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <Input
                          list={`zones-${areaKey}`}
                          placeholder="Zona (opcional)"
                          value={item.zoneName ?? ''}
                          onChange={(e) => {
                            const z = e.target.value;
                            // Mudou zona → limpar área se não pertencer
                            onUpdateItem(item.id, {
                              zoneName: z || undefined,
                              ...(z ? {} : { areaName: undefined }),
                            });
                          }}
                          className="h-7 text-xs"
                        />
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Square className="h-3 w-3 shrink-0" />
                        <Input
                          list={item.zoneName ? `areas-${areaKey}-${item.zoneName}` : undefined}
                          placeholder={item.zoneName ? 'Área (opcional)' : 'Defina uma zona primeiro'}
                          value={item.areaName ?? ''}
                          disabled={!item.zoneName?.trim()}
                          onChange={(e) => onUpdateItem(item.id, { areaName: e.target.value || undefined })}
                          className="h-7 text-xs"
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
              {/* Datalists para autocomplete por capítulo / zona */}
              <datalist id={`zones-${areaKey}`}>
                {Array.from(knownZonesPerChapter[areaKey] || []).map((z) => (
                  <option key={z} value={z} />
                ))}
              </datalist>
              {Array.from(knownZonesPerChapter[areaKey] || []).map((z) => (
                <datalist key={z} id={`areas-${areaKey}-${z}`}>
                  {Array.from(knownAreasPerZone[`${areaKey}::${z}`] || []).map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
