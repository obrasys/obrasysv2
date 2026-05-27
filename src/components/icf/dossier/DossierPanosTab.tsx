import { useState } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { ICFWallPanelCard } from '@/components/icf/panels/ICFWallPanelCard';
import { useIcfBlockLibrary } from '@/hooks/useIcfBlockLibrary';
import { useIcfDossierPanels, useCreateDossierPanel } from '@/hooks/useIcfDossier';
import type { IcfProjectAnalysis } from '@/types/icf-dossier';

export function DossierPanosTab({ analysis }: { analysis: IcfProjectAnalysis }) {
  const { data: panels = [] } = useIcfDossierPanels(analysis.id);
  const { data: blocks = [] } = useIcfBlockLibrary('bloco_principal');
  const create = useCreateDossierPanel();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    label: '', floor: '', room: '',
    length_m: 4, height_m: 2.8,
    thickness_mm: analysis.espessura_nucleo_mm ?? 150,
    selected_block_code: 'HB-BLOCO-220',
  });

  const handleCreate = async () => {
    if (!analysis.obra_id) return;
    const gross = form.length_m * form.height_m;
    await create.mutateAsync({
      analysis_id: analysis.id,
      obra_id: analysis.obra_id,
      configuracao_id: analysis.configuracao_id ?? undefined,
      label: form.label || `Pano ${panels.length + 1}`,
      floor: form.floor || null,
      room: form.room || null,
      length_m: form.length_m,
      height_m: form.height_m,
      thickness_mm: form.thickness_mm,
      selected_block_code: form.selected_block_code,
      openings: [],
      gross_area_m2: gross,
      net_area_m2: gross,
      status: 'rascunho',
      source: 'manual',
    } as any);
    setOpen(false);
  };

  if (!analysis.obra_id) {
    return (
      <Card className="rounded-xl border-amber-200">
        <CardContent className="py-8 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Dossiê sem obra associada</p>
            <p className="text-muted-foreground mt-1">
              Associe este dossiê a uma obra no Resumo para criar e gerir panos HOMEBLOCK.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{panels.length} pano(s) neste dossiê</p>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo pano
        </Button>
      </div>

      {panels.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Ainda sem panos. Adicione manualmente ou gere via assistente.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {panels.map(p => (
            <ICFWallPanelCard key={p.id} panel={p} />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo pano HOMEBLOCK</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="text-xs">Identificação</Label>
              <Input value={form.label} placeholder="Ex: P1 — Sala" onChange={e => setForm({ ...form, label: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Piso</Label>
                <Input value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Compartimento</Label>
                <Input value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Comprimento (m)</Label>
                <Input type="number" step="0.01" value={form.length_m}
                  onChange={e => setForm({ ...form, length_m: Number(e.target.value) })} />
              </div>
              <div>
                <Label className="text-xs">Altura (m)</Label>
                <Input type="number" step="0.01" value={form.height_m}
                  onChange={e => setForm({ ...form, height_m: Number(e.target.value) })} />
              </div>
              <div>
                <Label className="text-xs">Espessura núcleo (mm)</Label>
                <Input type="number" value={form.thickness_mm}
                  onChange={e => setForm({ ...form, thickness_mm: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Bloco principal</Label>
              <Select value={form.selected_block_code}
                onValueChange={v => setForm({ ...form, selected_block_code: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {blocks.map(b => (
                    <SelectItem key={b.code} value={b.code}>{b.code} — {b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={create.isPending}>Criar pano</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
