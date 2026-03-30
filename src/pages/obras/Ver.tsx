import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  ArrowLeft, Edit, MapPin, Calendar, Building2, FileText, Plus, Loader2,
  ClipboardList, Cloud, Users, ExternalLink, Sparkles, AlertCircle, Lightbulb,
  CheckCircle, Upload, BookOpen, Flag, Wallet, TrendingUp, TrendingDown,
  CircleDollarSign, GitBranch, Activity, Target, DollarSign, BarChart3,
  HardHat, Clock, Percent,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ObraStatusBadge } from '@/components/obras/ObraStatusBadge';
import { ObraProgressTracker } from '@/components/obras/ObraProgressTracker';
import { FinalizarObraModal } from '@/components/obras/FinalizarObraModal';
import { RDOStatusBadge } from '@/components/rdos';
import { CadernoStatusBadge } from '@/components/cadernos';
import { ObraEquipaTab } from '@/components/obras/ObraEquipaTab';
import { ObraPortalClienteTab } from '@/components/obras/ObraPortalClienteTab';
import { ObraLaborCostsTab } from '@/components/obras/ObraLaborCostsTab';
import { ObraMateriaisTab } from '@/components/obras/ObraMateriaisTab';
import { ObraPlanoDiarioTab } from '@/components/obras/ObraPlanoDiarioTab';
import { ScheduleGanttTable } from '@/components/schedule/ScheduleGanttTable';
import { ExecutionTimeline } from '@/components/schedule/ExecutionTimeline';
import { DailyReportForm } from '@/components/daily-reports/DailyReportForm';
import { ProgressDashboard } from '@/components/progress/ProgressDashboard';
import { MilestonesTimeline } from '@/components/financial-forecast/MilestonesTimeline';
import { KpiCard } from '@/components/relatorios/KpiCard';
import { useObra, useObras } from '@/hooks/useObras';
import { useRDOs } from '@/hooks/useRDOs';
import { useProjectResourceSummary } from '@/hooks/useProjectResources';
import { useCadernos } from '@/hooks/useCadernos';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { useScheduleVersions } from '@/hooks/useSchedule';
import { useObraLaborSummary, useObraLaborEntries } from '@/hooks/useObraLaborCosts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ObraStatus } from '@/types/obras';
import { CONDICOES_METEOROLOGICAS } from '@/types/rdos';

interface AIProgressResult {
  success: boolean;
  progresso: number;
  justificativa: string;
  resumo_trabalhos?: string;
  alertas?: string[];
  sugestoes?: string[];
  dados_analisados?: {
    total_rdos: number;
    total_trabalhos_quantificados: number;
    itens_progresso: number;
  };
}

export default function VerObraPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCalculating, setIsCalculating] = useState(false);
  const [aiResult, setAiResult] = useState<AIProgressResult | null>(null);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [isFinalizando, setIsFinalizando] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState('geral');
  
  const { 
    obra, progressTracking, isLoading, refetch,
    createProgressItem, updateProgressItem, deleteProgressItem 
  } = useObra(id);
  
  const { updateStatus } = useObras();
  const { contas, createConta, isLoading: loadingContas } = useFinanceiro(id);
  const { rdos: obrasRDOs, isLoading: loadingRDOs } = useRDOs(id);
  const { cadernos, isLoading: loadingCadernos } = useCadernos(id);
  const { data: resourceSummary } = useProjectResourceSummary(id);
  const { baseline, latestVersion } = useScheduleVersions(id);
  const { data: laborSummary } = useObraLaborSummary(id);

  const activeVersionId = baseline?.id || latestVersion?.id;

  const calculateProgressWithAI = async () => {
    if (!id) return;
    setIsCalculating(true);
    setAiResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-obra-progress', {
        body: { obra_id: id },
      });
      if (error) throw new Error(error.message || 'Erro ao calcular progresso');
      if (data?.success) {
        setAiResult(data);
        await refetch();
        toast({ title: "Progresso calculado", description: `Novo progresso: ${Math.round(data.progresso)}%` });
      } else {
        throw new Error(data?.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Error calculating progress:', error);
      toast({ variant: "destructive", title: "Erro ao calcular", description: error instanceof Error ? error.message : 'Erro desconhecido' });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleFinalizarObra = async (data: {
    valor_adjudicacao: number;
    valor_adicional?: number;
    data_vencimento: string;
    descricao?: string;
    observacoes?: string;
  }) => {
    if (!id || !obra) return;
    setIsFinalizando(true);
    try {
      const valorTotal = data.valor_adjudicacao + (data.valor_adicional || 0);
      await createConta.mutateAsync({
        obra_id: id, tipo: 'receber', origem: 'outros',
        valor: valorTotal, descricao: data.descricao || `Fecho de obra: ${obra.nome}`,
        data_vencimento: data.data_vencimento, pago: false,
      });
      await updateStatus.mutateAsync({ id, status: 'concluida' });
      await refetch();
      toast({ title: 'Obra finalizada', description: `Conta a receber de ${formatCurrency(valorTotal)} criada no financeiro.` });
    } catch (error) {
      console.error('Error finalizing obra:', error);
      throw error;
    } finally {
      setIsFinalizando(false);
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);

  const formatRDODate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isYesterday(date)) return 'Ontem';
    return format(date, "d 'de' MMM", { locale: pt });
  };

  const getCondLabel = (value: string | null) => {
    if (!value) return null;
    const cond = CONDICOES_METEOROLOGICAS.find(c => c.value === value);
    return cond?.label || value;
  };

  if (isLoading) {
    return (
      <AppLayout title="A carregar...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!obra) {
    return (
      <AppLayout title="Obra não encontrada">
        <div className="p-6 text-center">
          <p className="text-muted-foreground">A obra solicitada não foi encontrada.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/obras')}>Voltar às Obras</Button>
        </div>
      </AppLayout>
    );
  }

  const valorOrcamentos = obra.orcamentos?.reduce((sum, orc) => sum + (orc.valor_total || 0), 0) || 0;
  const recentRDOs = obrasRDOs?.slice(0, 5) || [];
  const totalRDOs = obrasRDOs?.length || 0;
  const totalCadernos = cadernos?.length || 0;
  const recentCadernos = cadernos?.slice(0, 3) || [];

  // Financial calculations
  const totalReceber = contas?.filter(c => c.tipo === 'receber').reduce((sum, c) => sum + Number(c.valor), 0) || 0;
  const totalPagar = contas?.filter(c => c.tipo === 'pagar').reduce((sum, c) => sum + Number(c.valor), 0) || 0;
  const totalLaborCost = laborSummary?.totalCost || 0;

  // Days calculation
  const startDate = obra.data_inicio ? new Date(obra.data_inicio) : null;
  const endDate = obra.data_fim ? new Date(obra.data_fim) : null;
  const today = new Date();
  const totalDays = startDate && endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const elapsedDays = startDate ? Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))) : 0;
  const remainingDays = Math.max(0, totalDays - elapsedDays);

  return (
    <AppLayout
      title={obra.nome}
      subtitle={obra.cliente || 'Sem cliente atribuído'}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/obras')}>
            <ArrowLeft className="w-4 h-4 mr-1" />Voltar
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/obras/${id}/financeiro`)}>
            <Wallet className="w-4 h-4 mr-1" />Financeiro
          </Button>
          {obra.status !== 'concluida' && obra.status !== 'cancelada' && (
            <Button variant="outline" size="sm" onClick={() => setShowFinalizarModal(true)}>
              <Flag className="w-4 h-4 mr-1" />Finalizar
            </Button>
          )}
          <Button size="sm" onClick={() => navigate(`/obras/${id}/editar`)}>
            <Edit className="w-4 h-4 mr-1" />Editar
          </Button>
        </div>
      }
    >
      <div className="p-4 md:p-6 space-y-5">
        {/* Hero Section: Status + Key Info */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 pb-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <HardHat className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <ObraStatusBadge status={obra.status as ObraStatus} />
                {obra.endereco && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 shrink-0" />{obra.endereco}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {obra.data_inicio ? format(new Date(obra.data_inicio), "dd/MM/yyyy", { locale: pt }) : '—'}
                  {obra.data_fim && (<> → {format(new Date(obra.data_fim), "dd/MM/yyyy", { locale: pt })}</>)}
                </span>
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={calculateProgressWithAI} disabled={isCalculating} className="shrink-0">
            {isCalculating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
            Calcular Progresso IA
          </Button>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            title="Progresso"
            value={`${Math.round(obra.progresso || 0)}%`}
            icon={Percent}
            description={`${elapsedDays} de ${totalDays || '—'} dias`}
            iconClassName="bg-primary/10"
          />
          <KpiCard
            title="Valor Previsto"
            value={formatCurrency(obra.valor_previsto || 0)}
            icon={DollarSign}
            description={`${obra.orcamentos?.length || 0} orçamento(s)`}
            iconClassName="bg-emerald-500/10"
          />
          <KpiCard
            title="RDOs"
            value={totalRDOs}
            icon={ClipboardList}
            description={totalRDOs > 0 ? `Último: ${formatRDODate(recentRDOs[0]?.data || '')}` : 'Nenhum registado'}
            iconClassName="bg-blue-500/10"
          />
          <KpiCard
            title="Prazo Restante"
            value={remainingDays > 0 ? `${remainingDays} dias` : totalDays > 0 ? 'Expirado' : '—'}
            icon={Clock}
            description={endDate ? format(endDate, "dd/MM/yyyy") : 'Sem data fim'}
            iconClassName="bg-amber-500/10"
          />
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Progresso Geral da Obra</span>
              <span className="text-sm font-bold">{Math.round(obra.progresso || 0)}%</span>
            </div>
            <Progress value={obra.progresso || 0} className="h-2.5" />
            <div className="flex justify-between mt-1.5">
              <span className="text-[11px] text-muted-foreground">
                {startDate ? format(startDate, "dd MMM yyyy", { locale: pt }) : '—'}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {endDate ? format(endDate, "dd MMM yyyy", { locale: pt }) : '—'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* AI Result */}
        {aiResult && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="w-4 h-4 text-primary" />Análise de Progresso com IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="text-center px-4 py-2 rounded-lg bg-primary/10">
                  <p className="text-2xl font-bold text-primary">{Math.round(aiResult.progresso)}%</p>
                  <p className="text-[11px] text-muted-foreground">Calculado</p>
                </div>
                {aiResult.dados_analisados && (
                  <div className="flex-1 grid grid-cols-3 gap-3 text-center">
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-lg font-semibold">{aiResult.dados_analisados.total_rdos}</p>
                      <p className="text-[11px] text-muted-foreground">RDOs</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-lg font-semibold">{aiResult.dados_analisados.total_trabalhos_quantificados}</p>
                      <p className="text-[11px] text-muted-foreground">Trabalhos</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-lg font-semibold">{aiResult.dados_analisados.itens_progresso}</p>
                      <p className="text-[11px] text-muted-foreground">Itens</p>
                    </div>
                  </div>
                )}
              </div>
              {aiResult.justificativa && (<Alert><CheckCircle className="h-4 w-4" /><AlertTitle>Justificativa</AlertTitle><AlertDescription>{aiResult.justificativa}</AlertDescription></Alert>)}
              {aiResult.alertas && aiResult.alertas.length > 0 && (
                <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Alertas</AlertTitle>
                  <AlertDescription><ul className="list-disc list-inside space-y-1 mt-1">{aiResult.alertas.map((a, i) => <li key={i}>{a}</li>)}</ul></AlertDescription>
                </Alert>
              )}
              {aiResult.sugestoes && aiResult.sugestoes.length > 0 && (
                <div><h4 className="font-medium mb-2 flex items-center gap-2 text-sm"><Lightbulb className="w-4 h-4 text-yellow-600" />Sugestões</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">{aiResult.sugestoes.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
              <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={() => setAiResult(null)}>Fechar análise</Button>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
          <TabsList className="w-full flex flex-wrap h-auto gap-1.5 bg-primary/5 border border-primary/15 p-1.5 rounded-xl">
            <TabsTrigger value="geral" className="text-xs gap-1.5 rounded-lg px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:bg-primary/10 transition-all"><Building2 className="h-3.5 w-3.5" />Geral</TabsTrigger>
            <TabsTrigger value="planeamento" className="text-xs gap-1.5 rounded-lg px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:bg-primary/10 transition-all"><GitBranch className="h-3.5 w-3.5" />Planeamento</TabsTrigger>
            <TabsTrigger value="rdo" className="text-xs gap-1.5 rounded-lg px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:bg-primary/10 transition-all"><ClipboardList className="h-3.5 w-3.5" />RDO Operacional</TabsTrigger>
            <TabsTrigger value="execucao" className="text-xs gap-1.5 rounded-lg px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:bg-primary/10 transition-all"><Activity className="h-3.5 w-3.5" />Execução</TabsTrigger>
            <TabsTrigger value="controlo" className="text-xs gap-1.5 rounded-lg px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:bg-primary/10 transition-all"><Target className="h-3.5 w-3.5" />Controlo</TabsTrigger>
            <TabsTrigger value="financeiro-previsto" className="text-xs gap-1.5 rounded-lg px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:bg-primary/10 transition-all"><DollarSign className="h-3.5 w-3.5" />Financeiro Previsto</TabsTrigger>
          </TabsList>

          {/* Tab: Geral */}
          <TabsContent value="geral" className="space-y-4 mt-4">
            {/* Quick Financial Overview */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Visão Financeira
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Valor Previsto</p>
                    <p className="text-lg font-bold mt-0.5">{formatCurrency(obra.valor_previsto || 0)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Orçamentado</p>
                    <p className="text-lg font-bold mt-0.5">{formatCurrency(valorOrcamentos)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-emerald-600 font-medium">A Receber</p>
                    <p className="text-lg font-bold mt-0.5 text-emerald-600">{formatCurrency(totalReceber)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-destructive font-medium">Custos MO</p>
                    <p className="text-lg font-bold mt-0.5 text-destructive">{formatCurrency(totalLaborCost)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Two-column layout for Cadernos and RDOs */}
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Cadernos de Encargos */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />Cadernos de Encargos
                    {totalCadernos > 0 && <Badge variant="secondary" className="text-[10px] h-5">{totalCadernos}</Badge>}
                  </CardTitle>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate(`/obras/${id}/cadernos/importar`)}>
                    <Upload className="w-3 h-3 mr-1" />Importar
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingCadernos ? (
                    <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                  ) : recentCadernos.length > 0 ? (
                    <div className="space-y-2">
                      {recentCadernos.map((caderno) => (
                        <div key={caderno.id} className="flex items-center justify-between p-2.5 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => {
                            if (caderno.status === 'importado') navigate(`/obras/${id}/cadernos/${caderno.id}/importar`);
                            else if (caderno.status === 'analisado') navigate(`/obras/${id}/cadernos/${caderno.id}/validar`);
                            else if (caderno.status === 'validado') navigate(`/obras/${id}/cadernos/${caderno.id}/resumo`);
                            else if (caderno.status === 'orcamentado' && caderno.orcamento_id) navigate(`/orcamentos/${caderno.orcamento_id}/editar`);
                            else navigate(`/obras/${id}/cadernos`);
                          }}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{caderno.nome}</span>
                              <CadernoStatusBadge status={caderno.status} />
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                              <span>{caderno.total_itens} itens</span>
                              {caderno.itens_validados > 0 && <span>{Math.round((caderno.itens_validados / caderno.total_itens) * 100)}% validados</span>}
                            </div>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-2" />
                        </div>
                      ))}
                      {totalCadernos > 3 && <Button variant="ghost" size="sm" className="w-full text-xs h-7" onClick={() => navigate(`/obras/${id}/cadernos`)}>Ver todos ({totalCadernos})</Button>}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Nenhum caderno importado</p>
                      <Button variant="outline" size="sm" className="mt-3 h-7 text-xs" onClick={() => navigate(`/obras/${id}/cadernos/importar`)}>
                        <Upload className="w-3 h-3 mr-1" />Importar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* RDOs Section */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-primary" />Relatórios Diários
                    {totalRDOs > 0 && <Badge variant="secondary" className="text-[10px] h-5">{totalRDOs}</Badge>}
                  </CardTitle>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate(`/rdos/criar?obra=${id}`)}>
                    <Plus className="w-3 h-3 mr-1" />Novo
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingRDOs ? (
                    <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                  ) : recentRDOs.length > 0 ? (
                    <div className="space-y-2">
                      {recentRDOs.slice(0, 4).map((rdo) => (
                        <div key={rdo.id} className="flex items-center justify-between p-2.5 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => navigate(`/rdos/${rdo.id}`)}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{formatRDODate(rdo.data)}</span>
                              <RDOStatusBadge status={rdo.status} />
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                              {rdo.condicoes_meteorologicas && <span className="flex items-center gap-1"><Cloud className="h-3 w-3" />{getCondLabel(rdo.condicoes_meteorologicas)}</span>}
                              {rdo.mao_de_obra_presente > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{rdo.mao_de_obra_presente}</span>}
                            </div>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-2" />
                        </div>
                      ))}
                      {totalRDOs > 4 && <Button variant="ghost" size="sm" className="w-full text-xs h-7" onClick={() => navigate(`/rdos?obra=${id}`)}>Ver todos ({totalRDOs})</Button>}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Nenhum RDO registado</p>
                      <Button variant="outline" size="sm" className="mt-3 h-7 text-xs" onClick={() => navigate(`/rdos/criar?obra=${id}`)}>
                        <Plus className="w-3 h-3 mr-1" />Criar RDO
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <ObraPlanoDiarioTab obraId={id!} />

            {/* Portal + Materiais side by side */}
            <div className="grid lg:grid-cols-2 gap-4">
              <ObraPortalClienteTab obraId={id!} obraNome={obra.nome} clienteNome={obra.cliente} clienteEmail={null} clienteId={null} />
              <ObraMateriaisTab obraId={id!} />
            </div>

            {/* Labor Costs */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CircleDollarSign className="w-4 h-4 text-primary" />Custos de Mão de Obra
                </CardTitle>
              </CardHeader>
              <CardContent><ObraLaborCostsTab obraId={id!} compact /></CardContent>
            </Card>

            <ObraEquipaTab obraId={id!} />

            <ObraProgressTracker
              progressItems={progressTracking || []}
              onAdd={createProgressItem.mutate}
              onUpdate={updateProgressItem.mutate}
              onDelete={deleteProgressItem.mutate}
              isLoading={createProgressItem.isPending || updateProgressItem.isPending}
            />

            {/* Linked Budgets */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />Orçamentos Associados
                </CardTitle>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate(`/orcamentos/criar?obra_id=${id}`)}>
                  <Plus className="w-3 h-3 mr-1" />Novo
                </Button>
              </CardHeader>
              <CardContent>
                {obra.orcamentos && obra.orcamentos.length > 0 ? (
                  <div className="space-y-2">
                    {obra.orcamentos.map((orcamento) => (
                      <div key={orcamento.id} className="flex items-center justify-between p-2.5 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => navigate(`/orcamentos/${orcamento.id}/editar`)}>
                        <div>
                          <p className="text-sm font-medium">{orcamento.titulo}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(orcamento.valor_total || 0)}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{orcamento.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Nenhum orçamento associado</p>
                    <Button variant="outline" size="sm" className="mt-3 h-7 text-xs" onClick={() => navigate(`/orcamentos/criar?obra_id=${id}`)}>
                      <Plus className="w-3 h-3 mr-1" />Criar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial History */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-primary" />Histórico Financeiro
                  {contas && contas.length > 0 && <Badge variant="secondary" className="text-[10px] h-5">{contas.length}</Badge>}
                </CardTitle>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate(`/financeiro?obra=${id}`)}>
                  Ver Tudo
                </Button>
              </CardHeader>
              <CardContent>
                {loadingContas ? (
                  <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : contas && contas.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/40 rounded-lg mb-3">
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">A Receber</p>
                        <p className="text-sm font-bold text-emerald-600 mt-0.5">{formatCurrency(totalReceber)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">A Pagar</p>
                        <p className="text-sm font-bold text-destructive mt-0.5">{formatCurrency(totalPagar)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Recebido</p>
                        <p className="text-sm font-bold mt-0.5">{formatCurrency(contas.filter(c => c.tipo === 'receber' && c.pago).reduce((sum, c) => sum + Number(c.valor), 0))}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pago</p>
                        <p className="text-sm font-bold mt-0.5">{formatCurrency(contas.filter(c => c.tipo === 'pagar' && c.pago).reduce((sum, c) => sum + Number(c.valor), 0))}</p>
                      </div>
                    </div>
                    {contas.slice(0, 4).map((conta) => (
                      <div key={conta.id} className="flex items-center justify-between p-2.5 border rounded-lg">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-full ${conta.tipo === 'receber' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                            {conta.tipo === 'receber' ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> : <TrendingDown className="w-3.5 h-3.5 text-destructive" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{conta.descricao || (conta.tipo === 'receber' ? 'A Receber' : 'A Pagar')}</p>
                            <p className="text-[11px] text-muted-foreground">Venc: {format(new Date(conta.data_vencimento), "dd/MM/yyyy")}{conta.fornecedor && ` • ${conta.fornecedor.nome}`}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${conta.tipo === 'receber' ? 'text-emerald-600' : 'text-destructive'}`}>{conta.tipo === 'receber' ? '+' : '-'} {formatCurrency(Number(conta.valor))}</p>
                          <Badge variant={conta.pago ? 'default' : 'outline'} className="text-[10px] h-4">{conta.pago ? 'Pago' : 'Pendente'}</Badge>
                        </div>
                      </div>
                    ))}
                    {contas.length > 4 && <Button variant="ghost" size="sm" className="w-full text-xs h-7" onClick={() => navigate(`/financeiro?obra=${id}`)}>Ver todas ({contas.length})</Button>}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Wallet className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Nenhuma conta registada</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Planeamento */}
          <TabsContent value="planeamento" className="mt-4">
            <ScheduleGanttTable obraId={id!} obraNome={obra.nome} orcamentoId={obra.orcamentos?.[0]?.id} />
          </TabsContent>

          {/* Tab: RDO Operacional */}
          <TabsContent value="rdo" className="mt-4">
            <DailyReportForm obraId={id!} scheduleVersionId={activeVersionId} />
          </TabsContent>

          {/* Tab: Execução */}
          <TabsContent value="execucao" className="mt-4">
            <ExecutionTimeline obraId={id!} versionId={activeVersionId} />
          </TabsContent>

          {/* Tab: Controlo */}
          <TabsContent value="controlo" className="mt-4">
            <ProgressDashboard obraId={id!} versionId={activeVersionId} />
          </TabsContent>

          {/* Tab: Financeiro Previsto */}
          <TabsContent value="financeiro-previsto" className="mt-4">
            <MilestonesTimeline obraId={id!} />
          </TabsContent>
        </Tabs>
      </div>

      <FinalizarObraModal
        open={showFinalizarModal}
        onOpenChange={setShowFinalizarModal}
        obra={obra}
        onConfirm={handleFinalizarObra}
        isLoading={isFinalizando}
      />
    </AppLayout>
  );
}
