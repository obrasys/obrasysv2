import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Inbox, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { IcfPlantAnalyzer } from '@/components/icf/IcfPlantAnalyzer';
import { useObras } from '@/hooks/useObras';
import { useIcfConfiguracoes, useIcfResumo, useDeleteIcfConfig, useCreateIcfConfig, useUpdateIcfConfig } from '@/hooks/useIcfData';
import { IcfAxiaAnalysisPanel } from '@/components/icf/IcfAxiaAnalysisPanel';
import { useGenerateIcfBudget } from '@/hooks/useIcfBudget';
import { IcfBudgetConfigDialog, type IcfBudgetFinancials } from '@/components/icf/IcfBudgetConfigDialog';
import { IcfConfigHeader } from '@/components/icf/IcfConfigHeader';
import { IcfKpiGrid } from '@/components/icf/IcfKpiGrid';
import { IcfQuickNav } from '@/components/icf/IcfQuickNav';
import { IcfConfigsList } from '@/components/icf/IcfConfigsList';

const ICF_LAST_OBRA_KEY = 'icf_last_obra_id';

const IcfIndex = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { obras } = useObras();

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

  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);

  const handleChangeStatus = (configId: string, newStatus: 'validado' | 'congelado') => {
    updateConfig.mutate({ id: configId, status: newStatus } as any);
  };

  const handleOpenBudgetDialog = () => {
    if (!activeConfig || !resumo || !selectedObraId) return;
    setBudgetDialogOpen(true);
  };

  const handleConfirmGenerateBudget = (values: IcfBudgetFinancials) => {
    if (!activeConfig || !resumo || !selectedObraId) return;
    generateBudget.mutate(
      { resumo, config: activeConfig, obraId: selectedObraId, ...values },
      {
        onSuccess: (orc) => {
          setBudgetDialogOpen(false);
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
          </>
        )}

        {selectedObraId && !configsLoading && !configsError && configs && configs.length > 0 && (
          <IcfConfigsList configs={configs} onDelete={handleDeleteConfig} />
        )}
      </div>

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
