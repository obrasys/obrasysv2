import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Inbox, AlertTriangle, RefreshCw, Lock, Sparkles, FolderTree, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { IcfPlantAnalyzer } from '@/components/icf/IcfPlantAnalyzer';
import { useObras } from '@/hooks/useObras';
import { useIcfConfiguracoes, useIcfResumo, useDeleteIcfConfig, useCreateIcfConfig, useUpdateIcfConfig, useIcfPanos } from '@/hooks/useIcfData';
import { IcfPanelsIsometric } from '@/components/icf/IcfPanelsIsometric';
import { IcfAxiaAnalysisPanel } from '@/components/icf/IcfAxiaAnalysisPanel';
import { useGenerateIcfBudget } from '@/hooks/useIcfBudget';
import { IcfBudgetConfigDialog, type IcfBudgetFinancials } from '@/components/icf/IcfBudgetConfigDialog';
import { IcfConfigHeader } from '@/components/icf/IcfConfigHeader';
import { IcfKpiGrid } from '@/components/icf/IcfKpiGrid';
import { IcfQuickNav } from '@/components/icf/IcfQuickNav';
import { IcfConfigsList } from '@/components/icf/IcfConfigsList';
import { IcfConstantsDialog } from '@/components/icf/IcfConstantsDialog';
import { IcfScopeDialog, type IcfScopeSelection } from '@/components/icf/IcfScopeDialog';
import { ICFAnalysisModeSelector } from '@/components/icf/ICFAnalysisModeSelector';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { useIcfAnalyses } from '@/hooks/useIcfDossier';
import { Badge } from '@/components/ui/badge';

const ICF_LAST_OBRA_KEY = 'icf_last_obra_id';

const IcfIndex = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { obras } = useObras();
  const { hasFeature, tier } = useFeatureGate();
  const icfEnabled = hasFeature('calculosIcfLsfAutomatico');

  const [selectedObraId, setSelectedObraId] = useState<string>(() => {
    return searchParams.get('obra') || localStorage.getItem(ICF_LAST_OBRA_KEY) || '';
  });

  useEffect(() => {
    if (selectedObraId) localStorage.setItem(ICF_LAST_OBRA_KEY, selectedObraId);
  }, [selectedObraId]);

  const { data: configs, isLoading: configsLoading, error: configsError, refetch: refetchConfigs, isFetching: configsFetching } = useIcfConfiguracoes(selectedObraId);
  const activeConfig = configs?.find(c => c.ativo);
  const { data: resumo, isLoading: resumoLoading, error: resumoError, refetch: refetchResumo, isFetching: resumoFetching } = useIcfResumo(activeConfig?.id);
  const createConfig = useCreateIcfConfig();
  const deleteConfig = useDeleteIcfConfig();
  const updateConfig = useUpdateIcfConfig();
  const generateBudget = useGenerateIcfBudget();
  const { data: dossiers = [] } = useIcfAnalyses(selectedObraId || null);
  const { data: configPanos = [] } = useIcfPanos(activeConfig?.id);

  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [pendingScope, setPendingScope] = useState<IcfScopeSelection | null>(null);
  const [modeSelectorOpen, setModeSelectorOpen] = useState(false);

  const handleOpenBudgetDialog = () => {
    if (!activeConfig || !resumo || !selectedObraId) return;
    // Primeiro pergunta o âmbito (estrutura, +arquitetura, completo)
    setPendingScope(null);
    setScopeDialogOpen(true);
  };

  const handleScopeConfirmed = (selection: IcfScopeSelection) => {
    setPendingScope(selection);
    setScopeDialogOpen(false);
    // Em seguida abre o diálogo financeiro habitual
    setBudgetDialogOpen(true);
  };

  const handleConfirmGenerateBudget = (values: IcfBudgetFinancials) => {
    if (!activeConfig || !resumo || !selectedObraId) return;
    generateBudget.mutate(
      {
        resumo,
        config: activeConfig,
        obraId: selectedObraId,
        ...values,
        scope: pendingScope?.scope,
      },
      {
        onSuccess: (orc) => {
          setBudgetDialogOpen(false);
          setPendingScope(null);
          navigate(`/orcamentos/${orc.id}`);
        },
      },
    );
  };

  const handleCreateConfig = () => {
    if (!selectedObraId) return;
    createConfig.mutate(
      { obra_id: selectedObraId, nome: 'Configuração ICF v1' } as any,
      { onError: (e: any) => toast.error('Não foi possível criar a configuração', { description: e?.message }) },
    );
  };

  const handleDeleteConfig = (id: string) => {
    deleteConfig.mutate(id, {
      onError: (e: any) => toast.error('Não foi possível eliminar', { description: e?.message }),
    });
  };

  const handleChangeStatusSafe = (configId: string, newStatus: 'validado' | 'congelado') => {
    updateConfig.mutate(
      { id: configId, status: newStatus } as any,
      { onError: (e: any) => toast.error('Não foi possível atualizar o estado', { description: e?.message }) },
    );
  };

  return (
    <AppLayout title="Sistema Construtivo ICF" subtitle="Motor paramétrico para obras ICF">
      <div className="p-4 md:p-6 space-y-6">
        {!icfEnabled ? (
          <Card className="border-primary/30">
            <CardContent className="py-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Cálculos ICF e LSF automáticos</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  O motor paramétrico ICF/LSF está incluído no plano Professional.
                </p>
                <div className="flex items-center justify-center gap-2 pt-1 text-xs">
                  <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground">
                    Plano atual: <strong className="capitalize">{tier}</strong>
                  </span>
                  <span className="px-2 py-1 rounded-md bg-primary/10 text-primary">
                    Disponível em: <strong>Professional</strong>
                  </span>
                </div>
              </div>
              <Button onClick={() => navigate('/planos')} className="gap-2">
                <Sparkles className="w-4 h-4" />
                Fazer upgrade para Professional
              </Button>
            </CardContent>
          </Card>
        ) : (
        <>
        {/* Obra selector */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Select value={selectedObraId} onValueChange={setSelectedObraId}>
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue placeholder="Selecionar obra..." />
            </SelectTrigger>
            <SelectContent>
              {obras?.map(o => (
                <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedObraId && !activeConfig && (
            <Button onClick={handleCreateConfig} disabled={createConfig.isPending}>
              <Plus className="h-4 w-4 mr-2" />Nova Configuração ICF
            </Button>
          )}
          <div className="sm:ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={() => setModeSelectorOpen(true)} className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Nova Análise ICF</span>
            </Button>
            <IcfConstantsDialog />
          </div>
        </div>

        {!selectedObraId && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-50" />
            Selecione uma obra para iniciar o módulo ICF.
          </CardContent></Card>
        )}

        {selectedObraId && configsLoading && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
            A carregar configurações ICF…
          </CardContent></Card>
        )}

        {selectedObraId && configsError && (
          <Card className="border-destructive/40">
            <CardContent className="py-8 text-center space-y-3">
              <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
              <p className="text-sm text-muted-foreground">
                Não foi possível carregar as configurações ICF.
                <br />
                <span className="text-xs opacity-70">{(configsError as any)?.message}</span>
              </p>
              <Button variant="outline" size="sm" onClick={() => refetchConfigs()} disabled={configsFetching}>
                <RefreshCw className={`h-4 w-4 mr-2 ${configsFetching ? 'animate-spin' : ''}`} />
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {selectedObraId && !configsLoading && !configsError && !activeConfig && (
          <Card><CardContent className="py-12 text-center text-muted-foreground space-y-3">
            <Inbox className="h-10 w-10 mx-auto opacity-50" />
            <p>Ainda não existe nenhuma configuração ICF ativa para esta obra.</p>
            <Button onClick={handleCreateConfig} disabled={createConfig.isPending}>
              <Plus className="h-4 w-4 mr-2" />Criar primeira configuração
            </Button>
          </CardContent></Card>
        )}

        {selectedObraId && activeConfig && (
          <>
            <IcfConfigHeader
              config={activeConfig}
              hasResumo={!!resumo}
              isGenerating={generateBudget.isPending}
              onChangeStatus={handleChangeStatusSafe}
              onOpenBudget={handleOpenBudgetDialog}
              onEdit={() => navigate(`/icf/configuracao/${activeConfig.id}`)}
            />

            {resumoLoading ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">
                <Loader2 className="h-5 w-5 mx-auto mb-2 animate-spin" />
                A calcular resumo paramétrico…
              </CardContent></Card>
            ) : resumoError ? (
              <Card className="border-destructive/40">
                <CardContent className="py-8 text-center space-y-3">
                  <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
                  <p className="text-sm text-muted-foreground">
                    Não foi possível calcular o resumo paramétrico.
                    <br />
                    <span className="text-xs opacity-70">{(resumoError as any)?.message}</span>
                  </p>
                  <Button variant="outline" size="sm" onClick={() => refetchResumo()} disabled={resumoFetching}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${resumoFetching ? 'animate-spin' : ''}`} />
                    Tentar novamente
                  </Button>
                </CardContent>
              </Card>
            ) : resumo ? (
              <IcfKpiGrid resumo={resumo} />
            ) : (
              <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
                Sem resumo disponível. Adicione panos, fundações ou lajes para calcular quantitativos.
              </CardContent></Card>
            )}

            <IcfAxiaAnalysisPanel configId={activeConfig.id} />

            <IcfPlantAnalyzer
              obraId={selectedObraId}
              configuracaoId={activeConfig.id}
              espessuraNucleo={activeConfig.espessura_nucleo}
              classeBetao={activeConfig.classe_betao}
              classeAco={activeConfig.classe_aco}
            />

            <IcfQuickNav configId={activeConfig.id} />

            <IcfPanelsIsometric
              title="Vista Isométrica dos Panos"
              panels={configPanos.map(p => ({
                id: p.id,
                label: p.referencia,
                length_m: Number(p.comprimento) || 0,
                height_m: Number(p.altura_util) || 0,
                floor: p.piso_inicial ?? '0',
              }))}
              emptyHint="Adicione panos de parede a esta configuração para ver o modelo isométrico esquemático."
            />
          </>
        )}

        {selectedObraId && (
          <Card className="rounded-xl border-primary/20">
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <FolderTree className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-sm">Dossiês ICF Completos</h3>
                  <Badge variant="outline" className="text-[10px]">{dossiers.length}</Badge>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate(`/icf/dossier/novo?obra=${selectedObraId}`)}>
                  <Plus className="h-4 w-4 mr-1" /> Novo Dossiê
                </Button>
              </div>
              {dossiers.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Crie um Dossiê para carregar plantas, cortes, alçados e gerar o modelo isométrico, composição HOMEBLOCK e orçamento.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {dossiers.slice(0, 6).map(d => (
                    <button
                      key={d.id}
                      onClick={() => navigate(`/icf/dossier/${d.id}`)}
                      className="text-left rounded-lg border p-3 hover:border-primary/50 hover:bg-primary/5 transition-colors flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{d.titulo}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {d.sistema_icf ?? 'ICF'} · {d.status}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {selectedObraId && !configsLoading && !configsError && configs && configs.length > 0 && (
          <IcfConfigsList configs={configs} onDelete={handleDeleteConfig} />
        )}
        </>
        )}
      </div>

      <IcfScopeDialog
        open={scopeDialogOpen}
        onOpenChange={setScopeDialogOpen}
        onConfirm={handleScopeConfirmed}
      />

      <ICFAnalysisModeSelector
        open={modeSelectorOpen}
        onOpenChange={setModeSelectorOpen}
        obraId={selectedObraId || null}
      />

      <IcfBudgetConfigDialog
        open={budgetDialogOpen}
        onOpenChange={setBudgetDialogOpen}
        onConfirm={handleConfirmGenerateBudget}
        isPending={generateBudget.isPending}
      />
    </AppLayout>
  );
};

export default IcfIndex;
