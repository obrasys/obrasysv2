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
import { useObras } from '@/hooks/useObras';
import { useCreateIcfWallPanel } from '@/hooks/useIcfWallPanels';
import { FOUNDATIONS_NOT_FOUND_MESSAGE, type IcfPlanKind, type FoundationOptionKey } from '@/types/icf-assistant';
import { FOUNDATION_OPTIONS } from '@/lib/icf-foundation-suggestions';
import { FoundationOptionCard } from '@/components/icf/assistant/FoundationOptionCard';
import { AuditPanel } from '@/components/icf/assistant/AuditPanel';
import { IcfPlanCalibrator, type CalibrationPayload } from '@/components/icf/assistant/IcfPlanCalibrator';
import { IcfFoundationsModal } from '@/components/icf/assistant/IcfFoundationsModal';
import { renderPdfFirstPageToPngBlob } from '@/lib/pdf-to-image';


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
  const [foundationsModalOpen, setFoundationsModalOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const step = session.data?.current_step ?? 1;
  const sessionObraId = session.data?.obra_id || null;

  const goStep = (n: number) => {
    if (!activeSessionId) return;
    updateSession.mutate({ id: activeSessionId, patch: { current_step: n } });
  };


  // STEP 1 - upload + tipo
  const handleUpload = async (file: File) => {
    if (!user || !organization) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'pdf';
      const path = `${user.id}/icf-assistant/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('plan-files').upload(path, file);
      if (upErr) throw upErr;
      const created = await createSession.mutateAsync({ obra_id: initialObra, plan_kind: planKind, file_path: path });
      setActiveSessionId(created.id);
      navigate(`/icf/assistente?${initialObra ? `obra=${initialObra}&` : ''}s=${created.id}`, { replace: true });
      toast({ title: 'Planta carregada', description: 'Avance para a calibração.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);

    }
  };

  // STEP 2 - guardar calibração
  const handleSaveCalibration = (p: CalibrationPayload) => {
    if (!activeSessionId) return;
    updateSession.mutate(
      {
        id: activeSessionId,
        patch: {
          calibration_method: p.method,
          calibration_point_a: p.point_a ?? null,
          calibration_point_b: p.point_b ?? null,
          calibration_distance_px: p.distance_px ?? null,
          calibration_real_distance_m: p.real_distance_m ?? null,
          calibration_declared_scale: p.declared_scale ?? null,
          calibration_confidence: p.confidence,
          calibration_page: p.page,
          calibration_override: p.override,
          scale_m_per_px: p.scale_m_per_px,
          current_step: 3,
        } as any,
      },
      {
        onSuccess: () =>
          toast({
            title: p.override ? 'A continuar sem calibração precisa' : 'Calibração guardada',
            description: p.override
              ? 'Quantitativos marcados como baixa confiança.'
              : `Método: ${p.method} · confiança ${p.confidence}.`,
          }),
      },
    );
  };

  // STEP 3 - chamar Axia para extrair paredes
  const runAxiaExtraction = async () => {
    if (!activeSessionId || !session.data?.file_path) return;
    const s: any = session.data;
    if (!s.calibration_method && !s.calibration_override) {
      toast({ title: 'Calibre a planta antes de analisar', variant: 'destructive' });
      goStep(2);
      return;
    }
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('icf-architecture-assistant', {
        body: {
          session_id: activeSessionId,
          file_path: session.data.file_path,
          plan_kind: session.data.plan_kind,
          scale_m_per_px: session.data.scale_m_per_px,
          espessura_nucleo: session.data.espessura_nucleo,
          calibration: {
            method: s.calibration_method ?? 'uncalibrated',
            confidence: s.calibration_confidence ?? 'baixa',
            page: s.calibration_page ?? 1,
            real_distance_m: s.calibration_real_distance_m ?? null,
            distance_px: s.calibration_distance_px ?? null,
            declared_scale: s.calibration_declared_scale ?? null,
            override: !!s.calibration_override,
          },
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

  const handleLinkObra = () => {
    if (!activeSessionId || !linkObraId) return;
    updateSession.mutate(
      { id: activeSessionId, patch: { obra_id: linkObraId } as any },
      { onSuccess: () => toast({ title: 'Obra associada à sessão' }) },
    );
  };

  const handleMaterializePanels = async (target: 'mapa' | 'manual') => {
    if (!activeSessionId) return;
    const obra = sessionObraId || linkObraId;
    if (!obra) {
      toast({ title: 'Associe uma obra à sessão primeiro', variant: 'destructive' });
      return;
    }
    if (icfSelectedWalls.length === 0) {
      toast({ title: 'Sem panos ICF selecionados', variant: 'destructive' });
      return;
    }
    setMaterializing(true);
    try {
      const espessuraMm = Math.round((session.data?.espessura_nucleo || 0.15) * 1000) + 130;
      for (let i = 0; i < icfSelectedWalls.length; i++) {
        const w = icfSelectedWalls[i];
        const length_m = Number(w.attributes?.comprimento) || 4;
        const height_m = Number(w.attributes?.altura) || 2.7;
        await createPanel.mutateAsync({
          obra_id: obra,
          label: w.reference || `Pano ${i + 1}`,
          floor: (w.attributes?.piso as string) || null,
          room: (w.attributes?.compartimento as string) || null,
          length_m,
          height_m,
          thickness_mm: espessuraMm,
          selected_block_code: 'HB-BLOCO-220',
          openings: [],
          status: 'rascunho',
          source: 'axia',
          notes: `Assistente ICF - item ${w.id}`,
        } as any);
      }
      toast({
        title: 'Panos materializados',
        description: `${icfSelectedWalls.length} pano(s) criados na obra.`,
      });
      const qs = `?obra=${obra}&session=${activeSessionId}`;
      navigate(target === 'mapa' ? `/icf/mapa-visual${qs}` : `/icf/manual${qs}`);
    } catch (e: any) {
      toast({ title: 'Erro ao materializar', description: e.message, variant: 'destructive' });
    } finally {
      setMaterializing(false);
    }
  };

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

      {step === 2 && session.data.file_path && (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Visualize a planta e calibre a escala antes de prosseguir. A calibração por medida
            conhecida (cota) é o método mais fiável.
          </div>
          <IcfPlanCalibrator
            filePath={session.data.file_path}
            initialPage={(session.data as any).calibration_page ?? 1}
            initial={{
              method: (session.data as any).calibration_method ?? undefined,
              point_a: (session.data as any).calibration_point_a ?? null,
              point_b: (session.data as any).calibration_point_b ?? null,
              real_distance_m: (session.data as any).calibration_real_distance_m ?? null,
              declared_scale: (session.data as any).calibration_declared_scale ?? null,
              page: (session.data as any).calibration_page ?? 1,
              override: (session.data as any).calibration_override ?? false,
            }}
            isSaving={updateSession.isPending}
            onConfirm={handleSaveCalibration}
          />
        </div>
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
            {(() => {
              const s: any = session.data;
              const cal = s.calibration_method as string | null;
              if (cal && !s.calibration_override) {
                return (
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    Planta calibrada · método {cal} · confiança {s.calibration_confidence}
                  </div>
                );
              }
              if (s.calibration_override) {
                return (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    A continuar sem calibração precisa - quantitativos terão baixa confiança.
                  </div>
                );
              }
              return (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    Planta sem calibração.
                  </span>
                  <Button size="sm" variant="outline" onClick={() => goStep(2)}>Calibrar</Button>
                </div>
              );
            })()}
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
        <div className="space-y-4">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Resumo auditável
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!sessionObraId && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                  <p className="text-sm font-medium">Associe esta sessão a uma obra</p>
                  <p className="text-xs text-muted-foreground">
                    A obra é necessária para gerar o Mapa Visual de Panos, o Manual ICF e enviar para orçamento.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={linkObraId} onValueChange={setLinkObraId}>
                      <SelectTrigger className="h-9 sm:w-72"><SelectValue placeholder="Selecionar obra…" /></SelectTrigger>
                      <SelectContent>
                        {obras?.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={handleLinkObra} disabled={!linkObraId || updateSession.isPending}>
                      Associar obra
                    </Button>
                  </div>
                </div>
              )}

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

          <Card className="rounded-xl border-primary/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" /> Próximos passos
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Os panos extraídos pela Axia são materializados na obra para visualização técnica e composição
                HOMEBLOCK. {icfSelectedWalls.length} pano(s) ICF selecionados ({icfWallLength.toFixed(1)} m totais).
              </p>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => handleMaterializePanels('mapa')}
                disabled={materializing || icfSelectedWalls.length === 0 || (!sessionObraId && !linkObraId)}
              >
                {materializing
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <Layers className="h-4 w-4 mr-2" />}
                Abrir Mapa Visual de Panos
              </Button>
              <Button
                variant="outline"
                onClick={() => handleMaterializePanels('manual')}
                disabled={materializing || icfSelectedWalls.length === 0 || (!sessionObraId && !linkObraId)}
              >
                <Box className="h-4 w-4 mr-2" />
                Abrir Manual ICF
              </Button>
            </CardContent>
          </Card>
        </div>
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
