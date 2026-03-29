import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useFinancialMilestones, useFinancialAlerts } from '@/hooks/useFinancialMilestones';
import { useScheduleTasks, useScheduleVersions, calculateWeightedProgress } from '@/hooks/useSchedule';
import { MILESTONE_TYPE_LABELS } from '@/types/financial-milestones';
import { AlertsPanel } from './AlertsPanel';
import { DollarSign, TrendingUp, TrendingDown, Calendar, Plus, GitBranch, Sparkles, Loader2, Activity, Target, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useFormatting } from '@/hooks/useFormatting';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  obraId: string;
}

export function MilestonesTimeline({ obraId }: Props) {
  const { milestones, isLoading, receipts, payments, totalPlanned, totalActual } = useFinancialMilestones(obraId);
  const { baseline, latestVersion } = useScheduleVersions(obraId);
  const activeVersionId = baseline?.id || latestVersion?.id;
  const { tasks } = useScheduleTasks(activeVersionId, obraId);
  const { formatCurrency } = useFormatting();
  const { toast } = useToast();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [axiaForecast, setAxiaForecast] = useState<string | null>(null);

  // Calculate schedule progress
  const progress = tasks ? calculateWeightedProgress(tasks.filter(t => !t.parent_task_id)) : { planned: 0, actual: 0, deviation: 0, projected: 0 };

  // Determine financial health based on schedule deviation
  const getFinancialRisk = () => {
    if (progress.deviation < -10) return { label: 'Alto Risco', color: 'text-red-600', bg: 'bg-red-50 border-red-200' };
    if (progress.deviation < -5) return { label: 'Risco Moderado', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
    return { label: 'Saudável', color: 'text-green-600', bg: 'bg-green-50 border-green-200' };
  };

  const risk = getFinancialRisk();

  const analyzeFinancialForecast = async () => {
    setIsAnalyzing(true);
    setAxiaForecast(null);
    try {
      const contextData = {
        milestones: milestones?.map(m => ({
          tipo: m.milestone_type,
          descricao: m.description,
          valor: m.planned_amount,
          data: m.planned_date,
          estado: m.status,
        })),
        progresso_cronograma: progress,
        total_planeado: totalPlanned,
        total_real: totalActual,
        tarefas_atrasadas: tasks?.filter(t => {
          if (!t.planned_end || !t.forecast_end) return false;
          return new Date(t.forecast_end) > new Date(t.planned_end);
        }).map(t => ({
          nome: t.name,
          atraso_dias: Math.ceil((new Date(t.forecast_end!).getTime() - new Date(t.planned_end!).getTime()) / (1000 * 60 * 60 * 24)),
        })),
      };

      const { data, error } = await supabase.functions.invoke('axia-chat', {
        body: {
          question: `Analisa a previsão financeira desta obra com base no cronograma e marcos financeiros. Identifica riscos de cash-flow, datas de recebimento comprometidas por atrasos, e sugere ações. Dados: ${JSON.stringify(contextData)}. Responde em português, formato conciso com emojis.`,
        },
        headers: { Accept: 'text/event-stream' },
      });
      if (error) throw error;
      // Parse SSE stream response
      let fullText = '';
      if (data instanceof ReadableStream) {
        const reader = data.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
            try {
              const parsed = JSON.parse(line.slice(6));
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) fullText += content;
            } catch { /* skip */ }
          }
        }
      } else if (typeof data === 'string') {
        fullText = data;
      } else {
        fullText = data?.response || data?.message || '';
      }
      setAxiaForecast(fullText || 'Sem análise disponível.');
    } catch (err) {
      console.error('Axia forecast error:', err);
      toast({ title: 'Erro na análise Axia', description: 'Não foi possível gerar a previsão.', variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const statusColors: Record<string, string> = {
    planned: 'bg-blue-100 text-blue-800',
    forecasted: 'bg-amber-100 text-amber-800',
    triggered: 'bg-green-100 text-green-800',
    completed: 'bg-green-200 text-green-900',
    cancelled: 'bg-gray-100 text-gray-600',
  };

  const statusLabels: Record<string, string> = {
    planned: 'Planeado',
    forecasted: 'Previsto',
    triggered: 'Ativado',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  };

  return (
    <div className="space-y-4">
      {/* Schedule integration indicator */}
      {activeVersionId ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GitBranch className="h-4 w-4 text-green-600" />
            <span>Cronograma conectado — previsão financeira integrada</span>
            <Badge variant="outline" className="text-[10px] text-green-700 border-green-300 bg-green-50">Integrado</Badge>
          </div>
          <Button size="sm" variant="outline" onClick={analyzeFinancialForecast} disabled={isAnalyzing} className="gap-1.5">
            {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-[#00679d]" />}
            Previsão Axia™
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          <span>Sem cronograma — a previsão financeira será limitada</span>
        </div>
      )}

      {/* Axia Forecast */}
      {axiaForecast && (
        <Card className="border-[#00679d]/20 bg-[#00679d]/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-[#00679d] mt-0.5 shrink-0" />
              <div className="text-sm whitespace-pre-wrap">{axiaForecast}</div>
            </div>
            <Button variant="ghost" size="sm" className="mt-2 text-xs text-muted-foreground" onClick={() => setAxiaForecast(null)}>
              Fechar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary cards with schedule integration */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Recebimentos</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(receipts.reduce((s, m) => s + (m.planned_amount || 0), 0))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-xs text-muted-foreground">Pagamentos</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(payments.reduce((s, m) => s + (m.planned_amount || 0), 0))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total planeado</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(totalPlanned)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Progresso físico</span>
            </div>
            <p className={`text-lg font-bold ${progress.deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {progress.actual.toFixed(1)}%
            </p>
            <Progress value={progress.actual} className="h-1 mt-1" />
          </CardContent>
        </Card>
        <Card className={risk.bg}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4" />
              <span className="text-xs text-muted-foreground">Risco financeiro</span>
            </div>
            <p className={`text-lg font-bold ${risk.color}`}>{risk.label}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Desvio: {progress.deviation > 0 ? '+' : ''}{progress.deviation.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Milestones table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Marcos Financeiros</CardTitle>
            <Button size="sm" variant="outline" disabled>
              <Plus className="h-3 w-3 mr-1" />
              Novo marco
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Data prevista</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">A carregar...</TableCell>
                </TableRow>
              ) : !milestones?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Sem marcos financeiros registados.
                  </TableCell>
                </TableRow>
              ) : (
                milestones.map(m => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {MILESTONE_TYPE_LABELS[m.milestone_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{m.description}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.planned_date ? format(new Date(m.planned_date), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {formatCurrency(m.planned_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${statusColors[m.status]}`}>
                        {statusLabels[m.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Alerts */}
      <AlertsPanel obraId={obraId} />
    </div>
  );
}
