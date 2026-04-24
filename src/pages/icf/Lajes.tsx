import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, Pencil } from 'lucide-react';
import { useIcfLajes, useCreateIcfLaje, useDeleteIcfLaje, useUpdateIcfLaje, useIcfConfiguracao } from '@/hooks/useIcfData';
import { IcfAxiaContextual } from '@/components/icf/IcfAxiaContextual';
import { IcfAxiaAnalysisPanel } from '@/components/icf/IcfAxiaAnalysisPanel';

/** Peso linear dos varões (kg/m) */
const PESO_VARAO: Record<string, number> = {
  '6': 0.222, '8': 0.395, '10': 0.617, '12': 0.888,
  '16': 1.578, '20': 2.466, '25': 3.854, '32': 6.313,
};

const DIAMETROS = Object.keys(PESO_VARAO);

interface ArmaduraLayer {
  tipo: 'longitudinal' | 'transversal' | 'malha_electrossoldada';
  diametro: string;
  espacamento_cm: number;
  camadas: number;
}

const DEFAULT_LAYER: ArmaduraLayer = { tipo: 'longitudinal', diametro: '10', espacamento_cm: 15, camadas: 1 };

function calcularAcoArmadura(area: number, layers: ArmaduraLayer[]): { total_kg: number; detalhe: string[] } {
  if (area <= 0) return { total_kg: 0, detalhe: [] };
  const lado = Math.sqrt(area);
  let total = 0;
  const detalhe: string[] = [];

  for (const layer of layers) {
    const peso_m = PESO_VARAO[layer.diametro] ?? 0.617;
    const esp_m = layer.espacamento_cm / 100;
    if (esp_m <= 0) continue;

    const nBarras = Math.ceil(lado / esp_m) + 1;

    if (layer.tipo === 'malha_electrossoldada') {
      // malha: duas direções
      const comprTotal = nBarras * lado * 2;
      const pesoLayer = comprTotal * peso_m * layer.camadas;
      total += pesoLayer;
      detalhe.push(`Malha Ø${layer.diametro}//${layer.espacamento_cm} × ${layer.camadas} cam. → ${pesoLayer.toFixed(1)} kg`);
    } else {
      // unidirecional
      const comprTotal = nBarras * lado;
      const pesoLayer = comprTotal * peso_m * layer.camadas;
      total += pesoLayer;
      const tipoLabel = layer.tipo === 'longitudinal' ? 'Long.' : 'Trans.';
      detalhe.push(`${tipoLabel} Ø${layer.diametro}//${layer.espacamento_cm} × ${layer.camadas} cam. → ${pesoLayer.toFixed(1)} kg`);
    }
  }

  return { total_kg: Math.round(total * 10) / 10, detalhe };
}

const IcfLajes = () => {
  const { configId } = useParams();
  const navigate = useNavigate();
  const { data: config } = useIcfConfiguracao(configId);
  const { data: lajes } = useIcfLajes(configId);
  const createLaje = useCreateIcfLaje();
  const deleteLaje = useDeleteIcfLaje();
  const updateLaje = useUpdateIcfLaje();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ referencia: '', piso: 'Piso 0', area: 0, espessura_total: 0.17, peso_proprio_kn_m2: 2.53 });
  const [layers, setLayers] = useState<ArmaduraLayer[]>([{ ...DEFAULT_LAYER }]);

  const acoCalc = useMemo(() => calcularAcoArmadura(form.area, layers), [form.area, layers]);

  const resetForm = () => {
    setForm({ referencia: '', piso: 'Piso 0', area: 0, espessura_total: 0.17, peso_proprio_kn_m2: 2.53 });
    setLayers([{ ...DEFAULT_LAYER }]);
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!configId || !config) return;
    // Persistir layers como JSON no início de observacoes para restauro fiel na edição
    const armJson = `__ARM__:${JSON.stringify(layers)}|`;
    const detalheTxt = acoCalc.detalhe.join(' | ');
    const payload = {
      obra_id: config.obra_id,
      configuracao_id: configId,
      tipologia_laje: 'vigotas_in_situ',
      ...form,
      aco_estimado_kg: acoCalc.total_kg,
      observacoes: armJson + detalheTxt,
    };
    if (editingId) {
      updateLaje.mutate({ id: editingId, ...payload } as any, { onSuccess: () => { setShowAdd(false); resetForm(); } });
    } else {
      createLaje.mutate(payload as any, { onSuccess: () => { setShowAdd(false); resetForm(); } });
    }
  };

  const handleEdit = (l: any) => {
    setEditingId(l.id);
    setForm({ referencia: l.referencia ?? '', piso: l.piso ?? 'Piso 0', area: l.area, espessura_total: l.espessura_total, peso_proprio_kn_m2: l.peso_proprio_kn_m2 ?? 2.53 });
    // Restaurar layers a partir do prefixo JSON em observacoes
    const obs: string = l.observacoes ?? '';
    const m = obs.match(/^__ARM__:(\[.*?\])\|/s);
    if (m) {
      try {
        const parsed = JSON.parse(m[1]) as ArmaduraLayer[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLayers(parsed);
        } else {
          setLayers([{ ...DEFAULT_LAYER }]);
        }
      } catch {
        setLayers([{ ...DEFAULT_LAYER }]);
      }
    } else {
      setLayers([{ ...DEFAULT_LAYER }]);
    }
    setShowAdd(true);
  };

  const addLayer = () => setLayers(l => [...l, { ...DEFAULT_LAYER, tipo: l.length % 2 === 0 ? 'longitudinal' : 'transversal' }]);
  const removeLayer = (i: number) => setLayers(l => l.filter((_, idx) => idx !== i));
  const updateLayer = (i: number, patch: Partial<ArmaduraLayer>) => setLayers(l => l.map((ly, idx) => idx === i ? { ...ly, ...patch } : ly));

  const totalVol = lajes?.reduce((s, l) => s + (l.volume ?? 0), 0) ?? 0;
  const totalArea = lajes?.reduce((s, l) => s + l.area, 0) ?? 0;
  const totalAco = lajes?.reduce((s, l) => s + (l.aco_estimado_kg ?? 0), 0) ?? 0;

  return (
    <AppLayout title="Lajes ICF" subtitle={config?.nome}>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/icf')}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
          <div className="flex-1" />
          <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Adicionar Laje</Button></DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingId ? 'Editar Laje' : 'Nova Laje'}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                {/* Geometria */}
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Referência</Label><Input value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))} /></div>
                  <div><Label>Piso</Label><Input value={form.piso} onChange={e => setForm(f => ({ ...f, piso: e.target.value }))} /></div>
                  <div><Label>Área (m²)</Label><Input type="number" step="0.01" value={form.area} onChange={e => setForm(f => ({ ...f, area: +e.target.value }))} /></div>
                  <div><Label>Espessura Total (m)</Label><Input type="number" step="0.01" value={form.espessura_total} onChange={e => setForm(f => ({ ...f, espessura_total: +e.target.value }))} /></div>
                  <div><Label>Peso Próprio (kN/m²)</Label><Input type="number" step="0.01" value={form.peso_proprio_kn_m2} onChange={e => setForm(f => ({ ...f, peso_proprio_kn_m2: +e.target.value }))} /></div>
                </div>

                {/* Armaduras */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Armaduras</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addLayer}><Plus className="h-3 w-3 mr-1" />Camada</Button>
                  </div>
                  {layers.map((layer, i) => (
                    <div key={i} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Camada {i + 1}</span>
                        {layers.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => removeLayer(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Tipo</Label>
                          <Select value={layer.tipo} onValueChange={v => updateLayer(i, { tipo: v as ArmaduraLayer['tipo'] })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="longitudinal">Longitudinal</SelectItem>
                              <SelectItem value="transversal">Transversal</SelectItem>
                              <SelectItem value="malha_electrossoldada">Malha Electrossoldada</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Diâmetro (mm)</Label>
                          <Select value={layer.diametro} onValueChange={v => updateLayer(i, { diametro: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {DIAMETROS.map(d => <SelectItem key={d} value={d}>Ø{d}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Espaçamento (cm)</Label>
                          <Input type="number" step="1" min="5" className="h-8 text-xs" value={layer.espacamento_cm} onChange={e => updateLayer(i, { espacamento_cm: +e.target.value })} />
                        </div>
                      </div>
                      {layer.tipo !== 'malha_electrossoldada' && (
                        <div className="w-1/3">
                          <Label className="text-xs">Nº Camadas</Label>
                          <Input type="number" step="1" min="1" max="4" className="h-8 text-xs" value={layer.camadas} onChange={e => updateLayer(i, { camadas: +e.target.value })} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Resumo do cálculo */}
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-1">
                  <p className="text-sm font-semibold">Resumo do Cálculo</p>
                  <p className="text-xs text-muted-foreground">Vol. estimado: {(form.area * form.espessura_total).toFixed(3)} m³</p>
                  <p className="text-sm font-bold text-primary">Aço total: {acoCalc.total_kg.toFixed(1)} kg</p>
                  {form.area > 0 && <p className="text-xs text-muted-foreground">Índice: {(acoCalc.total_kg / form.area).toFixed(2)} kg/m²</p>}
                  {acoCalc.detalhe.map((d, i) => <p key={i} className="text-xs text-muted-foreground">• {d}</p>)}
                </div>

                <Button onClick={handleAdd} disabled={createLaje.isPending || updateLaje.isPending} className="w-full">
                  {editingId ? 'Guardar Alterações' : 'Adicionar'}
                </Button>
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
                <TableHead className="text-right">kg/m²</TableHead>
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
                  <TableCell className="text-right">{l.aco_estimado_kg?.toFixed(1) ?? '—'}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{l.area > 0 && l.aco_estimado_kg ? (l.aco_estimado_kg / l.area).toFixed(2) : '—'}</TableCell>
                  <TableCell className="text-right">{l.peso_proprio_kn_m2 ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(l)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteLaje.mutate(l.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!lajes || lajes.length === 0) && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Sem lajes registadas</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent></Card>

        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Área Total</p><p className="text-lg font-bold">{totalArea.toFixed(2)} m²</p></CardContent></Card>
          <Card><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Volume Total</p><p className="text-lg font-bold">{totalVol.toFixed(3)} m³</p></CardContent></Card>
          <Card><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Aço Total</p><p className="text-lg font-bold">{totalAco.toFixed(1)} kg</p></CardContent></Card>
        </div>

        {/* Axia */}
        <IcfAxiaContextual context="lajes" config={config} lajes={lajes ?? []} />
        {configId && <IcfAxiaAnalysisPanel configId={configId} />}
      </div>
    </AppLayout>
  );
};

export default IcfLajes;
