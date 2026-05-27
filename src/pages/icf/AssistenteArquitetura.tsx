import { useState, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, Upload, Loader2, ChevronRight, Sparkles, AlertTriangle, CheckCircle2, Ruler, Layers, Box,
} from 'lucide-react';
import {
  useCreateAssistantSession, useIcfAssistantItems, useIcfAssistantSession,
  useUpdateAssistantSession, useUpdateAssistantItem, useApplyFoundationSuggestion,
} from '@/hooks/useIcfAssistantSession';
import { FOUNDATIONS_NOT_FOUND_MESSAGE, type IcfPlanKind, type FoundationOptionKey } from '@/types/icf-assistant';
import { FOUNDATION_OPTIONS } from '@/lib/icf-foundation-suggestions';
import { FoundationOptionCard } from '@/components/icf/assistant/FoundationOptionCard';
import { AuditPanel } from '@/components/icf/assistant/AuditPanel';

const STEPS = [
  'Planta', 'Calibração', 'Paredes ICF', 'Parâmetros', 'Fundações', 'Resumo',
];

export default function AssistenteArquitetura() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const { user, organization } = useAuth();
  const { obras } = useObras();
  const initialObra = params.get('obra') || null;
  const sessionIdParam = params.get('s');

  const [activeSessionId, setActiveSessionId] = useState<string | null>(sessionIdParam);
  const session = useIcfAssistantSession(activeSessionId ?? undefined);
  const items = useIcfAssistantItems(activeSessionId ?? undefined);

  const createSession = useCreateAssistantSession();
  const updateSession = useUpdateAssistantSession();
  const updateItem = useUpdateAssistantItem();
  const applyFoundation = useApplyFoundationSuggestion(activeSessionId ?? '');
  const createPanel = useCreateIcfWallPanel();

  const [planKind, setPlanKind] = useState<IcfPlanKind>('arquitetura');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [materializing, setMaterializing] = useState(false);
  const [scale, setScale] = useState<string>('');
  const [linkObraId, setLinkObraId] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const step = session.data?.current_step ?? 1;
  const sessionObraId = session.data?.obra_id || null;

  const goStep = (n: number) => {
    if (!activeSessionId) return;
    updateSession.mutate({ id: activeSessionId, patch: { current_step: n } });
  };


  // STEP 1 — upload + tipo
  const handleUpload = async (file: File) => {
    if (!user || !organization) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'pdf';
      const path = `${user.id}/icf-assistant/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('plan-files').upload(path, file);
      if (upErr) throw upErr;
      const created = await createSession.mutateAsync({ obra_id: obraId, plan_kind: planKind, file_path: path });
      setActiveSessionId(created.id);
      navigate(`/icf/assistente?${obraId ? `obra=${obraId}&` : ''}s=${created.id}`, { replace: true });
      toast({ title: 'Planta carregada', description: 'Avance para a calibração.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  // STEP 3 — chamar Axia para extrair paredes
  const runAxiaExtraction = async () => {
    if (!activeSessionId || !session.data?.file_path) return;
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('icf-architecture-assistant', {
        body: {
          session_id: activeSessionId,
          file_path: session.data.file_path,
          plan_kind: session.data.plan_kind,
          scale_m_per_px: session.data.scale_m_per_px,
          espessura_nucleo: session.data.espessura_nucleo,
        },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({
        title: 'Análise concluída',
        description: `Paredes encontradas: ${(data as any)?.summary?.paredes ?? 0}. Fundações: ${(data as any)?.summary?.foundations_found ? 'sim' : 'não'}.`,
      });
      items.refetch();
      session.refetch();
    } catch (e: any) {
      toast({ title: 'Erro na análise', description: e.message, variant: 'destructive' });
    } finally {
      setAnalyzing(false);
    }
  };

  const wallItems = useMemo(() => (items.data ?? []).filter((i) => i.category === 'parede_ext' || i.category === 'parede_int'), [items.data]);
  const icfSelectedWalls = useMemo(() => wallItems.filter((i) => i.is_icf_candidate || i.user_confirmed), [wallItems]);
  const icfWallLength = useMemo(
    () => icfSelectedWalls.reduce((s, w) => s + (Number(w.attributes?.comprimento) || 0), 0),
    [icfSelectedWalls],
  );

  if (!activeSessionId || !session.data) {
    return (
      <div className="container max-w-5xl py-6 space-y-6">
        <BackBar onBack={() => navigate('/icf')} />
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-primary" />
              Assistente ICF a partir de Arquitetura
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Carregue uma planta arquitetónica comum. A Axia identifica paredes candidatas a ICF e
              ajuda a definir fundações de forma rastreável.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Tipo de planta</Label>
              <Select value={planKind} onValueChange={(v) => setPlanKind(v as IcfPlanKind)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="arquitetura">Planta de arquitetura</SelectItem>
                  <SelectItem value="estrutural">Projeto estrutural / fundações</SelectItem>
                  <SelectItem value="icf">Projeto ICF detalhado</SelectItem>
                  <SelectItem value="desconhecido">Não sei</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
            <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Carregar planta
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <BackBar onBack={() => navigate('/icf')} />

      <Stepper step={step} onJump={goStep} />

      {step === 1 && (
        <StepReUpload session={session.data} onContinue={() => goStep(2)} />
      )}

      {step === 2 && (
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Ruler className="h-4 w-4 text-primary" /> Calibração da planta
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Informe a escala estimada da planta (metros por pixel). Pode ser refinada depois.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-w-xs">
              <Label className="text-xs">Escala (m/px)</Label>
              <Input
                type="number"
                step="0.0001"
                value={scale || (session.data.scale_m_per_px ?? '')}
                onChange={(e) => setScale(e.target.value)}
              />
            </div>
            <Button
              onClick={() => {
                const v = parseFloat(scale);
                if (!Number.isFinite(v) || v <= 0) {
                  toast({ title: 'Escala inválida', variant: 'destructive' });
                  return;
                }
                updateSession.mutate({ id: activeSessionId, patch: { scale_m_per_px: v, current_step: 3 } });
              }}
            >
              Guardar e continuar <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Paredes candidatas a ICF
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Paredes exteriores são pré-marcadas. Paredes interiores requerem confirmação explícita.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {wallItems.length === 0 ? (
              <Button onClick={runAxiaExtraction} disabled={analyzing}>
                {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Analisar planta com a Axia
              </Button>
            ) : (
              <>
                <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                  {wallItems.map((w) => (
                    <div key={w.id} className="flex items-center gap-3 p-2 text-sm">
                      <Checkbox
                        checked={w.is_icf_candidate || w.user_confirmed}
                        onCheckedChange={(v) =>
                          updateItem.mutate({ id: w.id, patch: { is_icf_candidate: !!v, user_confirmed: !!v } })
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{w.reference}</div>
                        <div className="text-xs text-muted-foreground">
                          {w.category === 'parede_ext' ? 'Exterior' : 'Interior'} ·
                          {w.quantity ? ` ${w.quantity} ${w.unit}` : ''} ·
                          Confiança {(Number(w.confidence) * 100).toFixed(0)}%
                        </div>
                      </div>
                      {w.category === 'parede_int' && (
                        <Badge variant="outline" className="text-xs">Requer confirmação</Badge>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={runAxiaExtraction} disabled={analyzing}>
                    {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Re-analisar
                  </Button>
                  <Button onClick={() => goStep(4)}>
                    Continuar <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">Parâmetros ICF</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Espessura núcleo (m)</Label>
              <Input
                type="number" step="0.01" defaultValue={session.data.espessura_nucleo}
                onBlur={(e) =>
                  updateSession.mutate({ id: activeSessionId, patch: { espessura_nucleo: parseFloat(e.target.value) || 0.15 } })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Classe de betão</Label>
              <Input
                defaultValue={session.data.classe_betao}
                onBlur={(e) => updateSession.mutate({ id: activeSessionId, patch: { classe_betao: e.target.value } })}
              />
            </div>
            <div>
              <Label className="text-xs">Classe de aço</Label>
              <Input
                defaultValue={session.data.classe_aco}
                onBlur={(e) => updateSession.mutate({ id: activeSessionId, patch: { classe_aco: e.target.value } })}
              />
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <Button onClick={() => goStep(5)}>
                Continuar <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Box className="h-4 w-4 text-primary" /> Fundações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!session.data.foundations_found && (
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 p-3 rounded-md text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                <span>{FOUNDATIONS_NOT_FOUND_MESSAGE}</span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {FOUNDATION_OPTIONS.map((opt) => (
                <FoundationOptionCard
                  key={opt.key}
                  option={opt}
                  selected={session.data?.foundation_option === opt.key}
                  baseIcfWallLength={icfWallLength}
                  isPending={applyFoundation.isPending}
                  onApply={(p) =>
                    applyFoundation.mutate({ option: opt.key as FoundationOptionKey, params: p, baseIcfWallLength: icfWallLength })
                  }
                />
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => goStep(6)}>
                Ver resumo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 6 && (
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Resumo auditável
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AuditPanel
              items={items.data ?? []}
              onToggleConfirm={(it, v) =>
                updateItem.mutate({
                  id: it.id,
                  patch: { user_confirmed: v, source_type: v ? 'confirmado_utilizador' : it.source_type },
                })
              }
              onGeneratePre={() => {
                updateSession.mutate({ id: activeSessionId, patch: { status: 'pre_orcamento' } });
                toast({ title: 'Pré-orçamento marcado', description: 'Use o módulo ICF para gerar o orçamento incluindo as sugestões.' });
              }}
              onGenerateValidated={() => {
                updateSession.mutate({ id: activeSessionId, patch: { status: 'validado' } });
                toast({ title: 'Itens validados', description: 'Apenas itens confirmados serão enviados ao orçamento.' });
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BackBar({ onBack }: { onBack: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onBack}>
      <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao ICF
    </Button>
  );
}

function Stepper({ step, onJump }: { step: number; onJump: (n: number) => void }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {STEPS.map((label, idx) => {
        const n = idx + 1;
        const active = n === step;
        const done = n < step;
        return (
          <button
            key={label}
            onClick={() => onJump(n)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              active ? 'bg-primary text-primary-foreground border-primary'
                : done ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-muted/30 border-border text-muted-foreground'
            }`}
          >
            {n}. {label}
          </button>
        );
      })}
    </div>
  );
}

function StepReUpload({ session, onContinue }: { session: any; onContinue: () => void }) {
  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-base">Planta carregada</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm">
          Tipo: <Badge variant="outline">{session.plan_kind}</Badge>
        </p>
        <p className="text-xs text-muted-foreground truncate">{session.file_path}</p>
        <Button onClick={onContinue}>
          Continuar <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
