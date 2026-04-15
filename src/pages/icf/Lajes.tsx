import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useIcfLajes, useCreateIcfLaje, useDeleteIcfLaje, useIcfConfiguracao } from '@/hooks/useIcfData';
import { IcfAxiaContextual } from '@/components/icf/IcfAxiaContextual';

const IcfLajes = () => {
  const { configId } = useParams();
  const navigate = useNavigate();
  const { data: config } = useIcfConfiguracao(configId);
  const { data: lajes } = useIcfLajes(configId);
  const createLaje = useCreateIcfLaje();
  const deleteLaje = useDeleteIcfLaje();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ referencia: '', piso: 'Piso 0', area: 0, espessura_total: 0.17, aco_estimado_kg: 0, peso_proprio_kn_m2: 2.53 });

  const handleAdd = () => {
    if (!configId || !config) return;
    createLaje.mutate({
      obra_id: config.obra_id,
      configuracao_id: configId,
      tipologia_laje: 'vigotas_in_situ',
      ...form,
    } as any, { onSuccess: () => setShowAdd(false) });
  };

  const totalVol = lajes?.reduce((s, l) => s + (l.volume ?? 0), 0) ?? 0;
  const totalArea = lajes?.reduce((s, l) => s + l.area, 0) ?? 0;

  return (
    <AppLayout title="Lajes ICF" subtitle={config?.nome}>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/icf')}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
          <div className="flex-1" />
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Adicionar Laje</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Laje</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Referência</Label><Input value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))} /></div>
                  <div><Label>Piso</Label><Input value={form.piso} onChange={e => setForm(f => ({ ...f, piso: e.target.value }))} /></div>
                  <div><Label>Área (m²)</Label><Input type="number" step="0.01" value={form.area} onChange={e => setForm(f => ({ ...f, area: +e.target.value }))} /></div>
                  <div><Label>Espessura Total (m)</Label><Input type="number" step="0.01" value={form.espessura_total} onChange={e => setForm(f => ({ ...f, espessura_total: +e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Aço Estimado (kg)</Label><Input type="number" step="0.1" value={form.aco_estimado_kg} onChange={e => setForm(f => ({ ...f, aco_estimado_kg: +e.target.value }))} /></div>
                  <div><Label>Peso Próprio (kN/m²)</Label><Input type="number" step="0.01" value={form.peso_proprio_kn_m2} onChange={e => setForm(f => ({ ...f, peso_proprio_kn_m2: +e.target.value }))} /></div>
                </div>
                <p className="text-xs text-muted-foreground">Vol. estimado: {(form.area * form.espessura_total).toFixed(3)} m³</p>
                <Button onClick={handleAdd} disabled={createLaje.isPending} className="w-full">Adicionar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card><CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref.</TableHead>
                <TableHead>Piso</TableHead>
                <TableHead className="text-right">Área (m²)</TableHead>
                <TableHead className="text-right">Espessura (m)</TableHead>
                <TableHead className="text-right">Volume (m³)</TableHead>
                <TableHead className="text-right">Aço (kg)</TableHead>
                <TableHead className="text-right">Peso (kN/m²)</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lajes?.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.referencia}</TableCell>
                  <TableCell>{l.piso}</TableCell>
                  <TableCell className="text-right">{l.area.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{l.espessura_total.toFixed(3)}</TableCell>
                  <TableCell className="text-right font-bold">{l.volume?.toFixed(3)}</TableCell>
                  <TableCell className="text-right">{l.aco_estimado_kg ?? '—'}</TableCell>
                  <TableCell className="text-right">{l.peso_proprio_kn_m2 ?? '—'}</TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => deleteLaje.mutate(l.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
              {(!lajes || lajes.length === 0) && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Sem lajes registadas</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent></Card>

        <div className="grid grid-cols-2 gap-3">
          <Card><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Área Total</p><p className="text-lg font-bold">{totalArea.toFixed(2)} m²</p></CardContent></Card>
          <Card><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Volume Total</p><p className="text-lg font-bold">{totalVol.toFixed(3)} m³</p></CardContent></Card>
        </div>

        {/* Axia contextual */}
        <IcfAxiaContextual context="lajes" config={config} lajes={lajes ?? []} />
      </div>
    </AppLayout>
  );
};

export default IcfLajes;
