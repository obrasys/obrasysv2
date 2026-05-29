import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Inbox, AlertTriangle, RefreshCw, Lock, Sparkles, FileText, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useObras } from '@/hooks/useObras';
import {
  useIcfConfiguracoes,
  useIcfResumo,
  useDeleteIcfConfig,
  useCreateIcfConfig,
  useUpdateIcfConfig,
} from '@/hooks/useIcfData';
import { useGenerateIcfBudget } from '@/hooks/useIcfBudget';
import { IcfBudgetConfigDialog, type IcfBudgetFinancials } from '@/components/icf/IcfBudgetConfigDialog';
import { IcfConfigHeader } from '@/components/icf/IcfConfigHeader';
import { IcfKpiGrid } from '@/components/icf/IcfKpiGrid';
import { IcfQuickNav } from '@/components/icf/IcfQuickNav';
import { IcfConfigsList } from '@/components/icf/IcfConfigsList';
import { IcfPlantAnalyzer } from '@/components/icf/IcfPlantAnalyzer';
import { IcfConstantsDialog } from '@/components/icf/IcfConstantsDialog';
import { IcfScopeDialog, type IcfScopeSelection } from '@/components/icf/IcfScopeDialog';
import { useFeatureGate } from '@/hooks/useFeatureGate';

const ICF_LAST_OBRA_KEY = 'icf_last_obra_id';
const OBRA_NENHUMA = '__sem_obra__';

const IcfIndex = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { obras } = useObras();
  const { hasFeature, tier } = useFeatureGate();
  const icfEnabled = hasFeature('calculosIcfLsfAutomatico');

  // Default: modo orçamento puro (sem obra). Pode opcionalmente associar a uma obra.
  const [selectedObraId, setSelectedObraId] = useState<string>(() => {
    return searchParams.get('obra') || localStorage.getItem(ICF_LAST_OBRA_KEY) || OBRA_NENHUMA;
  });

  useEffect(() => {
    if (selectedObraId) localStorage.setItem(ICF_LAST_OBRA_KEY, selectedObraId);
  }, [selectedObraId]);

  const obraFilter = selectedObraId === OBRA_NENHUMA ? null : selectedObraId;

  const {
    data: configs,
    isLoading: configsLoading,
    error: configsError,
    refetch: refetchConfigs,
    isFetching: configsFetching,
  } = useIcfConfiguracoes(obraFilter);
  const activeConfig = configs?.find((c) => c.ativo);
  const {
    data: resumo,
    isLoading: resumoLoading,
    error: resumoError,
    refetch: refetchResumo,
    isFetching: resumoFetching,
  } = useIcfResumo(activeConfig?.id);
  const createConfig = useCreateIcfConfig();
  const deleteConfig = useDeleteIcfConfig();
  const updateConfig = useUpdateIcfConfig();
  const generateBudget = useGenerateIcfBudget();

  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [pendingScope, setPendingScope] = useState<IcfScopeSelection | null>(null);

  const handleOpenBudgetDialog = () => {
    if (!activeConfig || !resumo) return;
    setPendingScope(null);
    setScopeDialogOpen(true);
  };

  const handleScopeConfirmed = (selection: IcfScopeSelection) => {
    setPendingScope(selection);
    setScopeDialogOpen(false);
    setBudgetDialogOpen(true);
  };

  const handleConfirmGenerateBudget = (values: IcfBudgetFinancials) => {
    if (!activeConfig || !resumo) return;
    generateBudget.mutate(
      {
        resumo,
        config: activeConfig,
        obraId: obraFilter,
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
    createConfig.mutate(
      { obra_id: obraFilter ?? null, nome: 'Configuração ICF v1' } as any,
      { onError: (e: any) => toast.error('Não foi possível criar a configuração', { description: e?.message }) },
    );
  };

  const handleOpenAssistant = () => {
    const qs = obraFilter ? `?obra=${obraFilter}` : '';
    navigate(`/icf/assistente${qs}`);
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
    <AppLayout
      title="Sistema Construtivo ICF"
      subtitle="Motor paramétrico para orçamentação ICF (sem necessidade de obra associada)"
    >
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
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
            {/* Selector — obra é opcional */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <Select value={selectedObraId} onValueChange={setSelectedObraId}>
                <SelectTrigger className="w-full sm:w-80">
                  <SelectValue placeholder="Modo de orçamentação..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={OBRA_NENHUMA}>
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Orçamento ICF (sem obra)
                    </span>
                  </SelectItem>
                  {obras?.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      Obra: {o.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {!activeConfig && (
                <Button onClick={handleCreateConfig} disabled={createConfig.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Configuração ICF
                </Button>
              )}

              <Button variant="outline" onClick={handleOpenAssistant}>
                <Upload className="h-4 w-4 mr-2" />
                Carregar planta
              </Button>

              <div className="sm:ml-auto flex items-center gap-2">
                <IcfConstantsDialog />
              </div>
            </div>

            {configsLoading && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
                  A carregar configurações ICF…
                </CardContent>
              </Card>
            )}

            {configsError && (
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

            {!configsLoading && !configsError && !activeConfig && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground space-y-3">
                  <Inbox className="h-10 w-10 mx-auto opacity-50" />
                  <p>
                    {obraFilter
                      ? 'Ainda não existe nenhuma configuração ICF ativa para esta obra.'
                      : 'Ainda não tem configurações ICF de orçamentação.'}
                  </p>
                  <Button onClick={handleCreateConfig} disabled={createConfig.isPending}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar primeira configuração
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeConfig && (
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
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 mx-auto mb-2 animate-spin" />
                      A calcular resumo paramétrico…
                    </CardContent>
                  </Card>
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
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground text-sm">
                      Sem resumo disponível. Adicione panos, fundações ou lajes para calcular quantitativos.
                    </CardContent>
                  </Card>
                )}

                <IcfQuickNav configId={activeConfig.id} />

                <IcfPlantAnalyzer
                  obraId={obraFilter ?? activeConfig.obra_id ?? ''}
                  configuracaoId={activeConfig.id}
                  espessuraNucleo={(activeConfig as any).espessura_nucleo ?? 0.15}
                  classeBetao={(activeConfig as any).classe_betao ?? 'C25/30'}
                  classeAco={(activeConfig as any).classe_aco ?? 'A500'}
                />

              </>
            )}

            {!configsLoading && !configsError && configs && configs.length > 0 && (
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
