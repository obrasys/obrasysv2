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
import { ArrowLeft, Plus, Trash2, Layers, Pencil } from 'lucide-react';
import { useIcfPanos, useCreateIcfPano, useDeleteIcfPano, useUpdateIcfPano, useIcfConfiguracao } from '@/hooks/useIcfData';
import { IcfVaosDialog } from '@/components/icf/IcfVaosDialog';
import { IcfAxiaContextual } from '@/components/icf/IcfAxiaContextual';
import { IcfAxiaAnalysisPanel } from '@/components/icf/IcfAxiaAnalysisPanel';

const DIAMETROS = ['Ø6', 'Ø8', 'Ø10', 'Ø12', 'Ø16', 'Ø20', 'Ø25'];
const ESPACAMENTOS = ['10', '15', '20', '25', '30'];

const formatArmadura = (diametro: string, espacamento: string) => `${diametro}/${espacamento}`;

const IcfPanos = () => {
  const { configId } = useParams();
  const navigate = useNavigate();
  const { data: config } = useIcfConfiguracao(configId);
  const { data: panos, isLoading } = useIcfPanos(configId);
  const createPano = useCreateIcfPano();
  const updatePano = useUpdateIcfPano();
  const deletePano = useDeleteIcfPano();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedPanoId, setSelectedPanoId] = useState<string | null>(null);
  const [pisoFilter, setPisoFilter] = useState('');
  const [editPano, setEditPano] = useState<any>(null);

  const [newPano, setNewPano] = useState({
    referencia: '',
    piso_inicial: 'Piso 0',
    altura_util: 2.90,
    comprimento: 0,
    espessura_nucleo: 0.15,
    diam_vertical: 'Ø10',
    esp_vertical: '20',
    diam_horizontal: 'Ø8',
    esp_horizontal: '20',
    diam_transversal: '',
    esp_transversal: '',
  });

  const resetForm = () => setNewPano({
    referencia: '', piso_inicial: 'Piso 0', altura_util: 2.90, comprimento: 0, espessura_nucleo: 0.15,
    diam_vertical: 'Ø10', esp_vertical: '20', diam_horizontal: 'Ø8', esp_horizontal: '20',
    diam_transversal: '', esp_transversal: '',
  });

  const handleAdd = () => {
    if (!configId || !config) return;
    const armV = formatArmadura(newPano.diam_vertical, newPano.esp_vertical);
    const armH = formatArmadura(newPano.diam_horizontal, newPano.esp_horizontal);
    const reforco = newPano.diam_transversal && newPano.esp_transversal
      ? formatArmadura(newPano.diam_transversal, newPano.esp_transversal)
      : null;

    createPano.mutate({
      obra_id: config.obra_id,
      configuracao_id: configId,
      referencia: newPano.referencia,
      piso_inicial: newPano.piso_inicial,
      altura_util: newPano.altura_util,
      comprimento: newPano.comprimento,
      espessura_nucleo: newPano.espessura_nucleo,
      tipo_armadura: 'personalizada',
      armadura_vertical: armV,
      armadura_horizontal: armH,
      reforco_transversal: reforco,
    } as any, {
      onSuccess: () => {
        setShowAdd(false);
        resetForm();
      },
    });
  };

  const handleEdit = (p: any) => {
    const parseArm = (arm: string | null) => {
      if (!arm) return { diam: '', esp: '' };
      const match = arm.match(/(Ø\d+)\/(\d+)/);
      return match ? { diam: match[1], esp: match[2] } : { diam: '', esp: '' };
    };
    const v = parseArm(p.armadura_vertical);
    const h = parseArm(p.armadura_horizontal);
    const t = parseArm(p.reforco_transversal);
    setEditPano({
      ...p,
      diam_vertical: v.diam,
      esp_vertical: v.esp,
      diam_horizontal: h.diam,
      esp_horizontal: h.esp,
      diam_transversal: t.diam,
      esp_transversal: t.esp,
    });
  };

  const handleSaveEdit = () => {
    if (!editPano || !configId || !config) return;
    const armV = formatArmadura(editPano.diam_vertical, editPano.esp_vertical);
    const armH = formatArmadura(editPano.diam_horizontal, editPano.esp_horizontal);
    const reforco = editPano.diam_transversal && editPano.esp_transversal
      ? formatArmadura(editPano.diam_transversal, editPano.esp_transversal)
      : null;

    // UPDATE in-place — preserva vãos associados (cascade-safe)
    updatePano.mutate({
      id: editPano.id,
      referencia: editPano.referencia,
      piso_inicial: editPano.piso_inicial,
      altura_util: editPano.altura_util,
      comprimento: editPano.comprimento,
      espessura_nucleo: editPano.espessura_nucleo,
      tipo_armadura: 'personalizada',
      armadura_vertical: armV,
      armadura_horizontal: armH,
      reforco_transversal: reforco,
    } as any, {
      onSuccess: () => setEditPano(null),
    });
  };

  const filtered = panos?.filter(p => !pisoFilter || p.piso_inicial === pisoFilter) ?? [];
  const pisos = [...new Set(panos?.map(p => p.piso_inicial).filter(Boolean) ?? [])];

  const ArmaduraFields = ({ data, onChange }: { data: any; onChange: (d: any) => void }) => (
    <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
      <p className="text-sm font-medium">Armadura Vertical</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Diâmetro</Label>
          <Select value={data.diam_vertical} onValueChange={v => onChange({ ...data, diam_vertical: v })}>
            <SelectTrigger><SelectValue placeholder="Ø" /></SelectTrigger>
            <SelectContent>{DIAMETROS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Espaçamento (cm)</Label>
          <Select value={data.esp_vertical} onValueChange={v => onChange({ ...data, esp_vertical: v })}>
            <SelectTrigger><SelectValue placeholder="cm" /></SelectTrigger>
            <SelectContent>{ESPACAMENTOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-sm font-medium">Armadura Horizontal</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Diâmetro</Label>
          <Select value={data.diam_horizontal} onValueChange={v => onChange({ ...data, diam_horizontal: v })}>
            <SelectTrigger><SelectValue placeholder="Ø" /></SelectTrigger>
            <SelectContent>{DIAMETROS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Espaçamento (cm)</Label>
          <Select value={data.esp_horizontal} onValueChange={v => onChange({ ...data, esp_horizontal: v })}>
            <SelectTrigger><SelectValue placeholder="cm" /></SelectTrigger>
            <SelectContent>{ESPACAMENTOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-sm font-medium">Reforço Transversal <span className="text-xs text-muted-foreground">(opcional)</span></p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Diâmetro</Label>
          <Select value={data.diam_transversal || '__none__'} onValueChange={v => onChange({ ...data, diam_transversal: v === '__none__' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum</SelectItem>
              {DIAMETROS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Espaçamento (cm)</Label>
          <Select value={data.esp_transversal || '__none__'} onValueChange={v => onChange({ ...data, esp_transversal: v === '__none__' ? '' : v })} disabled={!data.diam_transversal}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {ESPACAMENTOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

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
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Novo Pano de Parede</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Referência</Label><Input value={newPano.referencia} onChange={e => setNewPano(f => ({ ...f, referencia: e.target.value }))} placeholder="Ex: P01" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Piso</Label><Input value={newPano.piso_inicial} onChange={e => setNewPano(f => ({ ...f, piso_inicial: e.target.value }))} /></div>
                  <div><Label>Espessura Núcleo (m)</Label><Input type="number" step="0.01" value={newPano.espessura_nucleo} onChange={e => setNewPano(f => ({ ...f, espessura_nucleo: +e.target.value }))} /></div>
                  <div><Label>Comprimento (m)</Label><Input type="number" step="0.01" value={newPano.comprimento} onChange={e => setNewPano(f => ({ ...f, comprimento: +e.target.value }))} /></div>
                  <div><Label>Altura Útil (m)</Label><Input type="number" step="0.01" value={newPano.altura_util} onChange={e => setNewPano(f => ({ ...f, altura_util: +e.target.value }))} /></div>
                </div>
                <ArmaduraFields data={newPano} onChange={setNewPano} />
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
                    <TableHead>Armadura V/H</TableHead>
                    <TableHead>Reforço</TableHead>
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
                      <TableCell className="text-xs text-muted-foreground">{p.reforco_transversal || '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(p)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
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
                    <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">Sem panos registados</TableCell></TableRow>
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

        {/* Axia contextual + analysis */}
        <IcfAxiaContextual context="panos" config={config} panos={filtered} />
        {configId && <IcfAxiaAnalysisPanel configId={configId} />}

        {/* Vaos dialog */}
        <IcfVaosDialog panoId={selectedPanoId} onClose={() => setSelectedPanoId(null)} />

        {/* Edit dialog */}
        <Dialog open={!!editPano} onOpenChange={open => { if (!open) setEditPano(null); }}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Editar Pano — {editPano?.referencia}</DialogTitle></DialogHeader>
            {editPano && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Referência</Label><Input value={editPano.referencia} onChange={e => setEditPano((f: any) => ({ ...f, referencia: e.target.value }))} /></div>
                  <div><Label>Piso</Label><Input value={editPano.piso_inicial} onChange={e => setEditPano((f: any) => ({ ...f, piso_inicial: e.target.value }))} /></div>
                  <div><Label>Comprimento (m)</Label><Input type="number" step="0.01" value={editPano.comprimento} onChange={e => setEditPano((f: any) => ({ ...f, comprimento: +e.target.value }))} /></div>
                  <div><Label>Altura Útil (m)</Label><Input type="number" step="0.01" value={editPano.altura_util} onChange={e => setEditPano((f: any) => ({ ...f, altura_util: +e.target.value }))} /></div>
                </div>
                <ArmaduraFields data={editPano} onChange={setEditPano} />
                <Button onClick={handleSaveEdit} disabled={updatePano.isPending} className="w-full">Guardar Alterações</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default IcfPanos;
