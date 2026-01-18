import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  ArrowLeft, 
  Edit, 
  MapPin, 
  Calendar, 
  Building2, 
  FileText,
  Plus,
  Loader2,
  ClipboardList,
  Cloud,
  Users,
  ExternalLink,
  Sparkles,
  AlertCircle,
  Lightbulb,
  CheckCircle,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ObraStatusBadge } from '@/components/obras/ObraStatusBadge';
import { ObraProgressTracker } from '@/components/obras/ObraProgressTracker';
import { RDOStatusBadge } from '@/components/rdos';
import { useObra } from '@/hooks/useObras';
import { useRDOs } from '@/hooks/useRDOs';
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
  
  const { 
    obra, 
    progressTracking, 
    isLoading,
    refetch,
    createProgressItem, 
    updateProgressItem, 
    deleteProgressItem 
  } = useObra(id);
  
  const { rdos: obrasRDOs, isLoading: loadingRDOs } = useRDOs(id);

  const calculateProgressWithAI = async () => {
    if (!id) return;
    
    setIsCalculating(true);
    setAiResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('calculate-obra-progress', {
        body: { obra_id: id },
      });
      
      if (error) {
        throw new Error(error.message || 'Erro ao calcular progresso');
      }
      
      if (data?.success) {
        setAiResult(data);
        await refetch();
        toast({
          title: "Progresso calculado",
          description: `Novo progresso: ${Math.round(data.progresso)}%`,
        });
      } else {
        throw new Error(data?.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Error calculating progress:', error);
      toast({
        variant: "destructive",
        title: "Erro ao calcular",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
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
          <Button variant="outline" className="mt-4" onClick={() => navigate('/obras')}>
            Voltar às Obras
          </Button>
        </div>
      </AppLayout>
    );
  }

  const valorOrcamentos = obra.orcamentos?.reduce((sum, orc) => sum + (orc.valor_total || 0), 0) || 0;
  const recentRDOs = obrasRDOs?.slice(0, 5) || [];
  const totalRDOs = obrasRDOs?.length || 0;

  return (
    <AppLayout
      title={obra.nome}
      subtitle={obra.cliente || 'Sem cliente atribuído'}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/obras')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={() => navigate(`/obras/${id}/editar`)}>
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </div>
      }
    >
      <div className="p-6 space-y-6">
        {/* Header Info */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Info Card */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Informações da Obra
                </CardTitle>
              </div>
              <ObraStatusBadge status={obra.status as ObraStatus} />
            </CardHeader>
            <CardContent className="space-y-4">
              {obra.endereco && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <span>{obra.endereco}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>
                  {obra.data_inicio 
                    ? format(new Date(obra.data_inicio), "dd 'de' MMMM 'de' yyyy", { locale: pt })
                    : 'Data de início não definida'
                  }
                  {obra.data_fim && (
                    <> → {format(new Date(obra.data_fim), "dd 'de' MMMM 'de' yyyy", { locale: pt })}</>
                  )}
                </span>
              </div>

              {/* Progress Overview */}
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Progresso Geral</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{Math.round(obra.progresso || 0)}%</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={calculateProgressWithAI}
                      disabled={isCalculating}
                    >
                      {isCalculating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-1" />
                          Calcular com IA
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <Progress value={obra.progresso || 0} className="h-3" />
              </div>
            </CardContent>
          </Card>

          {/* KPIs Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumo Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Valor Previsto</p>
                <p className="text-xl font-bold">{formatCurrency(obra.valor_previsto || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Orçamentado</p>
                <p className="text-xl font-bold">{formatCurrency(valorOrcamentos)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Orçamentos</p>
                <p className="text-xl font-bold">{obra.orcamentos?.length || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Progress Analysis Result */}
        {aiResult && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Análise de Progresso com IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{Math.round(aiResult.progresso)}%</p>
                  <p className="text-sm text-muted-foreground">Progresso Calculado</p>
                </div>
                {aiResult.dados_analisados && (
                  <div className="flex-1 grid grid-cols-3 gap-4 text-center border-l pl-4">
                    <div>
                      <p className="text-lg font-semibold">{aiResult.dados_analisados.total_rdos}</p>
                      <p className="text-xs text-muted-foreground">RDOs Analisados</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{aiResult.dados_analisados.total_trabalhos_quantificados}</p>
                      <p className="text-xs text-muted-foreground">Trabalhos Quantificados</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{aiResult.dados_analisados.itens_progresso}</p>
                      <p className="text-xs text-muted-foreground">Itens de Progresso</p>
                    </div>
                  </div>
                )}
              </div>

              {aiResult.justificativa && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Justificativa</AlertTitle>
                  <AlertDescription>{aiResult.justificativa}</AlertDescription>
                </Alert>
              )}

              {aiResult.resumo_trabalhos && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" />
                    Resumo dos Trabalhos
                  </h4>
                  <p className="text-sm text-muted-foreground">{aiResult.resumo_trabalhos}</p>
                </div>
              )}

              {aiResult.alertas && aiResult.alertas.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Alertas</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      {aiResult.alertas.map((alerta, index) => (
                        <li key={index}>{alerta}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {aiResult.sugestoes && aiResult.sugestoes.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-600" />
                    Sugestões
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {aiResult.sugestoes.map((sugestao, index) => (
                      <li key={index}>{sugestao}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setAiResult(null)}
              >
                Fechar análise
              </Button>
            </CardContent>
          </Card>
        )}

        {/* RDOs Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Relatórios Diários (RDOs)
              {totalRDOs > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {totalRDOs}
                </Badge>
              )}
            </CardTitle>
            <Button 
              size="sm" 
              onClick={() => navigate(`/rdos/criar?obra=${id}`)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo RDO
            </Button>
          </CardHeader>
          <CardContent>
            {loadingRDOs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentRDOs.length > 0 ? (
              <div className="space-y-3">
                {recentRDOs.map((rdo) => (
                  <div 
                    key={rdo.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/rdos/${rdo.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatRDODate(rdo.data)}</span>
                        <RDOStatusBadge status={rdo.status} />
                      </div>
                      {rdo.trabalhos_executados && (
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {rdo.trabalhos_executados.slice(0, 80)}
                          {rdo.trabalhos_executados.length > 80 ? '...' : ''}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        {rdo.condicoes_meteorologicas && (
                          <span className="flex items-center gap-1">
                            <Cloud className="h-3 w-3" />
                            {getCondLabel(rdo.condicoes_meteorologicas)}
                          </span>
                        )}
                        {rdo.mao_de_obra_presente > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {rdo.mao_de_obra_presente}
                          </span>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
                  </div>
                ))}
                
                {totalRDOs > 5 && (
                  <Button 
                    variant="ghost" 
                    className="w-full" 
                    onClick={() => navigate(`/rdos?obra=${id}`)}
                  >
                    Ver todos os {totalRDOs} RDOs
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum relatório diário registado.</p>
                <p className="text-sm mt-1">Comece a registar os trabalhos diários desta obra.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => navigate(`/rdos/criar?obra=${id}`)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro RDO
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress Tracker */}
        <ObraProgressTracker
          progressItems={progressTracking || []}
          onAdd={createProgressItem.mutate}
          onUpdate={updateProgressItem.mutate}
          onDelete={deleteProgressItem.mutate}
          isLoading={createProgressItem.isPending || updateProgressItem.isPending}
        />

        {/* Linked Budgets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Orçamentos Associados
            </CardTitle>
            <Button 
              size="sm" 
              onClick={() => navigate(`/orcamentos/criar?obra_id=${id}`)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Orçamento
            </Button>
          </CardHeader>
          <CardContent>
            {obra.orcamentos && obra.orcamentos.length > 0 ? (
              <div className="space-y-2">
                {obra.orcamentos.map((orcamento) => (
                  <div 
                    key={orcamento.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/orcamentos/${orcamento.id}/editar`)}
                  >
                    <div>
                      <p className="font-medium">{orcamento.titulo}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(orcamento.valor_total || 0)}
                      </p>
                    </div>
                    <Badge variant="outline">{orcamento.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum orçamento associado a esta obra.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => navigate(`/orcamentos/criar?obra_id=${id}`)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Orçamento
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
