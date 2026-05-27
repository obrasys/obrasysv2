import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle2, Plus, RefreshCw, Send, Trash2 } from 'lucide-react';
import { ICFWallPanelVisualizer } from './ICFWallPanelVisualizer';
import { useIcfBlockLibrary, useIcfBlockByCode } from '@/hooks/useIcfBlockLibrary';
import {
  useUpdateIcfWallPanel,
  useDeleteIcfWallPanel,
  useSaveCompositionResult,
} from '@/hooks/useIcfWallPanels';
import { calculateICFWallComposition } from '@/lib/icf-homeblock-composition';
import type { ICFWallPanel, ICFOpening } from '@/types/icf-homeblock';

const STATUS_LABEL: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  rascunho: { label: 'Rascunho', variant: 'outline' },
  em_revisao: { label: 'A rever', variant: 'secondary' },
  validado: { label: 'Validado', variant: 'default' },
  enviado_orcamento: { label: 'No orçamento', variant: 'default' },
  bloqueado: { label: 'Bloqueado', variant: 'destructive' },
};

export const ICFWallPanelCard = ({ panel, onSendToBudget }: { panel: ICFWallPanel; onSendToBudget?: (p: ICFWallPanel) => void }) => {
  const { data: blocks } = useIcfBlockLibrary('bloco_principal');
  const { data: block } = useIcfBlockByCode(panel.selected_block_code);
  const update = useUpdateIcfWallPanel();
  const del = useDeleteIcfWallPanel();
  const save = useSaveCompositionResult();

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    label: panel.label,
    floor: panel.floor ?? '',
    room: panel.room ?? '',
    length_m: panel.length_m,
    height_m: panel.height_m,
    thickness_mm: panel.thickness_mm,
    selected_block_code: panel.selected_block_code,
    notes: panel.notes ?? '',
    openings: (panel.openings ?? []) as ICFOpening[],
  });

  const composition = useMemo(() => {
    if (!block) return panel.composition_result;
    return calculateICFWallComposition({
      wall_panel_id: panel.id,
      length_m: panel.length_m,
      height_m: panel.height_m,
      openings: panel.openings ?? [],
      block,
    });
  }, [block, panel]);

  const status = STATUS_LABEL[panel.status] ?? STATUS_LABEL.rascunho;

  const handleRecalc = () => {
    if (composition) save.mutate({ id: panel.id, result: composition });
  };

  const handleConfirm = () => {
    if (composition) {
      save.mutate({ id: panel.id, result: composition });
    }
    update.mutate({ id: panel.id, status: 'validado' });
  };

  const handleSaveEdit = () => {
    update.mutate(
      {
        id: panel.id,
        ...form,
        openings: form.openings as any,
      },
      { onSuccess: () => setEditOpen(false) },
    );
  };

  const addOpening = () => {
    setForm(f => ({
      ...f,
      openings: [...f.openings, { type: 'janela', width_m: 1, height_m: 1, sill_height_m: 0.9, position_m: 0.5 }],
    }));
  };

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{panel.label}</CardTitle>
            <div className="text-xs text-muted-foreground mt-0.5">
              {[panel.floor, panel.room].filter(Boolean).join(' · ')}
              {panel.confidence != null && (
                <span className="ml-2">Confiança: {Math.round(Number(panel.confidence))}%</span>
              )}
            </div>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ICFWallPanelVisualizer panel={panel} block={block} composition={composition} />

        {composition && composition.warnings.length > 0 && (
          <div className="rounded-lg border border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20 p-3 space-y-1">
            <div className="flex items-center gap-2 text-amber-800 text-xs font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              Avisos da composição
            </div>
            <ul className="list-disc pl-5 text-xs text-amber-900/90 dark:text-amber-200 space-y-0.5">
              {composition.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        {composition && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <Stat label="Fiadas" value={composition.rows} />
            <Stat label="Blocos/fiada" value={composition.blocks_per_row} />
            <Stat label="Blocos (final)" value={composition.estimated_final_block_qty} />
            <Stat label="Área líquida" value={`${composition.net_area_m2.toFixed(2)} m²`} />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>Editar medidas</Button>
          <Button size="sm" variant="outline" onClick={handleRecalc} disabled={save.isPending}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Recalcular
          </Button>
          {panel.status !== 'validado' && panel.status !== 'enviado_orcamento' && (
            <Button size="sm" onClick={handleConfirm}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Confirmar pano
            </Button>
          )}
          {onSendToBudget && panel.status === 'validado' && (
            <Button size="sm" variant="default" onClick={() => onSendToBudget(panel)}>
              <Send className="h-3.5 w-3.5 mr-1.5" /> Enviar para orçamento
            </Button>
          )}
          <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => del.mutate(panel.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Editar pano de parede</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Etiqueta"><Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} /></Field>
            <Field label="Sistema HOMEBLOCK">
              <Select value={form.selected_block_code} onValueChange={v => setForm({ ...form, selected_block_code: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {blocks?.map(b => <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Piso"><Input value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} /></Field>
            <Field label="Compartimento"><Input value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} /></Field>
            <Field label="Comprimento (m)"><Input type="number" step="0.01" value={form.length_m} onChange={e => setForm({ ...form, length_m: Number(e.target.value) })} /></Field>
            <Field label="Altura (m)"><Input type="number" step="0.01" value={form.height_m} onChange={e => setForm({ ...form, height_m: Number(e.target.value) })} /></Field>
            <Field label="Espessura (mm)"><Input type="number" value={form.thickness_mm} onChange={e => setForm({ ...form, thickness_mm: Number(e.target.value) })} /></Field>
            <Field label="Notas" full><Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Aberturas</Label>
              <Button size="sm" variant="outline" onClick={addOpening}><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar</Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {form.openings.map((o, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end border rounded-md p-2">
                  <div className="col-span-3">
                    <Label className="text-[10px]">Tipo</Label>
                    <Select value={o.type} onValueChange={v => updateOp(i, { type: v as any })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="porta">Porta</SelectItem>
                        <SelectItem value="janela">Janela</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <NumberCell label="Larg.(m)" value={o.width_m} onChange={v => updateOp(i, { width_m: v })} />
                  <NumberCell label="Alt.(m)" value={o.height_m} onChange={v => updateOp(i, { height_m: v })} />
                  <NumberCell label="Peito(m)" value={o.sill_height_m ?? 0} onChange={v => updateOp(i, { sill_height_m: v })} />
                  <NumberCell label="Pos.(m)" value={o.position_m ?? 0} onChange={v => updateOp(i, { position_m: v })} />
                  <Button size="icon" variant="ghost" className="col-span-1 text-destructive" onClick={() => removeOp(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {form.openings.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Sem aberturas.</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={update.isPending}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );

  function updateOp(idx: number, patch: Partial<ICFOpening>) {
    setForm(f => ({
      ...f,
      openings: f.openings.map((o, i) => (i === idx ? { ...o, ...patch } : o)),
    }));
  }
  function removeOp(idx: number) {
    setForm(f => ({ ...f, openings: f.openings.filter((_, i) => i !== idx) }));
  }
};

const Stat = ({ label, value }: { label: string; value: any }) => (
  <div className="border rounded-md py-2 px-2">
    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    <div className="text-sm font-semibold mt-0.5">{value}</div>
  </div>
);

const Field = ({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) => (
  <div className={full ? 'col-span-2 space-y-1' : 'space-y-1'}>
    <Label className="text-xs">{label}</Label>
    {children}
  </div>
);

const NumberCell = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <div className="col-span-2 space-y-1">
    <Label className="text-[10px]">{label}</Label>
    <Input className="h-8" type="number" step="0.01" value={value} onChange={e => onChange(Number(e.target.value))} />
  </div>
);
