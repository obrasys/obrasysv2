import { useMemo, useState } from 'react';
import { type BudgetItem, type AreaConfig, formatEUR, computeItemTotals } from '@/types/orcamento-essencial';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Pencil, MapPin, Square } from 'lucide-react';
import { useSaveArtigoToUserBase } from '@/hooks/useSaveArtigoToUserBase';
import { EditBudgetItemModal } from './EditBudgetItemModal';
import { toast } from 'sonner';

interface Props {
  items: BudgetItem[];
  allAreas: AreaConfig[];
  onUpdateQuantity: (id: string, qty: number) => void;
  onUpdateItem: (id: string, updates: Partial<BudgetItem>) => void;
  onRemoveItem: (id: string) => void;
  /** Margem global do orçamento (%). Usada como default no modal. */
  defaultMarginPct?: number;
}

export function SelectedItemsPreview({ items, allAreas, onUpdateQuantity, onUpdateItem, onRemoveItem, defaultMarginPct }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const saveToBase = useSaveArtigoToUserBase();

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

  const editingItem = items.find((i) => i.id === editingId) ?? null;

  const handleModalSave = async (updates: Partial<BudgetItem>, opts: { persistToCatalog: boolean }) => {
    if (!editingItem) return;
    onUpdateItem(editingItem.id, updates);
    if (opts.persistToCatalog) {
      const merged = { ...editingItem, ...updates };
      const r = await saveToBase({
        codigo: merged.code || merged.baseCode,
        capitulo: merged.baseCapitulo || getAreaLabel(merged.areaKey) || 'Sem capítulo',
        artigo: merged.name,
        unidade: merged.unit,
        mao_obra_estimada_eur: merged.laborUnitPrice,
        material_estimado_eur: merged.materialTotalPrice,
        subcontract_cost: merged.subUnitPrice || 0,
        service_cost: merged.srvUnitPrice || 0,
        rental_cost: merged.aluUnitPrice || 0,
        miscellaneous_cost: merged.divUnitPrice || 0,
        margem_configuravel_pct: merged.marginPct,
        tipo_base: merged.baseTipo || 'remodelacao',
        origem: merged.baseCode ? 'global' : 'manual',
        fonte_base: 'Orçamento Essencial · Edição',
        intervention_context: merged.interventionContext ?? null,
        observacoes: merged.notes ?? null,
        bumpUsage: true,
      });
      if (r.ok) {
        toast.success('Artigo atualizado no Meu Catálogo.');
        if (!editingItem.baseCode && r.codigo) onUpdateItem(editingItem.id, { baseCode: r.codigo });
      }
    } else {
      toast.success('Artigo atualizado.');
    }
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
                const custoUnit =
                  (item.laborUnitPrice || 0) +
                  (item.materialTotalPrice || 0) +
                  (item.subUnitPrice || 0) +
                  (item.srvUnitPrice || 0) +
                  (item.aluUnitPrice || 0) +
                  (item.divUnitPrice || 0);

                return (
                  <div
                    key={item.id}
                    className="rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group px-3 py-2.5 space-y-1.5"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_60px_72px_90px_90px_100px_72px] gap-2 items-center">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span className="text-sm text-foreground truncate">{item.name}</span>
                        {item.propertyTypeName && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 shrink-0 bg-primary/10 text-primary border-primary/20">
                            {item.propertyTypeName}
                          </Badge>
                        )}
                        {item.interventionContext && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 capitalize shrink-0">{item.interventionContext}</Badge>
                        )}
                      </div>
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
                      <button
                        onClick={() => setEditingId(item.id)}
                        className="text-sm font-medium tabular-nums text-right hover:text-primary transition-colors cursor-pointer"
                        title="Editar artigo"
                      >
                        {formatEUR(item.laborUnitPrice)}
                      </button>
                      <button
                        onClick={() => setEditingId(item.id)}
                        className="text-sm font-medium tabular-nums text-right hover:text-primary transition-colors cursor-pointer"
                        title="Editar artigo"
                      >
                        {formatEUR(item.materialTotalPrice)}
                      </button>
                      <span className="text-sm font-semibold tabular-nums text-right">{formatEUR(subtotal)}</span>

                      <div className="flex items-center gap-0.5 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity shrink-0" onClick={() => setEditingId(item.id)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0" onClick={() => onRemoveItem(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Composição de preços */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pl-1">
                      <span className="truncate">
                        Composição: <span className="tabular-nums">{formatEUR(item.laborUnitPrice)}</span> M.O.
                        {' + '}
                        <span className="tabular-nums">{formatEUR(item.materialTotalPrice)}</span> Mat.
                        {(item.subUnitPrice || item.srvUnitPrice || item.aluUnitPrice || item.divUnitPrice) ? (
                          <> + <span className="tabular-nums">{formatEUR((item.subUnitPrice||0)+(item.srvUnitPrice||0)+(item.aluUnitPrice||0)+(item.divUnitPrice||0))}</span> SUB/SRV/ALU/DIV</>
                        ) : null}
                        {' = '}
                        <span className="tabular-nums font-medium text-foreground">
                          {formatEUR(custoUnit)} / {item.unit}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingId(item.id)}
                        className="text-[11px] text-primary hover:underline shrink-0 ml-2"
                      >
                        Editar completo
                      </button>
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

      <EditBudgetItemModal
        open={!!editingItem}
        onOpenChange={(v) => { if (!v) setEditingId(null); }}
        item={editingItem}
        capituloLabel={editingItem ? getAreaLabel(editingItem.areaKey) : undefined}
        defaultMarginPct={defaultMarginPct}
        onSave={handleModalSave}
      />
    </div>
  );
}
