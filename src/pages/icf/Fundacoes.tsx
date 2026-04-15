import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useIcfFundacoes, useCreateIcfFundacao, useDeleteIcfFundacao, useIcfConfiguracao } from '@/hooks/useIcfData';
import { ICF_FUNDACAO_PRESETS } from '@/types/icf';
import { IcfAxiaContextual } from '@/components/icf/IcfAxiaContextual';
import { IcfAxiaAnalysisPanel } from '@/components/icf/IcfAxiaAnalysisPanel';

const IcfFundacoes = () => {
  const { configId } = useParams();
  const navigate = useNavigate();
  const { data: config } = useIcfConfiguracao(configId);
  const { data: fundacoes } = useIcfFundacoes(configId);
  const createFundacao = useCreateIcfFundacao();
  const deleteFundacao = useDeleteIcfFundacao();
  const [showAdd, setShowAdd] = useState(false);
  const [tipo, setTipo] = useState<'sapata_continua' | 'sapata_isolada'>('sapata_continua');
  // Rácios paramétricos típicos de aço por m³ de betão (ICF)
  const ACO_RATIO: Record<string, number> = { sapata_continua: 85, sapata_isolada: 100 };

  const estimarAco = (t: string, comp: number, larg: number, alt: number, qtd: number) => {
    const vol = comp * larg * alt * qtd;
    const ratio = ACO_RATIO[t] ?? 90;
    return Math.round(vol * ratio * 10) / 10;
  };

  const [form, setForm] = useState(() => {
    const p = ICF_FUNDACAO_PRESETS['sapata_continua'];
    const aco = estimarAco('sapata_continua', p.comprimento, p.largura, p.altura, 1);
    return { referencia: '', comprimento: p.comprimento, largura: p.largura, altura: p.altura, quantidade: 1, aco_estimado_kg: aco };
  });

  const updateFormWithAco = (updates: Partial<typeof form>, tipoOverride?: string) => {
    setForm(f => {
      const next = { ...f, ...updates };
      const t = tipoOverride ?? tipo;
      next.aco_estimado_kg = estimarAco(t, next.comprimento, next.largura, next.altura, next.quantidade);
      return next;
    });
  };

  const applyPreset = (t: 'sapata_continua' | 'sapata_isolada') => {
    setTipo(t);
    const p = ICF_FUNDACAO_PRESETS[t];
    updateFormWithAco({ comprimento: p.comprimento, largura: p.largura, altura: p.altura }, t);
  };

  const handleAdd = () => {
    if (!configId || !config) return;
    createFundacao.mutate({
      obra_id: config.obra_id,
      configuracao_id: configId,
      tipo_fundacao: tipo,
      ...form,
    } as any, { onSuccess: () => setShowAdd(false) });
  };

  const totalVolume = fundacoes?.reduce((s, f) => s + (f.volume_betao ?? 0), 0) ?? 0;
  const totalAco = fundacoes?.reduce((s, f) => s + (f.aco_estimado_kg ?? 0), 0) ?? 0;

  return (
    <AppLayout title="Fundações ICF" subtitle={config?.nome}>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/icf')}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
          <div className="flex-1" />
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Adicionar</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Fundação</DialogTitle></DialogHeader>
              <div className="space-y-3">
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
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Comprimento (m)</Label><Input type="number" step="0.01" value={form.comprimento} onChange={e => setForm(f => ({ ...f, comprimento: +e.target.value }))} /></div>
                  <div><Label>Largura (m)</Label><Input type="number" step="0.01" value={form.largura} onChange={e => setForm(f => ({ ...f, largura: +e.target.value }))} /></div>
                  <div><Label>Altura (m)</Label><Input type="number" step="0.01" value={form.altura} onChange={e => setForm(f => ({ ...f, altura: +e.target.value }))} /></div>
                  <div><Label>Quantidade</Label><Input type="number" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: +e.target.value }))} /></div>
                </div>
                <div><Label>Aço Estimado (kg)</Label><Input type="number" step="0.1" value={form.aco_estimado_kg} onChange={e => setForm(f => ({ ...f, aco_estimado_kg: +e.target.value }))} /></div>
                <p className="text-xs text-muted-foreground">Vol. estimado: {(form.comprimento * form.largura * form.altura * form.quantidade).toFixed(3)} m³</p>
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
