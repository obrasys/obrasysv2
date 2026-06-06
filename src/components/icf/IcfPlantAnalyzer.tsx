import { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, FileImage, Sparkles, Check, Layers, Box, LayoutGrid, AlertTriangle, Send } from 'lucide-react';
import { usePlanImports } from '@/hooks/usePlanImports';
import { useIcfPlantAnalysis, diagnoseMissingData, type IcfPlantAnalysisResult } from '@/hooks/useIcfPlantAnalysis';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { IcfPlantMissingDataDialog, type MissingDataValues } from './IcfPlantMissingDataDialog';
import { DxfUnitConfirmDialog, type DxfUnitOverride } from './DxfUnitConfirmDialog';
import { IcfUnifiedQuantitiesPanel } from './IcfUnifiedQuantitiesPanel';
import { IcfPlanToBudgetDialog } from './IcfPlanToBudgetDialog';
import { PlanAnalysisAuditTrail } from './PlanAnalysisAuditTrail';
import { DEFAULT_ICF_UNIFIED_PARAMS, type IcfUnifiedParams, buildIcfUnifiedQuantities } from '@/lib/icf-unified-quantities';
import { evaluateConfidenceGate } from '@/lib/icf-confidence-rules';


interface IcfPlantAnalyzerProps {
  obraId?: string | null;
  configuracaoId: string;
  espessuraNucleo: number;
  classeBetao: string;
  classeAco: string;
}

export function IcfPlantAnalyzer({
  obraId,
  configuracaoId,
  espessuraNucleo,
  classeBetao,
  classeAco,
}: IcfPlantAnalyzerProps) {
  const { user, organization } = useAuth();
  const { toast } = useToast();
  const { plans, isLoading: plansLoading } = usePlanImports(obraId || '');
  const {
    analyze,
    isAnalyzing,
    analysisResult,
    setAnalysisResult,
    createRecords,
    isCreating,
  } = useIcfPlantAnalysis();

  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lote 2.3 — modal "Dados em falta"
  const diagnosis = useMemo(() => diagnoseMissingData(analysisResult), [analysisResult]);
  const [missingOpen, setMissingOpen] = useState(false);
  const [missingDismissed, setMissingDismissed] = useState(false);

  // Fase 6 — parâmetros pré-fecho dos quantitativos unificados
  const [unifiedParams, setUnifiedParams] = useState<IcfUnifiedParams>({
    ...DEFAULT_ICF_UNIFIED_PARAMS,
    espessuraNucleoPadrao: espessuraNucleo || DEFAULT_ICF_UNIFIED_PARAMS.espessuraNucleoPadrao,
  });

  // Fase 8 — diálogo "Enviar para orçamento"
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);

  // Fase 5 — confirmação de unidade DXF
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [unitDialogDismissed, setUnitDialogDismissed] = useState(false);
  const [lastFilePath, setLastFilePath] = useState<string | null>(null);
  const result = analysisResult as (IcfPlantAnalysisResult & {
    __requires_unit_confirmation?: boolean;
    __detected_unit?: string | null;
    __sanity_warnings?: Array<{ code: string; message: string; severity: string }>;
    __audit?: any;
  }) | null;
  const needsUnitConfirm = !!result?.__requires_unit_confirmation;

  useEffect(() => {
    if (result && needsUnitConfirm && !unitDialogDismissed) {
      setUnitDialogOpen(true);
    } else if (result && diagnosis.needsReview && !missingDismissed && !needsUnitConfirm) {
      setMissingOpen(true);
    }
  }, [result, diagnosis.needsReview, missingDismissed, needsUnitConfirm, unitDialogDismissed]);

  const empresaId = organization?.id || '';
  const hasObra = !!obraId;

  const runAnalyze = (filePath: string, unitOverride?: DxfUnitOverride) => {
    setLastFilePath(filePath);
    setMissingDismissed(false);
    if (!unitOverride) setUnitDialogDismissed(false);
    analyze({
      filePath,
      obraId: obraId || null,
      configuracaoId,
      espessuraNucleo,
      classeBetao,
      classeAco,
      unitOverride: unitOverride ?? null,
    });
  };

  const handleSelectExisting = () => {
    const plan = plans.find(p => p.id === selectedPlanId);
    if (!plan) return;
    runAnalyze(plan.file_path);
  };

  const handleUnitConfirm = (unit: DxfUnitOverride) => {
    if (!lastFilePath) return;
    setUnitDialogOpen(false);
    setUnitDialogDismissed(true);
    runAnalyze(lastFilePath, unit);
  };

  const handleUnitCancel = () => {
    setUnitDialogOpen(false);
    setUnitDialogDismissed(true);
    setAnalysisResult(null);
  };


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'pdf';
      const folder = obraId || 'standalone';
      const filePath = `${user.id}/${folder}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('plan-files').upload(filePath, file);
      if (uploadErr) throw uploadErr;

      runAnalyze(filePath);
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateAll = () => {
    if (!analysisResult) return;
    createRecords({
      result: analysisResult,
      obraId: obraId ?? null,
      configuracaoId,
      espessuraNucleo,
    });
  };

  // Lote 2.3 — aplicar valores fornecidos no modal "Dados em falta" sem inventar:
  // preenche apenas paredes sem altura/espessura e marca-as como requires_review.
  const handleMissingConfirm = (values: MissingDataValues) => {
    if (!analysisResult) return;
    const updatedParedes = analysisResult.paredes.map((p) => {
      const novaAltura = !p.altura_util || p.altura_util < 1.5 ? values.alturaPadrao : p.altura_util;
      const novaEspessura = !p.espessura_nucleo || p.espessura_nucleo < 0.05
        ? values.espessuraPadrao
        : p.espessura_nucleo;
      const baixaConf = typeof p.confianca === 'number' && p.confianca < 0.6;
      const notasExtra = [p.notas_validacao, values.notas, '[revisao_humana_pendente]']
        .filter(Boolean)
        .join(' | ');
      return {
        ...p,
        altura_util: novaAltura,
        espessura_nucleo: novaEspessura,
        notas_validacao: notasExtra,
        confianca: typeof p.confianca === 'number' ? Math.min(p.confianca, 0.6) : 0.5,
        metodo_medicao: p.metodo_medicao ?? 'estimativa_visual',
      };
    });
    setAnalysisResult({ ...analysisResult, paredes: updatedParedes });
    setMissingOpen(false);
    setMissingDismissed(true);
    toast({
      title: 'Valores aplicados com revisão obrigatória',
      description: 'As paredes ficam marcadas como “requer revisão” antes de irem para orçamento.',
    });
  };

  const handleMissingDiscard = () => {
    setAnalysisResult(null);
    setMissingOpen(false);
    setMissingDismissed(false);
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Axia™ - Análise de Planta ICF
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Carregue uma planta de estrutura ou arquitetura e a Axia extrai automaticamente paredes, fundações e lajes.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!analysisResult && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex gap-2">
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId} disabled={plansLoading || isAnalyzing}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecionar planta existente..." />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <FileImage className="h-3 w-3" />
                        {p.nome_ficheiro} (Rev.{p.revision_number})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleSelectExisting}
                disabled={!selectedPlanId || isAnalyzing || !empresaId}
                size="sm"
              >
                {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground self-center">ou</div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.dxf"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isAnalyzing || !empresaId}
              >
                {isUploading || isAnalyzing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Carregar nova planta
              </Button>
            </div>
          </div>
        )}

        {isAnalyzing && (
          <div className="flex items-center gap-3 py-6 justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>A Axia está a analisar a planta... Isto pode demorar até 30 segundos.</span>
          </div>
        )}

        {analysisResult && !isCreating && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ResultCard
                icon={<Layers className="h-5 w-5 text-primary" />}
                label="Paredes"
                count={analysisResult.paredes.length}
                details={analysisResult.paredes.map(p => `${p.referencia}: ${p.comprimento}m × ${p.altura_util}m`)}
              />
              <ResultCard
                icon={<Box className="h-5 w-5 text-primary" />}
                label="Fundações"
                count={analysisResult.fundacoes.length}
                details={analysisResult.fundacoes.map(f => `${f.referencia || f.tipo_fundacao}: ${f.comprimento}×${f.largura}×${f.altura}m`)}
              />
              <ResultCard
                icon={<LayoutGrid className="h-5 w-5 text-primary" />}
                label="Lajes"
                count={analysisResult.lajes.length}
                details={analysisResult.lajes.map(l => `${l.referencia || 'Laje'}: ${l.area}m² (${l.espessura_total}m)`)}
              />
            </div>

            {analysisResult.paredes.some(p => p.vaos && p.vaos.length > 0) && (
              <div className="text-sm text-muted-foreground">
                Vãos detectados: {analysisResult.paredes.reduce((sum, p) => sum + (p.vaos?.length || 0), 0)} tipos
              </div>
            )}

            {analysisResult.notas && (
              <p className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3">
                {analysisResult.notas}
              </p>
            )}

            {diagnosis.needsReview && (
              <div className="rounded-md border border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm space-y-1.5">
                <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4" />
                  Revisão humana obrigatória
                </div>
                <ul className="text-xs text-amber-700/90 dark:text-amber-200/80 list-disc pl-5 space-y-0.5">
                  {diagnosis.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
                <Button size="sm" variant="outline" className="mt-1" onClick={() => setMissingOpen(true)}>
                  Preencher dados em falta
                </Button>
              </div>
            )}

            {!hasObra && (
              <p className="text-xs text-muted-foreground border border-dashed rounded-md p-2">
                Modo orçamento (sem obra): os quantitativos serão carregados na configuração ICF para gerar o orçamento. O mapa visual de panos só é criado quando existe obra associada.
              </p>
            )}
            <IcfUnifiedQuantitiesPanel
              result={analysisResult}
              onResultChange={setAnalysisResult}
              params={unifiedParams}
              onParamsChange={setUnifiedParams}
              obraId={obraId ?? null}
            />

            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleCreateAll} disabled={isCreating} className="flex-1">
                <Check className="h-4 w-4 mr-2" />
                Carregar para a configuração ICF
              </Button>
              <Button
                variant="secondary"
                onClick={() => setBudgetDialogOpen(true)}
                disabled={isCreating}
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar para orçamento
              </Button>
              <Button variant="outline" onClick={() => { setAnalysisResult(null); setMissingDismissed(false); }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {analysisResult && (
          <IcfPlanToBudgetDialog
            open={budgetDialogOpen}
            onOpenChange={setBudgetDialogOpen}
            result={analysisResult}
            quantities={buildIcfUnifiedQuantities(analysisResult, unifiedParams)}
            params={unifiedParams}
            obraId={obraId ?? null}
          />
        )}

        <IcfPlantMissingDataDialog
          open={missingOpen}
          onOpenChange={(v) => { setMissingOpen(v); if (!v) setMissingDismissed(true); }}
          defaultAltura={2.7}
          defaultEspessura={espessuraNucleo || 0.15}
          onConfirm={handleMissingConfirm}
          onDiscard={handleMissingDiscard}
          reasons={diagnosis.reasons}
        />

        <DxfUnitConfirmDialog
          open={unitDialogOpen}
          onOpenChange={(v) => { setUnitDialogOpen(v); if (!v) setUnitDialogDismissed(true); }}
          detectedUnit={result?.__detected_unit ?? null}
          bbox={result?.__audit?.bbox_m ?? null}
          warnings={result?.__sanity_warnings ?? []}
          onConfirm={handleUnitConfirm}
          onCancel={handleUnitCancel}
          isReanalyzing={isAnalyzing}
        />

        {isCreating && (
          <div className="flex items-center gap-3 py-6 justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>A criar registos de paredes, fundações e lajes...</span>
          </div>
        )}

        {!empresaId && (
          <p className="text-sm text-destructive">
            Não foi possível identificar a organização ativa para guardar os registos ICF.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ResultCard({
  icon,
  label,
  count,
  details,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  details: string[];
}) {
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{label}</span>
        </div>
        <Badge variant="secondary">{count}</Badge>
      </div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {details.map((d, i) => (
          <p key={i} className="text-xs text-muted-foreground">{d}</p>
        ))}
        {details.length === 0 && <p className="text-xs text-muted-foreground italic">Nenhum encontrado</p>}
      </div>
    </div>
  );
}
