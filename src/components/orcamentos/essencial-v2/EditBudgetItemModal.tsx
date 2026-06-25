import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Save, Calculator } from 'lucide-react';
import { formatEUR, type BudgetItem, type InterventionContext, CONTEXT_OPTIONS } from '@/types/orcamento-essencial';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: BudgetItem | null;
  capituloLabel?: string;
  defaultMarginPct?: number;
  onSave: (updates: Partial<BudgetItem>, opts: { persistToCatalog: boolean }) => Promise<void> | void;
}

const UNIDADES = ['un', 'm', 'm2', 'm3', 'kg', 'l', 'h', 'dia', 'vg', 'ml', 'pç'];

export function EditBudgetItemModal({
  open,
  onOpenChange,
  item,
  capituloLabel,
  defaultMarginPct = 25,
  onSave,
}: Props) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('un');
  const [quantity, setQuantity] = useState(1);
  const [labor, setLabor] = useState(0);
  const [material, setMaterial] = useState(0);
  const [sub, setSub] = useState(0);
  const [srv, setSrv] = useState(0);
  const [alu, setAlu] = useState(0);
  const [div, setDiv] = useState(0);
  const [margin, setMargin] = useState<number>(defaultMarginPct);
  const [context, setContext] = useState<InterventionContext | ''>('');
  const [zone, setZone] = useState('');
  const [area, setArea] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [notes, setNotes] = useState('');
  const [persist, setPersist] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setCode(item.code ?? item.baseCode ?? '');
    setName(item.name ?? '');
    setUnit(item.unit ?? 'un');
    setQuantity(item.quantity ?? 1);
    setLabor(item.laborUnitPrice ?? 0);
    setMaterial(item.materialTotalPrice ?? 0);
    setSub(item.subUnitPrice ?? 0);
    setSrv(item.srvUnitPrice ?? 0);
    setAlu(item.aluUnitPrice ?? 0);
    setDiv(item.divUnitPrice ?? 0);
    setMargin(item.marginPct ?? defaultMarginPct);
    setContext(item.interventionContext ?? '');
    setZone(item.zoneName ?? '');
    setArea(item.areaName ?? '');
    setServiceType(item.serviceTypeName ?? '');
    setNotes(item.notes ?? '');
    setPersist(true);
  }, [item, defaultMarginPct]);

  if (!item) return null;

  const custoUnit = labor + material + sub + srv + alu + div;
  const subtotal = custoUnit * quantity;
  const precoVendaUnit = margin >= 100 ? custoUnit : custoUnit / (1 - margin / 100);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(
        {
          code: code || undefined,
          name,
          unit,
          quantity,
          laborUnitPrice: labor,
          materialTotalPrice: material,
          subUnitPrice: sub || undefined,
          srvUnitPrice: srv || undefined,
          aluUnitPrice: alu || undefined,
          divUnitPrice: div || undefined,
          marginPct: margin,
          interventionContext: (context || undefined) as InterventionContext | undefined,
          zoneName: zone || undefined,
          areaName: area || undefined,
          serviceTypeName: serviceType || undefined,
          notes: notes || undefined,
        },
        { persistToCatalog: persist }
      );
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const NumberField = ({ label, value, onChange, hint }: { label: string; value: number; onChange: (n: number) => void; hint?: string }) => (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min={0}
        step={0.01}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="h-9 text-sm text-right tabular-nums"
      />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar artigo</DialogTitle>
          <DialogDescription>
            {capituloLabel ? `Capítulo: ${capituloLabel} · ` : ''}
            Mesma estrutura do Orçamento Avançado, adaptada ao Essencial.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="custos">Composição de custos</TabsTrigger>
            <TabsTrigger value="contexto">Contexto</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-4 pt-4">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-3 space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Código</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Auto" className="h-9" />
              </div>
              <div className="col-span-9 space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Descrição</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
              </div>
              <div className="col-span-3 space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Unidade</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3 space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Quantidade</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={String(quantity)}
                  onChange={(e) => {
                    const raw = e.target.value.replace(',', '.');
                    const n = parseFloat(raw);
                    setQuantity(Number.isFinite(n) && n >= 0 ? n : 0);
                  }}
                  className="h-9 text-right tabular-nums"
                />
              </div>
              <div className="col-span-3 space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Margem (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={99.99}
                  step={0.5}
                  value={margin}
                  onChange={(e) => setMargin(Math.min(99.99, parseFloat(e.target.value) || 0))}
                  className="h-9 text-right tabular-nums"
                />
              </div>
              <div className="col-span-3 space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">PV unit.</Label>
                <div className="h-9 px-3 flex items-center justify-end text-sm font-semibold tabular-nums bg-muted/40 rounded-md border border-border/50">
                  {formatEUR(precoVendaUnit)}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="custos" className="space-y-4 pt-4">
            <div className="grid grid-cols-3 gap-3">
              <NumberField label="M.O. €/un" value={labor} onChange={setLabor} hint="Mão de obra" />
              <NumberField label="MAT €/un" value={material} onChange={setMaterial} hint="Materiais" />
              <NumberField label="SUB €/un" value={sub} onChange={setSub} hint="Subempreitadas" />
              <NumberField label="SRV €/un" value={srv} onChange={setSrv} hint="Serviços" />
              <NumberField label="ALU €/un" value={alu} onChange={setAlu} hint="Alugueres" />
              <NumberField label="DIV €/un" value={div} onChange={setDiv} hint="Diversos" />
            </div>

            <div className="rounded-lg bg-muted/40 border border-border/50 p-4 grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Custo direto €/un</p>
                <p className="font-semibold tabular-nums flex items-center gap-1"><Calculator className="h-3 w-3" /> {formatEUR(custoUnit)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">PV unit. (c/ margem)</p>
                <p className="font-semibold tabular-nums">{formatEUR(precoVendaUnit)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Subtotal artigo</p>
                <p className="font-bold tabular-nums text-primary">{formatEUR(subtotal)}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contexto" className="space-y-4 pt-4">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-4 space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Contexto</Label>
                <Select value={context || 'none'} onValueChange={(v) => setContext(v === 'none' ? '' : (v as InterventionContext))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Sem contexto —</SelectItem>
                    {CONTEXT_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4 space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Zona</Label>
                <Input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Ex.: Cozinha" className="h-9" />
              </div>
              <div className="col-span-4 space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Área</Label>
                <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Ex.: Bancada" className="h-9" disabled={!zone.trim()} />
              </div>
              <div className="col-span-12 space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Tipo de Serviço</Label>
                <Input value={serviceType} onChange={(e) => setServiceType(e.target.value)} placeholder="Ex.: Pavimentos" className="h-9" />
              </div>
              <div className="col-span-12 space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Notas</Label>
                <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalhes técnicos, condições, observações…" />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between border-t border-border/50 pt-3 mt-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={persist} onChange={(e) => setPersist(e.target.checked)} className="h-4 w-4 accent-primary" />
            <Save className="h-4 w-4" /> Gravar / atualizar no Meu Catálogo
          </label>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? 'A guardar…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
