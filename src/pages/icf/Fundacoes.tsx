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
import { Switch } from '@/components/ui/switch';
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
  type LayerBreakdown,
} from '@/utils/icfSteelCalculation';

const RebarSelect = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
  <div>
    <Label className="text-xs">{label}</Label>
    <Select value={String(value)} onValueChange={v => onChange(+v)}>
      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        {REBAR_DIAMETERS.map(d => (
          <SelectItem key={d} value={String(d)}>Ø{d} ({REBAR_WEIGHT_PER_METER[d]} kg/m)</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const SpacingSelect = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
  <div>
    <Label className="text-xs">{label}</Label>
    <Select value={String(value)} onValueChange={v => onChange(+v)}>
      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        {REBAR_SPACINGS.map(s => (
          <SelectItem key={s} value={String(s)}>{s} cm</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const LayerRow = ({ label, layer }: { label: string; layer: LayerBreakdown }) => {
  if (layer.num_bars === 0) return null;
  return (
    <>
      <span className="text-muted-foreground">{label}: Ø{layer.diameter}/{layer.spacing} — {layer.num_bars} barras × {layer.bar_length}m</span>
      <span className="text-right font-medium">{layer.weight_kg} kg</span>
    </>
  );
};

const SectionToggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between">
    <p className="text-xs font-semibold text-primary">{label}</p>
    <div className="flex items-center gap-2">
      <Label className="text-xs text-muted-foreground">Ativar</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  </div>
);

interface FundacaoForm {
  referencia: string;
  comprimento: number;
  largura: number;
  altura: number;
  quantidade: number;
  diam_long_inf: RebarDiameter;
  espac_long_inf: RebarSpacing;
  usar_arm_sup: boolean;
  diam_long_sup: RebarDiameter;
  espac_long_sup: RebarSpacing;
  usar_trans_inf: boolean;
  diam_trans_inf: RebarDiameter;
  espac_trans_inf: RebarSpacing;
  usar_trans_sup: boolean;
  diam_trans_sup: RebarDiameter;
  espac_trans_sup: RebarSpacing;
  usar_estribos: boolean;
  diam_estribo: RebarDiameter;
  espac_estribo: RebarSpacing;
  usar_barras_laterais: boolean;
  diam_lateral: RebarDiameter;
  espac_lateral: RebarSpacing;
}

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

  const defaultForm = (): FundacaoForm => {
    const p = ICF_FUNDACAO_PRESETS['sapata_continua'];
    return {
      referencia: '',
      comprimento: p.comprimento,
      largura: p.largura,
      altura: p.altura,
      quantidade: 1,
      diam_long_inf: 12,
      espac_long_inf: 20,
      usar_arm_sup: false,
      diam_long_sup: 10,
      espac_long_sup: 20,
      usar_trans_inf: true,
      diam_trans_inf: 10,
      espac_trans_inf: 20,
      usar_trans_sup: false,
      diam_trans_sup: 8,
      espac_trans_sup: 20,
      usar_estribos: true,
      diam_estribo: 8,
      espac_estribo: 20,
      usar_barras_laterais: false,
      diam_lateral: 8,
      espac_lateral: 20,
    };
  };

  const [form, setForm] = useState<FundacaoForm>(defaultForm);

  const getFatorDecimal = (val: number | undefined, fallback: number) => {
    const v = val ?? fallback;
    return v > 1 ? v / 100 : v;
  };

  const breakdown = useMemo<SteelBreakdown>(() => {
    return calcFundacaoSteel({
      tipo,
      comprimento: form.comprimento,
      largura: form.largura,
      altura: form.altura,
      quantidade: form.quantidade,
      recobrimento_mm: config?.recobrimento_mm ?? 25,
      diam_long_inf: form.diam_long_inf,
      espac_long_inf: form.espac_long_inf,
      usar_arm_sup: form.usar_arm_sup,
      diam_long_sup: form.diam_long_sup,
      espac_long_sup: form.espac_long_sup,
      usar_trans_inf: form.usar_trans_inf,
      diam_trans_inf: form.diam_trans_inf,
      espac_trans_inf: form.espac_trans_inf,
      usar_trans_sup: form.usar_trans_sup,
      diam_trans_sup: form.diam_trans_sup,
      espac_trans_sup: form.espac_trans_sup,
      usar_estribos: form.usar_estribos,
      diam_estribo: form.diam_estribo,
      espac_estribo: form.espac_estribo,
      usar_barras_laterais: form.usar_barras_laterais,
      diam_lateral: form.diam_lateral,
      espac_lateral: form.espac_lateral,
      fator_perdas: getFatorDecimal(config?.fator_perdas, 0.05),
      fator_transpasse: getFatorDecimal(config?.fator_transpasse, 0.10),
    });
  }, [tipo, form, config]);

  const acoTotal = breakdown.total_all_qty_kg;

  const applyPreset = (t: 'sapata_continua' | 'sapata_isolada') => {
    setTipo(t);
    const p = ICF_FUNDACAO_PRESETS[t];
    setForm(f => ({ ...f, comprimento: p.comprimento, largura: p.largura, altura: p.altura }));
  };

  const handleAdd = () => {
    if (!configId || !config) return;
    const payload: any = {
      tipo_fundacao: tipo,
      referencia: form.referencia,
      comprimento: form.comprimento,
      largura: form.largura,
      altura: form.altura,
      quantidade: form.quantidade,
      aco_estimado_kg: acoTotal,
    };
    if (editingId) {
      updateFundacao.mutate({ id: editingId, ...payload }, { onSuccess: () => { setShowAdd(false); setEditingId(null); setForm(defaultForm()); } });
    } else {
      createFundacao.mutate({ obra_id: config.obra_id, configuracao_id: configId, ...payload }, { onSuccess: () => { setShowAdd(false); setForm(defaultForm()); } });
    }
  };

  const handleEdit = (f: any) => {
    setEditingId(f.id);
    setTipo(f.tipo_fundacao as any);
    setForm({
      ...defaultForm(),
      referencia: f.referencia ?? '',
      comprimento: f.comprimento,
      largura: f.largura,
      altura: f.altura,
      quantidade: f.quantidade,
    });
    setShowAdd(true);
  };

  const totalVolume = fundacoes?.reduce((s, f) => s + (f.volume_betao ?? 0), 0) ?? 0;
  const totalAco = fundacoes?.reduce((s, f) => s + (f.aco_estimado_kg ?? 0), 0) ?? 0;

  const perdasPct = getFatorDecimal(config?.fator_perdas, 0.05) * 100;
  const transPct = getFatorDecimal(config?.fator_transpasse, 0.10) * 100;

  const upd = (patch: Partial<FundacaoForm>) => setForm(f => ({ ...f, ...patch }));

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
                  <div><Label>Referência</Label><Input value={form.referencia} onChange={e => upd({ referencia: e.target.value })} placeholder="Ex: F01" /></div>
                </div>

                {/* Dimensões */}
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Comprimento (m)</Label><Input type="number" step="0.01" value={form.comprimento} onChange={e => upd({ comprimento: +e.target.value })} /></div>
                  <div><Label>Largura (m)</Label><Input type="number" step="0.01" value={form.largura} onChange={e => upd({ largura: +e.target.value })} /></div>
                  <div><Label>Altura (m)</Label><Input type="number" step="0.01" value={form.altura} onChange={e => upd({ altura: +e.target.value })} /></div>
                  <div><Label>Quantidade</Label><Input type="number" value={form.quantidade} onChange={e => upd({ quantidade: +e.target.value })} /></div>
                </div>

                {/* ══ Armadura ══ */}
                <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Cálculo de Aço — Axia™</span>
                  </div>

                  {/* Longitudinal Inferior */}
                  <p className="text-xs font-semibold text-primary">Armadura Longitudinal — Inferior</p>
                  <div className="grid grid-cols-2 gap-3">
                    <RebarSelect label="Diâmetro (Ø mm)" value={form.diam_long_inf} onChange={v => upd({ diam_long_inf: v as RebarDiameter })} />
                    <SpacingSelect label="Espaçamento (cm)" value={form.espac_long_inf} onChange={v => upd({ espac_long_inf: v as RebarSpacing })} />
                  </div>

                  {/* Longitudinal Superior */}
                  <SectionToggle label="Armadura Longitudinal — Superior" checked={form.usar_arm_sup} onChange={v => upd({ usar_arm_sup: v })} />
                  {form.usar_arm_sup && (
                    <div className="grid grid-cols-2 gap-3">
                      <RebarSelect label="Diâmetro (Ø mm)" value={form.diam_long_sup} onChange={v => upd({ diam_long_sup: v as RebarDiameter })} />
                      <SpacingSelect label="Espaçamento (cm)" value={form.espac_long_sup} onChange={v => upd({ espac_long_sup: v as RebarSpacing })} />
                    </div>
                  )}

                  {/* Transversal Inferior */}
                  <SectionToggle label="Armadura Transversal — Inferior" checked={form.usar_trans_inf} onChange={v => upd({ usar_trans_inf: v })} />
                  {form.usar_trans_inf && (
                    <div className="grid grid-cols-2 gap-3">
                      <RebarSelect label="Diâmetro (Ø mm)" value={form.diam_trans_inf} onChange={v => upd({ diam_trans_inf: v as RebarDiameter })} />
                      <SpacingSelect label="Espaçamento (cm)" value={form.espac_trans_inf} onChange={v => upd({ espac_trans_inf: v as RebarSpacing })} />
                    </div>
                  )}

                  {/* Transversal Superior */}
                  <SectionToggle label="Armadura Transversal — Superior" checked={form.usar_trans_sup} onChange={v => upd({ usar_trans_sup: v })} />
                  {form.usar_trans_sup && (
                    <div className="grid grid-cols-2 gap-3">
                      <RebarSelect label="Diâmetro (Ø mm)" value={form.diam_trans_sup} onChange={v => upd({ diam_trans_sup: v as RebarDiameter })} />
                      <SpacingSelect label="Espaçamento (cm)" value={form.espac_trans_sup} onChange={v => upd({ espac_trans_sup: v as RebarSpacing })} />
                    </div>
                  )}

                  {/* ── Estribos (Cintas) ── */}
                  <SectionToggle label="Estribos (Cintas Laterais)" checked={form.usar_estribos} onChange={v => upd({ usar_estribos: v })} />
                  {form.usar_estribos && (
                    <div className="grid grid-cols-2 gap-3">
                      <RebarSelect label="Diâmetro (Ø mm)" value={form.diam_estribo} onChange={v => upd({ diam_estribo: v as RebarDiameter })} />
                      <SpacingSelect label="Espaçamento (cm)" value={form.espac_estribo} onChange={v => upd({ espac_estribo: v as RebarSpacing })} />
                    </div>
                  )}

                  {/* ── Barras Verticais Laterais ── */}
                  <SectionToggle label="Barras Verticais Laterais" checked={form.usar_barras_laterais} onChange={v => upd({ usar_barras_laterais: v })} />
                  {form.usar_barras_laterais && (
                    <div className="grid grid-cols-2 gap-3">
                      <RebarSelect label="Diâmetro (Ø mm)" value={form.diam_lateral} onChange={v => upd({ diam_lateral: v as RebarDiameter })} />
                      <SpacingSelect label="Espaçamento (cm)" value={form.espac_lateral} onChange={v => upd({ espac_lateral: v as RebarSpacing })} />
                    </div>
                  )}

                  {/* ── Breakdown ── */}
                  <div className="border-t pt-2 space-y-1 text-xs">
                    <div className="grid grid-cols-[1fr_auto] gap-x-4">
                      <LayerRow label="Long. Inf" layer={breakdown.long_inf} />
                      <LayerRow label="Long. Sup" layer={breakdown.long_sup} />
                      <LayerRow label="Trans. Inf" layer={breakdown.trans_inf} />
                      <LayerRow label="Trans. Sup" layer={breakdown.trans_sup} />
                      <LayerRow label="Estribos" layer={breakdown.estribos} />
                      <LayerRow label="Barras Lat." layer={breakdown.barras_laterais} />
                    </div>
                    <div className="border-t pt-1 grid grid-cols-2 gap-x-4">
                      <span className="text-muted-foreground">Subtotal (1 un.)</span>
                      <span className="text-right">{breakdown.subtotal_kg} kg</span>
                      <span className="text-muted-foreground">+ Perdas ({perdasPct.toFixed(0)}%)</span>
                      <span className="text-right">{breakdown.perdas_kg} kg</span>
                      <span className="text-muted-foreground">+ Amarração ({transPct.toFixed(0)}%)</span>
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

                <Button onClick={handleAdd} disabled={createFundacao.isPending || updateFundacao.isPending} className="w-full">{editingId ? 'Guardar Alterações' : 'Adicionar'}</Button>
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
                  <TableCell className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(f)}><Pencil className="h-3 w-3" /></Button>
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

        <IcfAxiaContextual context="fundacoes" config={config} fundacoes={fundacoes ?? []} />
        {configId && <IcfAxiaAnalysisPanel configId={configId} />}
      </div>
    </AppLayout>
  );
};

export default IcfFundacoes;
