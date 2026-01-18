import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isYesterday, parseISO, startOfWeek, isWithinInterval } from 'date-fns';
import { pt } from 'date-fns/locale';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  FileText, 
  ClipboardList, 
  Wallet,
  Plus,
  ArrowRight,
  TrendingUp,
  Calendar,
  Cloud,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useObras } from '@/hooks/useObras';
import { useRDOs } from '@/hooks/useRDOs';
import { ObraStatusBadge } from '@/components/obras/ObraStatusBadge';
import { RDOStatusBadge } from '@/components/rdos';
import { CONDICOES_METEOROLOGICAS } from '@/types/rdos';
import type { ObraStatus } from '@/types/obras';

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { obras, isLoading: loadingObras } = useObras();
  const { rdos, recentRDOs, obrasComRDO, isLoading: loadingRDOs } = useRDOs();

  // Calculate KPIs
  const kpis = useMemo(() => {
    const obrasAtivas = obras?.filter(o => o.status === 'em_curso') || [];
    const obrasPlanejadas = obras?.filter(o => o.status === 'planeamento') || [];
    const obrasPausadas = obras?.filter(o => o.status === 'pausada') || [];
    
    const now = new Date();
    const weekStart = startOfWeek(now, { locale: pt });
    
    const rdosHoje = rdos?.filter(r => isToday(parseISO(r.data))) || [];
    const rdosSemana = rdos?.filter(r => {
      const rdoDate = parseISO(r.data);
      return isWithinInterval(rdoDate, { start: weekStart, end: now });
    }) || [];
    
    const rdosAprovados = rdos?.filter(r => r.status === 'aprovado') || [];
    const rdosPendentes = rdos?.filter(r => r.status === 'submetido') || [];
    
    const valorTotalObras = obras?.reduce((sum, o) => sum + (o.valor_previsto || 0), 0) || 0;
    const progressoMedio = obrasAtivas.length > 0 
      ? obrasAtivas.reduce((sum, o) => sum + (o.progresso || 0), 0) / obrasAtivas.length 
      : 0;

    return {
      obrasAtivas: obrasAtivas.length,
      obrasPlanejadas: obrasPlanejadas.length,
      obrasPausadas: obrasPausadas.length,
      totalObras: obras?.length || 0,
      rdosHoje: rdosHoje.length,
      rdosSemana: rdosSemana.length,
      rdosAprovados: rdosAprovados.length,
      rdosPendentes: rdosPendentes.length,
      totalRDOs: rdos?.length || 0,
      valorTotalObras,
      progressoMedio,
    };
  }, [obras, rdos]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

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

  const isLoading = loadingObras || loadingRDOs;

  if (isLoading) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const hasData = (obras?.length || 0) > 0 || (rdos?.length || 0) > 0;

  return (
    <AppLayout title="Dashboard">
      <div className="p-6 space-y-6">
        {/* Welcome message */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">
              Olá, {profile?.nome?.split(' ')[0] || 'Utilizador'}! 👋
            </h2>
            <p className="text-muted-foreground">
              {hasData 
                ? 'Aqui está o resumo do acompanhamento das suas obras.'
                : 'Bem-vindo ao ObraSys. Comece criando a sua primeira obra.'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/rdos/criar')}>
              <Plus className="w-4 h-4 mr-2" />
              Novo RDO
            </Button>
            <Button onClick={() => navigate('/obras/criar')}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Obra
            </Button>
          </div>
        </div>

        {/* Main KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/obras?status=em_curso')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-green-600" />
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700">Em Curso</Badge>
              </div>
              <p className="text-3xl font-bold">{kpis.obrasAtivas}</p>
              <p className="text-sm text-muted-foreground">Obras Ativas</p>
              {kpis.progressoMedio > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progresso médio</span>
                    <span>{Math.round(kpis.progressoMedio)}%</span>
                  </div>
                  <Progress value={kpis.progressoMedio} className="h-1.5" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/rdos')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-blue-600" />
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">Hoje</Badge>
              </div>
              <p className="text-3xl font-bold">{kpis.rdosHoje}</p>
              <p className="text-sm text-muted-foreground">RDOs de Hoje</p>
              <p className="text-xs text-muted-foreground mt-2">
                {kpis.rdosSemana} esta semana
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/rdos?status=submetido')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                {kpis.rdosPendentes > 0 && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                    Pendentes
                  </Badge>
                )}
              </div>
              <p className="text-3xl font-bold">{kpis.rdosPendentes}</p>
              <p className="text-sm text-muted-foreground">RDOs para Aprovar</p>
              <p className="text-xs text-muted-foreground mt-2">
                {kpis.rdosAprovados} aprovados
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/obras')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-3xl font-bold">{formatCurrency(kpis.valorTotalObras)}</p>
              <p className="text-sm text-muted-foreground">Valor Total</p>
              <p className="text-xs text-muted-foreground mt-2">
                {kpis.totalObras} obras
              </p>
            </CardContent>
          </Card>
        </div>

        {hasData ? (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Obras Ativas com RDOs */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Obras em Acompanhamento
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/obras')}>
                  Ver todas
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {obrasComRDO && obrasComRDO.length > 0 ? (
                  obrasComRDO.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/obras/${item.id}`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{item.nome}</h4>
                          {item.cliente && (
                            <p className="text-sm text-muted-foreground truncate">{item.cliente}</p>
                          )}
                        </div>
                        <ObraStatusBadge status={item.status as ObraStatus} />
                      </div>
                      
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium">{Math.round(item.progresso || 0)}%</span>
                      </div>
                      <Progress value={item.progresso || 0} className="h-1.5 mb-2" />
                      
                      {item.ultimoRDO ? (
                        <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1.5">
                          <span className="flex items-center gap-1">
                            <ClipboardList className="w-3 h-3" />
                            Último RDO: {formatRDODate(item.ultimoRDO.data)}
                          </span>
                          <RDOStatusBadge status={item.ultimoRDO.status as 'rascunho' | 'submetido' | 'aprovado'} />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 rounded px-2 py-1.5">
                          <AlertCircle className="w-3 h-3" />
                          Sem RDOs registados
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma obra activa</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate('/obras/criar')}>
                      <Plus className="w-4 h-4 mr-1" />
                      Criar Obra
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Últimos RDOs */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Últimos Relatórios Diários
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/rdos')}>
                  Ver todos
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentRDOs && recentRDOs.length > 0 ? (
                  recentRDOs.slice(0, 6).map((rdo) => (
                    <div
                      key={rdo.id}
                      className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/rdos/${rdo.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{formatRDODate(rdo.data)}</span>
                            <RDOStatusBadge status={rdo.status} />
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {rdo.obra?.nome || 'Obra desconhecida'}
                          </p>
                          {rdo.trabalhos_executados && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {rdo.trabalhos_executados.slice(0, 60)}
                              {rdo.trabalhos_executados.length > 60 ? '...' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {rdo.condicoes_meteorologicas && (
                          <span className="flex items-center gap-1">
                            <Cloud className="h-3 w-3" />
                            {getCondLabel(rdo.condicoes_meteorologicas)}
                          </span>
                        )}
                        {rdo.mao_de_obra_presente > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {rdo.mao_de_obra_presente} trabalhadores
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Nenhum relatório diário</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate('/rdos/criar')}>
                      <Plus className="w-4 h-4 mr-1" />
                      Criar RDO
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Empty state */
          <Card className="p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-10 h-10 text-accent" />
            </div>
            <h3 className="font-display text-xl font-bold text-foreground mb-2">
              Comece a sua primeira obra
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Crie a sua primeira obra para começar a gerir orçamentos, relatórios diários e acompanhar o progresso num único lugar.
            </p>
            <Button onClick={() => navigate('/obras/criar')} size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Criar Obra
            </Button>
          </Card>
        )}

        {/* Quick Stats Bar */}
        {hasData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-muted/30">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{kpis.obrasPlanejadas}</p>
                  <p className="text-xs text-muted-foreground">Em Planeamento</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-muted/30">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{kpis.obrasPausadas}</p>
                  <p className="text-xs text-muted-foreground">Obras Pausadas</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-muted/30">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{kpis.rdosAprovados}</p>
                  <p className="text-xs text-muted-foreground">RDOs Aprovados</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-muted/30">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{kpis.totalRDOs}</p>
                  <p className="text-xs text-muted-foreground">Total RDOs</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
