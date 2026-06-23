import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  type AreaConfig,
  type ZoneOption,
  ZONAS_PREDEFINIDAS,
  SERVICOS_POR_ZONA,
} from '@/types/orcamento-essencial';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectSeparator,
} from '@/components/ui/select';
import { useCustomZones, useCustomTipologias } from '@/hooks/useEssencialPreferences';

export const TIPOLOGIAS_IMOVEL: { value: string; label: string }[] = [
  { value: 'apartamento', label: 'Apartamento' },
  { value: 'moradia', label: 'Moradia' },
  { value: 'fracao', label: 'Fração' },
  { value: 'loja', label: 'Loja' },
  { value: 'escritorio', label: 'Escritório' },
  { value: 'armazem', label: 'Armazém' },
  { value: 'edificio', label: 'Edifício' },
];

const ADD_NEW_TIPOLOGIA = '__add_new_tipologia__';

interface Props {
  /** Áreas do tipo de obra (catálogo de itens). */
  systemAreas: AreaConfig[];
  /** Counts agrupados por chave composta `${zoneKey}::${areaKey}` ou só `areaKey`. */
  itemCounts: Record<string, number>;
  /** Chamado quando o utilizador escolhe Zona + Tipo de Serviço. */
  onServiceClick: (zone: ZoneOption, service: AreaConfig) => void;
  /** Tipologia do imóvel (apartamento, moradia, etc.). */
  propertyType?: string;
  onPropertyTypeChange?: (value: string) => void;
}

export function ZonasServicosPanel({ systemAreas, itemCounts, onServiceClick, propertyType, onPropertyTypeChange }: Props) {
  const { zones: customZones, addZone, removeZone } = useCustomZones();
  const { tipologias: customTipologias, addTipologia, removeTipologia } = useCustomTipologias();

  const [showNewZone, setShowNewZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [showNewTipologia, setShowNewTipologia] = useState(false);
  const [newTipologiaName, setNewTipologiaName] = useState('');
  const [activeZone, setActiveZone] = useState<ZoneOption | null>(null);

  const allZones = [...ZONAS_PREDEFINIDAS, ...customZones];
  const allTipologias = [...TIPOLOGIAS_IMOVEL, ...customTipologias];

  const handleAddZone = () => {
    const z = addZone(newZoneName);
    if (z) {
      setNewZoneName('');
      setShowNewZone(false);
    }
  };

  const handleAddTipologia = () => {
    const t = addTipologia(newTipologiaName);
    if (t && onPropertyTypeChange) {
      onPropertyTypeChange(t.value);
      setNewTipologiaName('');
      setShowNewTipologia(false);
    }
  };

  const servicesForZone = (zone: ZoneOption): AreaConfig[] => {
    const mapping = SERVICOS_POR_ZONA[zone.key];
    if (!mapping || mapping.length === 0) return systemAreas;
    const filtered = systemAreas.filter((a) => mapping.includes(a.key));
    return filtered.length > 0 ? filtered : systemAreas;
  };

  const countForZone = (zoneLabel: string) =>
    Object.entries(itemCounts).reduce((sum, [k, v]) => {
      if (k.startsWith(`${zoneLabel}::`)) return sum + v;
      return sum;
    }, 0);

  const countForZoneService = (zoneLabel: string, areaKey: string) =>
    itemCounts[`${zoneLabel}::${areaKey}`] || 0;

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-6 md:p-8 shadow-sm">
      {/* Tipologia do imóvel */}
      {onPropertyTypeChange && (
        <div className="mb-6 pb-5 border-b border-border/60">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-foreground">Tipologia do imóvel</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Escolhe da lista ou adiciona uma tipologia tua — fica guardada para os próximos orçamentos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 max-w-md">
            <Select
              value={propertyType || ''}
              onValueChange={(v) => {
                if (v === ADD_NEW_TIPOLOGIA) {
                  setShowNewTipologia(true);
                  return;
                }
                onPropertyTypeChange(v);
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Seleciona a tipologia" />
              </SelectTrigger>
              <SelectContent>
                {TIPOLOGIAS_IMOVEL.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
                {customTipologias.length > 0 && <SelectSeparator />}
                {customTipologias.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="flex items-center justify-between gap-2 w-full">
                      <span>{t.label}</span>
                      <span className="text-[10px] text-muted-foreground">tua</span>
                    </span>
                  </SelectItem>
                ))}
                <SelectSeparator />
                <SelectItem value={ADD_NEW_TIPOLOGIA}>
                  <span className="flex items-center gap-1.5 text-primary">
                    <Plus className="h-3.5 w-3.5" /> Adicionar nova tipologia…
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {propertyType && customTipologias.some((t) => t.value === propertyType) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                title="Eliminar tipologia personalizada"
                onClick={() => {
                  removeTipologia(propertyType);
                  onPropertyTypeChange('');
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {propertyType && (
            <p className="text-xs text-muted-foreground mt-2">
              Tipologia selecionada: <span className="text-foreground font-medium">{allTipologias.find((t) => t.value === propertyType)?.label || propertyType}</span>
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-foreground">Zonas</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Escolhe uma zona ou adiciona uma tua — as personalizadas ficam guardadas para reutilização.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowNewZone(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nova zona
        </Button>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {allZones.map((zone) => {
          const count = countForZone(zone.label);
          const isCustom = zone.key.startsWith('custom_zone_');
          return (
            <div key={zone.key} className="group relative">
              <button
                onClick={() => setActiveZone(zone)}
                className={cn(
                  'h-10 px-4 rounded-xl text-sm font-medium border transition-all cursor-pointer',
                  'hover:border-primary/40 hover:bg-primary/5',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  count > 0
                    ? 'border-primary/30 bg-primary/5 text-primary'
                    : 'border-border bg-card text-foreground'
                )}
              >
                <span className="truncate max-w-[160px] inline-block align-middle">{zone.label}</span>
                {count > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-[10px] bg-primary text-primary-foreground">
                    {count}
                  </Badge>
                )}
              </button>
              {isCustom && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeZone(zone.key); }}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive/10 hidden group-hover:flex items-center justify-center hover:bg-destructive/20 text-destructive"
                  title="Eliminar zona personalizada"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Dialog: nova zona */}
      <Dialog open={showNewZone} onOpenChange={setShowNewZone}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Zona</DialogTitle>
            <DialogDescription>
              Esta zona fica guardada na tua conta e disponível em todos os próximos orçamentos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Ex.: Apartamento 2º Esq."
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddZone()}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewZone(false)}>Cancelar</Button>
              <Button onClick={handleAddZone} disabled={!newZoneName.trim()}>Adicionar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: nova tipologia */}
      <Dialog open={showNewTipologia} onOpenChange={setShowNewTipologia}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Tipologia</DialogTitle>
            <DialogDescription>
              A tipologia fica guardada na tua conta para reutilizares.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Ex.: Anexo, Quintinha, Espaço Comercial…"
              value={newTipologiaName}
              onChange={(e) => setNewTipologiaName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTipologia()}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewTipologia(false)}>Cancelar</Button>
              <Button onClick={handleAddTipologia} disabled={!newTipologiaName.trim()}>Adicionar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: tipos de serviço para a zona ativa */}
      <Dialog open={!!activeZone} onOpenChange={(open) => { if (!open) setActiveZone(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{activeZone?.label} · Tipos de Serviço</DialogTitle>
            <DialogDescription>
              Escolhe o tipo de serviço a orçamentar nesta zona. Os itens vão ficar
              agrupados por <strong>Zona › Tipo de Serviço</strong> no resumo e nos PDFs.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 pt-2">
            {activeZone && servicesForZone(activeZone).map((svc) => {
              const c = countForZoneService(activeZone.label, svc.key);
              return (
                <button
                  key={svc.key}
                  onClick={() => {
                    const zone = activeZone;
                    setActiveZone(null);
                    onServiceClick(zone, svc);
                  }}
                  className={cn(
                    'h-10 px-4 rounded-xl text-sm font-medium border transition-all cursor-pointer',
                    'hover:border-primary/40 hover:bg-primary/5',
                    c > 0
                      ? 'border-primary/30 bg-primary/5 text-primary'
                      : 'border-border bg-card text-foreground'
                  )}
                >
                  {svc.label}
                  {c > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-[10px] bg-primary text-primary-foreground">
                      {c}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
