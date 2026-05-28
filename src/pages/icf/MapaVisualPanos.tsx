import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Plus, Inbox, Send, Sparkles } from 'lucide-react';
import { useObras } from '@/hooks/useObras';
import { useIcfBlockLibrary } from '@/hooks/useIcfBlockLibrary';
import { useIcfConfiguracoes } from '@/hooks/useIcfData';
import { useIcfWallPanels, useCreateIcfWallPanel, useSendWallPanelsToBudget } from '@/hooks/useIcfWallPanels';
import { useIcfAssistantSession } from '@/hooks/useIcfAssistantSession';
import { ICFWallPanelCard } from '@/components/icf/panels/ICFWallPanelCard';
import type { ICFWallPanel } from '@/types/icf-homeblock';
import { toast } from 'sonner';

const ICF_DISCLAIMER =
  'As medições e composições ICF geradas pela Axia são estimativas assistidas para apoio à orçamentação e planeamento. Devem ser revistas e validadas por responsável técnico antes da execução. O Obra Sys não substitui projeto executivo, cálculo estrutural ou responsabilidade técnica de obra.';

const IcfMapaVisualPanos = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { obras } = useObras();
  const sessionParam = params.get('session');
  const session = useIcfAssistantSession(sessionParam ?? undefined);
  const [obraId, setObraId] = useState(params.get('obra') || '');

  // Auto-resolve obra a partir da sessão do assistente (evita re-selecionar)
  useEffect(() => {
    if (sessionParam && session.data?.obra_id && !obraId) {
      setObraId(session.data.obra_id);
      const next = new URLSearchParams(params);
      next.set('obra', session.data.obra_id);
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionParam, session.data?.obra_id]);

  const { data: panels, isLoading } = useIcfWallPanels(obraId);
  const { data: blocks } = useIcfBlockLibrary('bloco_principal');
  const { data: configs } = useIcfConfiguracoes(obraId);
  const create = useCreateIcfWallPanel();
  const sendBudget = useSendWallPanelsToBudget();

  const validatedCount = (panels ?? []).filter(p => p.status === 'validado').length;
  const latestConfig = configs?.[0];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPanel, setNewPanel] = useState({
    label: '',
    floor: '',
    room: '',
    length_m: 4,
    height_m: 2.7,
    thickness_mm: 220,
    selected_block_code: 'HB-BLOCO-220',
  });

  const handleObraChange = (v: string) => {
    setObraId(v);
    const next = new URLSearchParams(params);
    next.set('obra', v);
    setParams(next, { replace: true });
  };

  const sessionLocked = !!sessionParam && !!session.data?.obra_id;
  const selectedObra = obras?.find(o => o.id === obraId);


  const handleCreate = () => {
    if (!obraId) return;
    if (!newPanel.label.trim()) {
      toast.error('Indique uma etiqueta para o pano');
      return;
    }
    create.mutate(
      { obra_id: obraId, source: 'manual', status: 'rascunho', openings: [], ...newPanel },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setNewPanel({ ...newPanel, label: '' });
        },
      },
    );
  };

  const handleSendToBudget = (p: ICFWallPanel) => {
    if (p.status !== 'validado') {
      toast.info('Valide o pano antes de o enviar para orçamento.');
      return;
    }
    handleSendAll();
  };

  const handleSendAll = () => {
    if (!obraId) return;
    if (!latestConfig) {
      toast.error('Crie uma configuração ICF para esta obra antes de enviar para orçamento.');
      navigate(`/icf?obra=${obraId}`);
      return;
    }
    if (validatedCount === 0) {
      toast.info('Não há panos validados para enviar.');
      return;
    }
    sendBudget.mutate(
      { obraId, configuracaoId: latestConfig.id },
      { onSuccess: (out) => navigate(`/orcamentos/${out.orcamento_id}`) },
    );
  };

  return (
    <AppLayout
      title="Mapa Visual dos Panos ICF"
      subtitle="Visualização e validação humana dos panos detetados"
    >
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {sessionLocked ? (
            <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Sessão Axia:</span>
              <span className="font-medium">{selectedObra?.nome ?? 'Obra associada'}</span>
              <Badge variant="outline" className="ml-1 text-[10px]">{session.data?.plan_kind}</Badge>
            </div>
          ) : (
            <Select value={obraId} onValueChange={handleObraChange}>
              <SelectTrigger className="w-full sm:w-72"><SelectValue placeholder="Selecionar obra…" /></SelectTrigger>
              <SelectContent>
                {obras?.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          )}


          {obraId && (
            <>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline"><Plus className="h-4 w-4 mr-2" /> Novo pano</Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo pano de parede</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Etiqueta" full><Input value={newPanel.label} onChange={e => setNewPanel({ ...newPanel, label: e.target.value })} placeholder="Ex: Parede exterior sala - fachada Sul" /></Field>
                  <Field label="Piso"><Input value={newPanel.floor} onChange={e => setNewPanel({ ...newPanel, floor: e.target.value })} /></Field>
                  <Field label="Compartimento"><Input value={newPanel.room} onChange={e => setNewPanel({ ...newPanel, room: e.target.value })} /></Field>
                  <Field label="Comprimento (m)"><Input type="number" step="0.01" value={newPanel.length_m} onChange={e => setNewPanel({ ...newPanel, length_m: Number(e.target.value) })} /></Field>
                  <Field label="Altura (m)"><Input type="number" step="0.01" value={newPanel.height_m} onChange={e => setNewPanel({ ...newPanel, height_m: Number(e.target.value) })} /></Field>
                  <Field label="Espessura (mm)"><Input type="number" value={newPanel.thickness_mm} onChange={e => setNewPanel({ ...newPanel, thickness_mm: Number(e.target.value) })} /></Field>
                  <Field label="Sistema HOMEBLOCK">
                    <Select value={newPanel.selected_block_code} onValueChange={v => setNewPanel({ ...newPanel, selected_block_code: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {blocks?.map(b => <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreate} disabled={create.isPending}>Criar pano</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              onClick={handleSendAll}
              disabled={sendBudget.isPending || validatedCount === 0}
            >
              {sendBudget.isPending
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <Send className="h-4 w-4 mr-2" />}
              Enviar {validatedCount} validado(s) para orçamento
            </Button>
            </>
          )}
        </div>

        {!obraId ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-50" />
            Selecione uma obra para visualizar os panos ICF.
          </CardContent></Card>
        ) : isLoading ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <Loader2 className="h-5 w-5 mx-auto animate-spin" />
          </CardContent></Card>
        ) : (panels ?? []).length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground space-y-2">
            <Inbox className="h-10 w-10 mx-auto opacity-50" />
            <p>Sem panos registados nesta obra.</p>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {panels!.map(p => (
              <ICFWallPanelCard key={p.id} panel={p} onSendToBudget={handleSendToBudget} />
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-3 mt-4">
          {ICF_DISCLAIMER}
        </p>
      </div>
    </AppLayout>
  );
};

const Field = ({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) => (
  <div className={full ? 'col-span-2 space-y-1' : 'space-y-1'}>
    <Label className="text-xs">{label}</Label>
    {children}
  </div>
);

export default IcfMapaVisualPanos;
