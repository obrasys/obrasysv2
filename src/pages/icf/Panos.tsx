import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Layers } from 'lucide-react';
import { useIcfPanos, useCreateIcfPano, useDeleteIcfPano, useIcfConfiguracao } from '@/hooks/useIcfData';
import { ICF_ARMADURA_PRESETS } from '@/types/icf';
import { IcfVaosDialog } from '@/components/icf/IcfVaosDialog';

const IcfPanos = () => {
  const { configId } = useParams();
  const navigate = useNavigate();
  const { data: config } = useIcfConfiguracao(configId);
  const { data: panos, isLoading } = useIcfPanos(configId);
  const createPano = useCreateIcfPano();
  const deletePano = useDeleteIcfPano();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedPanoId, setSelectedPanoId] = useState<string | null>(null);
  const [pisoFilter, setPisoFilter] = useState('');

  const [newPano, setNewPano] = useState({
    referencia: '',
    piso_inicial: 'Piso 0',
    altura_util: 2.90,
    comprimento: 0,
    espessura_nucleo: 0.15,
    tipo_armadura: 'padrao',
  });

  const handleAdd = () => {
    if (!configId || !config) return;
    const preset = ICF_ARMADURA_PRESETS[newPano.tipo_armadura as keyof typeof ICF_ARMADURA_PRESETS] ?? ICF_ARMADURA_PRESETS.padrao;
    createPano.mutate({
      obra_id: config.obra_id,
      configuracao_id: configId,
      referencia: newPano.referencia,
      piso_inicial: newPano.piso_inicial,
      altura_util: newPano.altura_util,
      comprimento: newPano.comprimento,
      espessura_nucleo: newPano.espessura_nucleo,
      tipo_armadura: newPano.tipo_armadura,
      armadura_vertical: preset.armadura_vertical,
      armadura_horizontal: preset.armadura_horizontal,
      reforco_transversal: preset.reforco_transversal,
    } as any, {
      onSuccess: () => {
        setShowAdd(false);
        setNewPano({ referencia: '', piso_inicial: 'Piso 0', altura_util: 2.90, comprimento: 0, espessura_nucleo: 0.15, tipo_armadura: 'padrao' });
      },
    });
  };

  const filtered = panos?.filter(p => !pisoFilter || p.piso_inicial === pisoFilter) ?? [];
  const pisos = [...new Set(panos?.map(p => p.piso_inicial).filter(Boolean) ?? [])];

  return (
    <AppLayout title="Panos de Parede ICF" subtitle={config?.nome}>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate('/icf')}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
          <div className="flex-1" />
          {pisos.length > 0 && (
            <Select value={pisoFilter || "__all__"} onValueChange={v => setPisoFilter(v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Filtrar piso" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {pisos.map(p => <SelectItem key={p} value={p!}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Adicionar Pano</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Pano de Parede</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Referência</Label><Input value={newPano.referencia} onChange={e => setNewPano(f => ({ ...f, referencia: e.target.value }))} placeholder="Ex: P01" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Piso</Label><Input value={newPano.piso_inicial} onChange={e => setNewPano(f => ({ ...f, piso_inicial: e.target.value }))} /></div>
                  <div><Label>Tipologia</Label>
                    <Select value={newPano.tipo_armadura} onValueChange={v => setNewPano(f => ({ ...f, tipo_armadura: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="padrao">Padrão</SelectItem>
                        <SelectItem value="reforcada">Reforçada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Comprimento (m)</Label><Input type="number" step="0.01" value={newPano.comprimento} onChange={e => setNewPano(f => ({ ...f, comprimento: +e.target.value }))} /></div>
                  <div><Label>Altura Útil (m)</Label><Input type="number" step="0.01" value={newPano.altura_util} onChange={e => setNewPano(f => ({ ...f, altura_util: +e.target.value }))} /></div>
                </div>
                <Button onClick={handleAdd} disabled={createPano.isPending} className="w-full">Adicionar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref.</TableHead>
                    <TableHead>Piso</TableHead>
                    <TableHead className="text-right">Comp. (m)</TableHead>
                    <TableHead className="text-right">Altura (m)</TableHead>
                    <TableHead className="text-right">Área Bruta (m²)</TableHead>
                    <TableHead className="text-right">Vãos (m²)</TableHead>
                    <TableHead className="text-right">Área Líq. (m²)</TableHead>
                    <TableHead className="text-right">Vol. Betão (m³)</TableHead>
                    <TableHead>Armadura</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.referencia}</TableCell>
                      <TableCell>{p.piso_inicial}</TableCell>
                      <TableCell className="text-right">{p.comprimento.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{p.altura_util.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{p.area_bruta?.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{p.area_vaos?.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">{p.area_liquida?.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold">{p.volume_betao?.toFixed(3)}</TableCell>
                      <TableCell className="text-xs">{p.armadura_vertical} / {p.armadura_horizontal}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedPanoId(p.id)}>
                            <Layers className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deletePano.mutate(p.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Sem panos registados</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Totals */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Comprimento Total</p><p className="text-lg font-bold">{filtered.reduce((s, p) => s + p.comprimento, 0).toFixed(2)} m</p></CardContent></Card>
            <Card><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Área Líquida Total</p><p className="text-lg font-bold">{filtered.reduce((s, p) => s + (p.area_liquida ?? 0), 0).toFixed(2)} m²</p></CardContent></Card>
            <Card><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Volume Betão Total</p><p className="text-lg font-bold">{filtered.reduce((s, p) => s + (p.volume_betao ?? 0), 0).toFixed(3)} m³</p></CardContent></Card>
            <Card><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Nº Panos</p><p className="text-lg font-bold">{filtered.length}</p></CardContent></Card>
          </div>
        )}

        {/* Vaos dialog */}
        <IcfVaosDialog panoId={selectedPanoId} onClose={() => setSelectedPanoId(null)} />
      </div>
    </AppLayout>
  );
};

export default IcfPanos;
