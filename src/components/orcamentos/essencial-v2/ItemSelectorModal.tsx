import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Loader2, Database, Library } from 'lucide-react';
import {
  type CatalogItem,
  type BudgetItem,
  type BudgetType,
  DEFAULT_CATALOG,
  formatEUR,
} from '@/types/orcamento-essencial';
import { useBaseArtigosForArea } from '@/hooks/useBaseArtigos';
import { keywordsForArea, tipoBaseForBudget } from '@/lib/essencial-base-mapping';

interface Props {
  open: boolean;
  onClose: () => void;
  areaKey: string;
  areaLabel: string;
  budgetType: BudgetType;
  onAddItems: (items: BudgetItem[]) => void;
  /** Zona pré-selecionada (etiqueta nos itens adicionados). */
  zoneName?: string;
  /** Tipo de Serviço pré-selecionado (etiqueta nos itens adicionados). */
  serviceTypeName?: string;
}

type Source = 'base' | 'default';

interface UnifiedItem {
  id: string;          // unique within the modal
  source: Source;
  name: string;
  unit: string;
  laborPrice: number;
  materialPrice: number;
  codigo?: string;     // only when source = 'base'
}

export function ItemSelectorModal({ open, onClose, areaKey, areaLabel, budgetType, onAddItems, zoneName, serviceTypeName }: Props) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Map<string, { qty: number }>>(new Map());
  const [showCustom, setShowCustom] = useState(false);
  const [custom, setCustom] = useState({ name: '', unit: 'un', laborPrice: 0, materialPrice: 0 });

  const tipoBase = tipoBaseForBudget(budgetType);
  const capituloKeywords = keywordsForArea(areaKey);

  const { data: baseRows, isLoading: loadingBase } = useBaseArtigosForArea({
    tipoBase,
    capituloKeywords,
    enabled: open,
  });

  const baseItems: UnifiedItem[] = useMemo(() => {
    return (baseRows || []).map((r) => ({
      id: `base_${r.id}`,
      source: 'base' as Source,
      name: r.artigo,
      unit: r.unidade || 'un',
      // Para o Essencial usamos custos diretos: M.O. + Material.
      // Se não houver split, deriva do preço indicativo.
      laborPrice: Number(r.mao_obra_estimada_eur || 0),
      materialPrice: Number(r.material_estimado_eur || 0),
      codigo: r.codigo,
    }));
  }, [baseRows]);

  const defaultItems: UnifiedItem[] = useMemo(() => {
    return (DEFAULT_CATALOG[areaKey] || []).map((c) => ({
      id: `def_${c.id}`,
      source: 'default' as Source,
      name: c.name,
      unit: c.unit,
      laborPrice: c.laborPrice,
      materialPrice: c.materialPrice,
    }));
  }, [areaKey]);

  // Prefer Base items; fallback for default catalog when Base vazia.
  const allItems: UnifiedItem[] = baseItems.length > 0 ? baseItems : defaultItems;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allItems.filter((i) => !q || i.name.toLowerCase().includes(q));
  }, [allItems, search]);

  const toggleItem = (item: UnifiedItem) => {
    const next = new Map(selected);
    if (next.has(item.id)) next.delete(item.id);
    else next.set(item.id, { qty: 1 });
    setSelected(next);
  };

  const handleConfirm = () => {
    const items: BudgetItem[] = [];
    selected.forEach((val, id) => {
      const it = allItems.find((c) => c.id === id);
      if (it) {
        items.push({
          id: crypto.randomUUID(),
          areaKey,
          name: it.name,
          unit: it.unit,
          quantity: val.qty,
          laborUnitPrice: it.laborPrice,
          materialTotalPrice: it.materialPrice,
        });
      }
    });
    onAddItems(items);
    setSelected(new Map());
    setSearch('');
    onClose();
  };

  const handleAddCustom = () => {
    if (!custom.name.trim()) return;
    const items: BudgetItem[] = [{
      id: crypto.randomUUID(),
      areaKey,
      name: custom.name.trim(),
      unit: custom.unit,
      quantity: 1,
      laborUnitPrice: custom.laborPrice,
      materialTotalPrice: custom.materialPrice,
      isCustom: true,
    }];
    onAddItems(items);
    setCustom({ name: '', unit: 'un', laborPrice: 0, materialPrice: 0 });
    setShowCustom(false);
  };

  const handleClose = () => {
    setSelected(new Map());
    setSearch('');
    setShowCustom(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                  {baseItems.length > 0 ? (
                    <><Database className="h-3 w-3 mr-1" /> Base de Preços</>
                  ) : (
                    <><Library className="h-3 w-3 mr-1" /> Catálogo Default</>
                  )}
                </Badge>
                {loadingBase && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </div>
              <DialogTitle className="text-xl mt-1">{areaLabel}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {baseItems.length > 0
                  ? `${baseItems.length} artigo(s) da tua Base (${tipoBase === 'remodelacao' ? 'Remodelação' : 'Geral'})`
                  : `Sem artigos na Base para esta área - a usar catálogo embutido.`}
              </p>
            </div>
            <div className="relative w-56 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Procurar item nesta área"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
        </DialogHeader>

        {/* Custom item form */}
        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="text-xs text-primary font-medium">
            Adiciona um item teu a esta área. (fica só na tua empresa).
          </p>
          <div className="grid grid-cols-[1fr_120px_100px_100px_auto] gap-2 items-end">
            <div>
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Nome do item</Label>
              <Input
                placeholder="Ex.: Tomada simples 16A"
                value={custom.name}
                onChange={(e) => setCustom({ ...custom, name: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Unidade</Label>
              <Input
                placeholder="un / m / m²..."
                value={custom.unit}
                onChange={(e) => setCustom({ ...custom, unit: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Valor M.O. (€)</Label>
              <Input
                type="number"
                min={0}
                value={custom.laborPrice || ''}
                onChange={(e) => setCustom({ ...custom, laborPrice: parseFloat(e.target.value) || 0 })}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Valor Material (€)</Label>
              <Input
                type="number"
                min={0}
                value={custom.materialPrice || ''}
                onChange={(e) => setCustom({ ...custom, materialPrice: parseFloat(e.target.value) || 0 })}
                className="h-9 text-sm"
              />
            </div>
            <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleAddCustom} disabled={!custom.name.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Catalog items */}
        <ScrollArea className="flex-1 min-h-0">
          {loadingBase ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1">
              {filtered.map((item) => {
                const isSelected = selected.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border hover:border-border hover:bg-muted/30'
                    }`}
                  >
                    <Checkbox checked={isSelected} className="mt-0.5 pointer-events-none" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {item.codigo && (
                          <span className="text-[10px] font-mono text-muted-foreground">{item.codigo}</span>
                        )}
                        <p className="text-sm font-medium text-foreground leading-tight">{item.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Un: {item.unit} &nbsp; M.O: {formatEUR(item.laborPrice)} &nbsp; Mat.: {formatEUR(item.materialPrice)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : allItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">Sem itens predefinidos para esta área.</p>
              <p className="text-xs mt-1">Usa o formulário acima para adicionar itens personalizados.</p>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              Nenhum item encontrado para "{search}"
            </div>
          )}
        </ScrollArea>

        <Separator />

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-primary">
            Marca os itens que queres e depois "Adicionar ao orçamento".
          </p>
          <div className="flex gap-2">
            <Button
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="bg-primary hover:bg-primary/90"
            >
              Adicionar ao orçamento
            </Button>
            <Button variant="outline" onClick={handleClose}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
