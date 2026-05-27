import { useState } from 'react';
import { Send, Loader2, Save, History, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIcfConfiguracoes } from '@/hooks/useIcfData';
import {
  aggregateDossierComposition,
  useCreateIcfSnapshot,
  useIcfDossierPanels,
  useIcfSnapshots,
  useSendDossierToBudget,
} from '@/hooks/useIcfDossier';
import type { IcfProjectAnalysis } from '@/types/icf-dossier';

export function DossierOrcamentoTab({ analysis }: { analysis: IcfProjectAnalysis }) {
  const { data: panels = [] } = useIcfDossierPanels(analysis.id);
  const { data: configs = [] } = useIcfConfiguracoes();
  const { data: snapshots = [] } = useIcfSnapshots(analysis.id);
  const send = useSendDossierToBudget();
  const snap = useCreateIcfSnapshot();

  const agg = aggregateDossierComposition(panels);
  const [configId, setConfigId] = useState(analysis.configuracao_id ?? '');
  const [margin, setMargin] = useState(20);
  const [iva, setIva] = useState(23);

  const canSend = agg.panelsValidated > 0 && !!configId && !!analysis.obra_id;

  const handleSnapshot = () => {
    snap.mutate({
      analysisId: analysis.id,
      label: `Snapshot ${new Date().toLocaleString('pt-PT')}`,
      payload: {
        analysis,
        composition: agg,
        panel_ids: panels.map(p => p.id),
      },
    });
  };

  const handleSend = () => {
    if (!analysis.obra_id || !configId) return;
    send.mutate({
      analysisId: analysis.id,
      obraId: analysis.obra_id,
      configuracaoId: configId,
      margem_lucro: margin / 100,
      iva_percent: iva,
    });
  };

  return (
    <div className="space-y-4">
      {!analysis.obra_id && (
        <Card className="rounded-xl border-amber-200">
          <CardContent className="py-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-sm">Associe uma obra ao dossiê antes de enviar para orçamento.</p>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-xl">
        <CardHeader><CardTitle className="text-base">Envio para orçamento</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-3">
              <Label className="text-xs">Configuração ICF</Label>
              <Select value={configId} onValueChange={setConfigId}>
                <SelectTrigger><SelectValue placeholder="Selecionar configuração…" /></SelectTrigger>
                <SelectContent>
                  {configs.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome} · v{c.versao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Margem de lucro (%)</Label>
              <Input type="number" value={margin} onChange={e => setMargin(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">IVA (%)</Label>
              <Input type="number" value={iva} onChange={e => setIva(Number(e.target.value))} />
            </div>
            <div className="flex items-end">
              <Badge variant="outline" className="text-xs">
                {agg.panelsValidated} pano(s) validado(s) · {agg.netAreaM2.toFixed(2)} m²
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={handleSend} disabled={!canSend || send.isPending}>
              {send.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar para orçamento
            </Button>
            <Button variant="outline" onClick={handleSnapshot} disabled={snap.isPending}>
              <Save className="h-4 w-4 mr-2" /> Guardar snapshot
            </Button>
          </div>

          {agg.panelsValidated === 0 && (
            <p className="text-xs text-muted-foreground">
              É necessário pelo menos um pano com estado <strong>validado</strong> para enviar.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" /> Snapshots ({snapshots.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem snapshots guardados.</p>
          ) : (
            <div className="space-y-1">
              {snapshots.map(s => (
                <div key={s.id} className="flex items-center justify-between p-2 rounded border bg-card/40 text-sm">
                  <div>
                    <p className="font-medium">v{s.version_number} · {s.label}</p>
                    <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString('pt-PT')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
