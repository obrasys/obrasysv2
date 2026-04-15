import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Calculator, Pencil } from 'lucide-react';
import { useIcfFundacoes, useCreateIcfFundacao, useUpdateIcfFundacao, useDeleteIcfFundacao, useIcfConfiguracao } from '@/hooks/useIcfData';
import { ICF_FUNDACAO_PRESETS } from '@/types/icf';
import { IcfAxiaContextual } from '@/components/icf/IcfAxiaContextual';
import { IcfAxiaAnalysisPanel } from '@/components/icf/IcfAxiaAnalysisPanel';
import {
  calcFundacaoSteel,
  REBAR_DIAMETERS,
  REBAR_SPACINGS,
  REBAR_WEIGHT_PER_METER,
  type RebarDiameter,
  type RebarSpacing,
  type SteelBreakdown,
} from '@/utils/icfSteelCalculation';

const IcfFundacoes = () => {
  const { configId } = useParams();
  const navigate = useNavigate();
  const { data: config } = useIcfConfiguracao(configId);
  const { data: fundacoes } = useIcfFundacoes(configId);
  const createFundacao = useCreateIcfFundacao();
  const updateFundacao = useUpdateIcfFundacao();
  const deleteFundacao = useDeleteIcfFundacao();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tipo, setTipo] = useState<'sapata_continua' | 'sapata_isolada'>('sapata_continua');

  interface FundacaoForm {
    referencia: string;
    comprimento: number;
    largura: number;
    altura: number;
    quantidade: number;
    aco_estimado_kg: number;
    diam_long: RebarDiameter;
    espac_long: RebarSpacing;
    diam_trans: RebarDiameter;
    espac_trans: RebarSpacing;
  }

  const defaultForm = (): FundacaoForm => {
    const p = ICF_FUNDACAO_PRESETS['sapata_continua'];
    return {
      referencia: '',
      comprimento: p.comprimento,
      largura: p.largura,
      altura: p.altura,
      quantidade: 1,
      aco_estimado_kg: 0,
      diam_long: 12,
      espac_long: 20,
      diam_trans: 10,
      espac_trans: 20,
    };
  };

  const [form, setForm] = useState<FundacaoForm>(defaultForm);

  // Cálculo detalhado do aço
  const breakdown = useMemo<SteelBreakdown>(() => {
    return calcFundacaoSteel({
      tipo,
      comprimento: form.comprimento,
      largura: form.largura,
      altura: form.altura,
      quantidade: form.quantidade,
      recobrimento_mm: config?.recobrimento_mm ?? 25,
      diam_long: form.diam_long,
      espac_long: form.espac_long,
      diam_trans: form.diam_trans,
      espac_trans: form.espac_trans,
      fator_perdas: ((config?.fator_perdas ?? 5) > 1 ? (config?.fator_perdas ?? 5) / 100 : config?.fator_perdas ?? 0.05),
      fator_transpasse: ((config?.fator_transpasse ?? 10) > 1 ? (config?.fator_transpasse ?? 10) / 100 : config?.fator_transpasse ?? 0.10),
    });
  }, [tipo, form, config]);

  // Sync breakdown total to form
  const acoTotal = breakdown.total_all_qty_kg;

  const applyPreset = (t: 'sapata_continua' | 'sapata_isolada') => {
    setTipo(t);
    const p = ICF_FUNDACAO_PRESETS[t];
    setForm(f => ({
      ...f,
      comprimento: p.comprimento,
      largura: p.largura,
      altura: p.altura,
      diam_long: t === 'sapata_isolada' ? 12 : 12,
      espac_long: 20,
      diam_trans: t === 'sapata_isolada' ? 12 : 10,
      espac_trans: 20,
    }));
  };

  const handleAdd = () => {
    if (!configId || !config) return;
    if (editingId) {
      updateFundacao.mutate({
        id: editingId,
        tipo_fundacao: tipo,
        referencia: form.referencia,
        comprimento: form.comprimento,
        largura: form.largura,
        altura: form.altura,
        quantidade: form.quantidade,
        aco_estimado_kg: acoTotal,
      } as any, { onSuccess: () => { setShowAdd(false); setEditingId(null); setForm(defaultForm()); } });
    } else {
      createFundacao.mutate({
        obra_id: config.obra_id,
        configuracao_id: configId,
        tipo_fundacao: tipo,
        referencia: form.referencia,
        comprimento: form.comprimento,
        largura: form.largura,
        altura: form.altura,
        quantidade: form.quantidade,
        aco_estimado_kg: acoTotal,
      } as any, { onSuccess: () => { setShowAdd(false); setForm(defaultForm()); } });
    }
  };

  const handleEdit = (f: any) => {
    setEditingId(f.id);
    setTipo(f.tipo_fundacao as any);
    setForm({
      referencia: f.referencia ?? '',
      comprimento: f.comprimento,
      largura: f.largura,
      altura: f.altura,
      quantidade: f.quantidade,
      aco_estimado_kg: f.aco_estimado_kg ?? 0,
      diam_long: 12,
      espac_long: 20,
      diam_trans: 10,
      espac_trans: 20,
    });
    setShowAdd(true);
  };

  const totalVolume = fundacoes?.reduce((s, f) => s + (f.volume_betao ?? 0), 0) ?? 0;
  const totalAco = fundacoes?.reduce((s, f) => s + (f.aco_estimado_kg ?? 0), 0) ?? 0;

  return (
    <AppLayout title="Fundações ICF" subtitle={config?.nome}>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/icf')}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
          <div className="flex-1" />
          <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) { setEditingId(null); setForm(defaultForm()); } }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Adicionar</Button></DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingId ? 'Editar Fundação' : 'Nova Fundação'}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                {/* Tipo + Referência */}
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Tipo</Label>
                    <Select value={tipo} onValueChange={v => applyPreset(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sapata_continua">Sapata Contínua</SelectItem>
                        <SelectItem value="sapata_isolada">Sapata Isolada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Referência</Label><Input value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))} placeholder="Ex: F01" /></div>
                </div>

                {/* Dimensões */}
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Comprimento (m)</Label><Input type="number" step="0.01" value={form.comprimento} onChange={e => setForm(f => ({ ...f, comprimento: +e.target.value }))} /></div>
                  <div><Label>Largura (m)</Label><Input type="number" step="0.01" value={form.largura} onChange={e => setForm(f => ({ ...f, largura: +e.target.value }))} /></div>
                  <div><Label>Altura (m)</Label><Input type="number" step="0.01" value={form.altura} onChange={e => setForm(f => ({ ...f, altura: +e.target.value }))} /></div>
                  <div><Label>Quantidade</Label><Input type="number" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: +e.target.value }))} /></div>
                </div>

                {/* Armadura */}
                <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Cálculo de Aço — Axia™</span>
                  </div>

                  <p className="text-xs text-muted-foreground">Armadura Longitudinal (inferior)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Diâmetro (Ø mm)</Label>
                      <Select value={String(form.diam_long)} onValueChange={v => setForm(f => ({ ...f, diam_long: +v as RebarDiameter }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {REBAR_DIAMETERS.map(d => (
                            <SelectItem key={d} value={String(d)}>Ø{d} ({REBAR_WEIGHT_PER_METER[d]} kg/m)</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Espaçamento (cm)</Label>
                      <Select value={String(form.espac_long)} onValueChange={v => setForm(f => ({ ...f, espac_long: +v as RebarSpacing }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {REBAR_SPACINGS.map(s => (
                            <SelectItem key={s} value={String(s)}>{s} cm</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">Armadura Transversal</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Diâmetro (Ø mm)</Label>
                      <Select value={String(form.diam_trans)} onValueChange={v => setForm(f => ({ ...f, diam_trans: +v as RebarDiameter }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {REBAR_DIAMETERS.map(d => (
                            <SelectItem key={d} value={String(d)}>Ø{d} ({REBAR_WEIGHT_PER_METER[d]} kg/m)</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Espaçamento (cm)</Label>
                      <Select value={String(form.espac_trans)} onValueChange={v => setForm(f => ({ ...f, espac_trans: +v as RebarSpacing }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {REBAR_SPACINGS.map(s => (
                            <SelectItem key={s} value={String(s)}>{s} cm</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="border-t pt-2 space-y-1 text-xs">
                    <div className="grid grid-cols-2 gap-x-4">
                      <span className="text-muted-foreground">Long: {breakdown.long_num_bars} barras × {breakdown.long_bar_length}m</span>
                      <span className="text-right font-medium">{breakdown.long_weight_kg} kg</span>
                      <span className="text-muted-foreground">Trans: {breakdown.trans_num_bars} barras × {breakdown.trans_bar_length}m</span>
                      <span className="text-right font-medium">{breakdown.trans_weight_kg} kg</span>
                    </div>
                    <div className="border-t pt-1 grid grid-cols-2 gap-x-4">
                      <span className="text-muted-foreground">Subtotal (1 un.)</span>
                      <span className="text-right">{breakdown.subtotal_kg} kg</span>
                      <span className="text-muted-foreground">+ Perdas ({(config?.fator_perdas ?? 5) > 1 ? (config?.fator_perdas ?? 5).toFixed(0) : ((config?.fator_perdas ?? 0.05) * 100).toFixed(0)}%)</span>
                      <span className="text-right">{breakdown.perdas_kg} kg</span>
                      <span className="text-muted-foreground">+ Amarração ({(config?.fator_transpasse ?? 10) > 1 ? (config?.fator_transpasse ?? 10).toFixed(0) : ((config?.fator_transpasse ?? 0.10) * 100).toFixed(0)}%)</span>
                      <span className="text-right">{breakdown.transpasse_kg} kg</span>
                    </div>
                    <div className="border-t pt-1 grid grid-cols-2 gap-x-4">
                      <span className="text-muted-foreground">Total (1 un.)</span>
                      <span className="text-right font-semibold">{breakdown.total_kg} kg</span>
                      {form.quantidade > 1 && (
                        <>
                          <span className="text-muted-foreground">× {form.quantidade} un.</span>
                          <span className="text-right font-bold text-primary">{acoTotal} kg</span>
                        </>
                      )}
                    </div>
                    <p className="text-muted-foreground pt-1">Rácio: {breakdown.ratio_kg_m3} kg/m³ · Vol: {(form.comprimento * form.largura * form.altura * form.quantidade).toFixed(3)} m³</p>
                  </div>
                </div>

                <Button onClick={handleAdd} disabled={createFundacao.isPending} className="w-full">Adicionar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card><CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref.</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Comp. (m)</TableHead>
                <TableHead className="text-right">Larg. (m)</TableHead>
                <TableHead className="text-right">Alt. (m)</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Vol. (m³)</TableHead>
                <TableHead className="text-right">Aço (kg)</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fundacoes?.map(f => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.referencia}</TableCell>
                  <TableCell className="text-xs">{f.tipo_fundacao === 'sapata_continua' ? 'Contínua' : f.tipo_fundacao === 'sapata_isolada' ? 'Isolada' : 'Outra'}</TableCell>
                  <TableCell className="text-right">{f.comprimento.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{f.largura.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{f.altura.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{f.quantidade}</TableCell>
                  <TableCell className="text-right font-bold">{f.volume_betao?.toFixed(3)}</TableCell>
                  <TableCell className="text-right">{f.aco_estimado_kg ?? '—'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => deleteFundacao.mutate(f.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!fundacoes || fundacoes.length === 0) && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Sem fundações registadas</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent></Card>

        <div className="grid grid-cols-2 gap-3">
          <Card><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Volume Total Fundações</p><p className="text-lg font-bold">{totalVolume.toFixed(3)} m³</p></CardContent></Card>
          <Card><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Aço Total Fundações</p><p className="text-lg font-bold">{totalAco.toFixed(1)} kg</p></CardContent></Card>
        </div>

        {/* Axia */}
        <IcfAxiaContextual context="fundacoes" config={config} fundacoes={fundacoes ?? []} />
        {configId && <IcfAxiaAnalysisPanel configId={configId} />}
      </div>
    </AppLayout>
  );
};

export default IcfFundacoes;
