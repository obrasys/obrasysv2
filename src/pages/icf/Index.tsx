import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, Layers, Box, BarChart3, Trash2, CheckCircle, Lock, FileText, Loader2 } from 'lucide-react';
import { IcfPlantAnalyzer } from '@/components/icf/IcfPlantAnalyzer';
import { useObras } from '@/hooks/useObras';
import { useIcfConfiguracoes, useIcfResumo, useDeleteIcfConfig, useCreateIcfConfig, useUpdateIcfConfig } from '@/hooks/useIcfData';
import { IcfAxiaAnalysisPanel } from '@/components/icf/IcfAxiaAnalysisPanel';
import { useGenerateIcfBudget } from '@/hooks/useIcfBudget';
import { IcfBudgetConfigDialog, type IcfBudgetFinancials } from '@/components/icf/IcfBudgetConfigDialog';

const ICF_LAST_OBRA_KEY = 'icf_last_obra_id';

const IcfIndex = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { obras } = useObras();

  // Restore last obra: query param > localStorage
  const [selectedObraId, setSelectedObraId] = useState<string>(() => {
    return searchParams.get('obra') || localStorage.getItem(ICF_LAST_OBRA_KEY) || '';
  });

  // Persist selection
  useEffect(() => {
    if (selectedObraId) {
      localStorage.setItem(ICF_LAST_OBRA_KEY, selectedObraId);
    }
  }, [selectedObraId]);
  const { data: configs, isLoading } = useIcfConfiguracoes(selectedObraId);
  const activeConfig = configs?.find(c => c.ativo);
  const { data: resumo } = useIcfResumo(activeConfig?.id);
  const createConfig = useCreateIcfConfig();
  const deleteConfig = useDeleteIcfConfig();
  const updateConfig = useUpdateIcfConfig();
  const generateBudget = useGenerateIcfBudget();

  const handleChangeStatus = (configId: string, newStatus: 'validado' | 'congelado') => {
    updateConfig.mutate({ id: configId, status: newStatus } as any);
  };

  const handleGenerateBudget = () => {
    if (!activeConfig || !resumo || !selectedObraId) return;
    generateBudget.mutate(
      { resumo, config: activeConfig, obraId: selectedObraId },
      {
        onSuccess: (orc) => {
          navigate(`/orcamentos/${orc.id}`);
        },
      },
    );
  };

  const statusColor = (s: string) => {
    if (s === 'congelado') return 'secondary';
    if (s === 'validado') return 'default';
    return 'outline';
  };

  const handleCreateConfig = () => {
    if (!selectedObraId) return;
    createConfig.mutate({
      obra_id: selectedObraId,
      nome: 'Configuração ICF v1',
    } as any);
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
            Selecione uma obra para iniciar o módulo ICF.
          </CardContent></Card>
        )}

        {selectedObraId && activeConfig && (
          <>
            {/* Config header */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-lg">{activeConfig.nome}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Versão {activeConfig.versao} · {activeConfig.classe_betao} · {activeConfig.classe_aco} · Núcleo {activeConfig.espessura_nucleo * 100} cm
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusColor(activeConfig.status)}>{activeConfig.status}</Badge>
                  {activeConfig.status === 'rascunho' && (
                    <Button variant="default" size="sm" onClick={() => handleChangeStatus(activeConfig.id, 'validado')}>
                      <CheckCircle className="h-4 w-4 mr-1" />Validar
                    </Button>
                  )}
                  {activeConfig.status === 'validado' && (
                    <Button variant="secondary" size="sm" onClick={() => handleChangeStatus(activeConfig.id, 'congelado')}>
                      <Lock className="h-4 w-4 mr-1" />Congelar
                    </Button>
                  )}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleGenerateBudget}
                    disabled={generateBudget.isPending || !resumo}
                  >
                    {generateBudget.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 mr-1" />
                    )}
                    Gerar Orçamento
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/icf/configuracao/${activeConfig.id}`)}>
                    <Settings className="h-4 w-4 mr-1" />Editar
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* KPI cards */}
            {resumo && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Volume Betão Total</p>
                  <p className="text-2xl font-bold">{resumo.volume_total_obra?.toFixed(2)} m³</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Área Líquida Paredes</p>
                  <p className="text-2xl font-bold">{resumo.area_liquida_total?.toFixed(2)} m²</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Índice m³/m²</p>
                  <p className="text-2xl font-bold">{resumo.indice_m3_m2?.toFixed(4)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Índice kg/m²</p>
                  <p className="text-2xl font-bold">{resumo.indice_kg_m2?.toFixed(2)}</p>
                </CardContent></Card>
              </div>
            )}

            {/* Axia Analysis Panel */}
            <IcfAxiaAnalysisPanel configId={activeConfig.id} />

            {/* Axia Plant Analyzer */}
            <IcfPlantAnalyzer
              obraId={selectedObraId}
              configuracaoId={activeConfig.id}
              espessuraNucleo={activeConfig.espessura_nucleo}
              classeBetao={activeConfig.classe_betao}
              classeAco={activeConfig.classe_aco}
            />

            {/* Quick navigation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Layers, label: 'Panos de Parede', href: `/icf/panos/${activeConfig.id}` },
                { icon: Box, label: 'Fundações', href: `/icf/fundacoes/${activeConfig.id}` },
                { icon: Layers, label: 'Lajes', href: `/icf/lajes/${activeConfig.id}` },
                { icon: BarChart3, label: 'Resumo Global', href: `/icf/resumo/${activeConfig.id}` },
              ].map(item => (
                <Card key={item.label} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(item.href)}>
                  <CardContent className="pt-6 flex items-center gap-3">
                    <item.icon className="h-8 w-8 text-primary" />
                    <span className="font-medium">{item.label}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Configs list */}
        {selectedObraId && configs && configs.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Configurações</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {configs.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">{c.nome} <Badge variant={statusColor(c.status)} className="ml-2">{c.status}</Badge></p>
                    <p className="text-xs text-muted-foreground">v{c.versao} · {c.classe_betao}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/icf/configuracao/${c.id}`)}>
                      <Settings className="h-3 w-3" />
                    </Button>
                    {c.status === 'rascunho' && (
                      <Button variant="ghost" size="sm" onClick={() => deleteConfig.mutate(c.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default IcfIndex;
