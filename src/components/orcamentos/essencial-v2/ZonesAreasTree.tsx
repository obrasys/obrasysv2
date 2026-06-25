import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Layers, MapPin, Square, Wrench } from 'lucide-react';
import { type BudgetItem, type AreaConfig, formatEUR, computeItemTotals } from '@/types/orcamento-essencial';
import { calcPrecoVenda } from '@/lib/margin';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Props {
  items: BudgetItem[];
  allAreas: AreaConfig[];
  marginPercent: number;
}

const NO_ZONE = '__no_zone__';
const NO_AREA = '__no_area__';

interface TotalsRow {
  custo: number;
  venda: number;
  margem: number;
  margemPct: number;
}

function rowTotals(items: BudgetItem[], marginPercent: number): TotalsRow {
  let custo = 0;
  let venda = 0;
  items.forEach((i) => {
    const { subtotal } = computeItemTotals(i);
    custo += subtotal;
    venda += marginPercent > 0 ? calcPrecoVenda(subtotal, marginPercent) : subtotal;
  });
  const margem = venda - custo;
  const margemPct = venda > 0 ? (margem / venda) * 100 : 0;
  return { custo, venda, margem, margemPct };
}

function TotalsBadges({ t }: { t: TotalsRow }) {
  return (
    <div className="flex items-center gap-2 text-[11px] tabular-nums shrink-0">
      <span className="text-muted-foreground">Custo <strong className="text-foreground">{formatEUR(t.custo)}</strong></span>
      <span className="text-muted-foreground">Venda <strong className="text-foreground">{formatEUR(t.venda)}</strong></span>
      <span className={cn('font-medium', t.margem >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
        {formatEUR(t.margem)} · {t.margemPct.toFixed(1)}%
      </span>
    </div>
  );
}

export function ZonesAreasTree({ items, allAreas, marginPercent }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const getAreaLabel = (key: string) => allAreas.find((a) => a.key === key)?.label || key;

  // Build tree: chapter -> zone -> area -> items[]
  const tree = useMemo(() => {
    const byChapter: Record<string, Record<string, Record<string, BudgetItem[]>>> = {};
    for (const it of items) {
      const c = it.areaKey;
      const z = it.zoneName?.trim() || NO_ZONE;
      const a = it.areaName?.trim() || NO_AREA;
      (((byChapter[c] ||= {})[z] ||= {})[a] ||= []).push(it);
    }
    return byChapter;
  }, [items]);

  const chapterKeys = Object.keys(tree);

  if (chapterKeys.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Ainda não há itens. Adiciona serviços para os organizar por Área e Tipo de Serviço.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-4 md:p-6 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-foreground">Áreas e Tipos de Serviço</h2>
          <p className="text-xs text-muted-foreground">
            Hierarquia Capítulo → Área de Intervenção → Tipo de Serviço → Item. Totais por nível.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {chapterKeys.map((capKey) => {
          const capItems = Object.values(tree[capKey]).flatMap((z) => Object.values(z).flat());
          const capT = rowTotals(capItems, marginPercent);
          const capCollapsed = collapsed.has(`c:${capKey}`);
          return (
            <div key={capKey} className="rounded-xl border border-border/60 overflow-hidden">
              <button
                onClick={() => toggle(`c:${capKey}`)}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors"
              >
                {capCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <Layers className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground flex-1 text-left truncate">
                  {getAreaLabel(capKey)}
                </span>
                <Badge variant="secondary" className="text-[10px]">{capItems.length} serv.</Badge>
                <TotalsBadges t={capT} />
              </button>

              {!capCollapsed && (
                <div className="bg-background">
                  {Object.entries(tree[capKey]).map(([zoneKey, zoneAreas]) => {
                    const zoneItems = Object.values(zoneAreas).flat();
                    const zoneT = rowTotals(zoneItems, marginPercent);
                    const zoneId = `z:${capKey}:${zoneKey}`;
                    const zoneCollapsed = collapsed.has(zoneId);
                    const isNoZone = zoneKey === NO_ZONE;
                    return (
                      <div key={zoneId} className="border-t border-border/60">
                        <button
                          onClick={() => toggle(zoneId)}
                          className="w-full flex items-center gap-2 pl-8 pr-3 py-2 hover:bg-muted/30 transition-colors"
                        >
                          {zoneCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          <MapPin className={cn('h-3.5 w-3.5', isNoZone ? 'text-muted-foreground' : 'text-primary/80')} />
                          <span className={cn('text-sm flex-1 text-left truncate', isNoZone && 'italic text-muted-foreground')}>
                            {isNoZone ? 'Sem zona' : zoneKey}
                          </span>
                          <Badge variant="outline" className="text-[10px]">{zoneItems.length} serv.</Badge>
                          <TotalsBadges t={zoneT} />
                        </button>

                        {!zoneCollapsed && (
                          <div>
                            {Object.entries(zoneAreas).map(([areaKey, areaItems]) => {
                              const areaT = rowTotals(areaItems, marginPercent);
                              const areaId = `a:${capKey}:${zoneKey}:${areaKey}`;
                              const areaCollapsed = collapsed.has(areaId);
                              const isNoArea = areaKey === NO_AREA;
                              return (
                                <div key={areaId} className="border-t border-border/40">
                                  <button
                                    onClick={() => toggle(areaId)}
                                    className="w-full flex items-center gap-2 pl-14 pr-3 py-1.5 hover:bg-muted/20 transition-colors"
                                  >
                                    {areaCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                    <Square className={cn('h-3 w-3', isNoArea ? 'text-muted-foreground' : 'text-primary/70')} />
                                    <span className={cn('text-xs flex-1 text-left truncate', isNoArea && 'italic text-muted-foreground')}>
                                      {isNoArea ? 'Sem área' : areaKey}
                                    </span>
                                    <Badge variant="outline" className="text-[10px]">{areaItems.length}</Badge>
                                    <TotalsBadges t={areaT} />
                                  </button>

                                  {!areaCollapsed && (
                                    <ul className="divide-y divide-border/30">
                                      {areaItems.map((it) => {
                                        const { subtotal } = computeItemTotals(it);
                                        const venda = marginPercent > 0 ? calcPrecoVenda(subtotal, marginPercent) : subtotal;
                                        return (
                                          <li key={it.id} className="flex items-center gap-2 pl-20 pr-3 py-1.5 text-xs">
                                            <Wrench className="h-3 w-3 text-muted-foreground shrink-0" />
                                            <span className="flex-1 truncate text-foreground">{it.name}</span>
                                            <span className="text-muted-foreground tabular-nums">
                                              {it.quantity} {it.unit}
                                            </span>
                                            <span className="font-medium tabular-nums w-24 text-right">
                                              {formatEUR(venda)}
                                            </span>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
