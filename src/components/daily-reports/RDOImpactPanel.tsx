import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, Clock,
  Sparkles, Loader2, Target, Activity, Calendar, ShieldAlert,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ImpactSummary {
  tasks_updated: number;
  delayed_tasks: number;
  critical_delayed: number;
  project_progress: {
    planned: number;
    actual: number;
    deviation: number;
    health: string;
    probable_completion: string | null;
  } | null;
  delayed_details: Array<{
    name: string;
    delay_days: number;
    classification: string;
    is_critical: boolean;
  }>;
}

interface Props {
  reportId: string;
  obraId: string;
  impactResult: ImpactSummary | null;
  reportStatus: string;
}

const HEALTH_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  on_track: { label: 'No Prazo', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle2 },
  at_risk: { label: 'Em Risco', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: AlertTriangle },
  delayed: { label: 'Atrasado', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', icon: Clock },
  critical: { label: 'Crítico', color: 'bg-destructive/10 text-destructive', icon: ShieldAlert },
};

const DELAY_CLASSIFICATION: Record<string, { label: string; color: string }> = {
  recoverable: { label: 'Recuperável', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  structural: { label: 'Estrutural', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  critical: { label: 'Crítico', color: 'bg-destructive/10 text-destructive' },
};

export function RDOImpactPanel({ reportId, obraId, impactResult, reportStatus }: Props) {
  const [axiaInsight, setAxiaInsight] = useState('');
  const [axiaLoading, setAxiaLoading] = useState(false);

  const askAxiaImpact = async () => {
    setAxiaLoading(true);
    setAxiaInsight('');

    const impactContext = impactResult
      ? `Dados de impacto do RDO aprovado:
- Tarefas atualizadas: ${impactResult.tasks_updated}
- Tarefas atrasadas: ${impactResult.delayed_tasks} (${impactResult.critical_delayed} críticas)
- Progresso global: planeado ${impactResult.project_progress?.planned?.toFixed(1)}%, real ${impactResult.project_progress?.actual?.toFixed(1)}%, desvio ${impactResult.project_progress?.deviation?.toFixed(1)}%
- Saúde: ${impactResult.project_progress?.health}
- Conclusão provável: ${impactResult.project_progress?.probable_completion || 'N/A'}
- Tarefas atrasadas: ${impactResult.delayed_details.map(d => `${d.name} (${d.delay_days}d, ${d.classification}${d.is_critical ? ', CRÍTICA' : ''})`).join('; ')}`
      : 'RDO ainda não foi aprovado/processado. Sem dados de impacto disponíveis.';

    const question = `Analisa o impacto deste RDO no cronograma da obra:
${impactContext}
Identifica: 1) Riscos para o prazo global, 2) Tarefas que necessitam ação imediata, 3) Recomendações para mitigar atrasos. Sê conciso e prático.`;

    try {
      const res = await supabase.functions.invoke('axia-chat', {
        body: { question },
        headers: { Accept: 'text/event-stream' },
      });
      if (res.error) throw res.error;

      const reader = (res.data as ReadableStream).getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') continue;
          try {
            const parsed = JSON.parse(raw);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              setAxiaInsight(fullText);
            }
          } catch { /* skip */ }
        }
      }
    } catch (err: any) {
      console.error('Axia impact error:', err);
      setAxiaInsight('Não foi possível obter análise da Axia neste momento.');
    } finally {
      setAxiaLoading(false);
    }
  };

  const progress = impactResult?.project_progress;
  const health = progress?.health ? HEALTH_CONFIG[progress.health] : null;
  const HealthIcon = health?.icon || Activity;

  // Not yet processed
  if (!impactResult) {
    return (
      <div className="space-y-4">
        <div className="text-center py-6 text-muted-foreground">
          <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Impacto pendente</p>
          <p className="text-xs mt-1">
            {reportStatus === 'approved'
              ? 'A processar impacto no cronograma...'
              : 'O impacto será calculado automaticamente após aprovação da RDO.'}
          </p>
          <p className="text-xs mt-1 text-muted-foreground/60">
            Inclui recálculo de progresso, duração remanescente e caminho crítico.
          </p>
        </div>

        {/* Axia pre-analysis */}
        <Card className="border-[#00679d]/30 bg-[#00679d]/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#00679d]" />
              Pré-análise Axia™
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-[10px] text-muted-foreground">
              Peça à Axia uma análise preditiva antes de aprovar o RDO.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={askAxiaImpact}
              disabled={axiaLoading}
              className="text-xs border-[#00679d]/30 text-[#00679d] hover:bg-[#00679d]/10"
            >
              {axiaLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
              {axiaLoading ? 'A analisar...' : 'Analisar com Axia™'}
            </Button>
            {axiaInsight && (
              <div className="mt-2 p-3 rounded-md bg-background border text-xs whitespace-pre-wrap leading-relaxed">
                {axiaInsight}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Processed - show results
  return (
    <div className="space-y-4">
      {/* Health banner */}
      {progress && (
        <Alert className={health?.color}>
          <HealthIcon className="h-4 w-4" />
          <AlertTitle className="text-sm">{health?.label || 'Desconhecido'}</AlertTitle>
          <AlertDescription className="text-xs">
            {impactResult.tasks_updated} tarefas atualizadas, {impactResult.delayed_tasks} com atraso
            {impactResult.critical_delayed > 0 && (
              <span className="font-semibold"> ({impactResult.critical_delayed} críticas)</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Progress comparison */}
      {progress && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-1">
              <Target className="h-3.5 w-3.5" /> Progresso Global
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Planeado</span>
                <span className="font-medium">{progress.planned.toFixed(1)}%</span>
              </div>
              <Progress value={progress.planned} className="h-2" />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Real</span>
                <span className="font-medium">{progress.actual.toFixed(1)}%</span>
              </div>
              <Progress value={progress.actual} className="h-2" />
            </div>
            <div className="flex items-center justify-between pt-1 border-t">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {progress.deviation >= 0 ? <TrendingUp className="h-3 w-3 text-green-600" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
                Desvio
              </span>
              <span className={`text-sm font-bold ${progress.deviation >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                {progress.deviation > 0 ? '+' : ''}{progress.deviation.toFixed(1)}%
              </span>
            </div>
            {progress.probable_completion && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Conclusão provável
                </span>
                <span className="font-medium">{new Date(progress.probable_completion).toLocaleDateString('pt-PT')}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delayed tasks detail */}
      {impactResult.delayed_details.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
              Tarefas com Atraso ({impactResult.delayed_details.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {impactResult.delayed_details.map((task, i) => {
              const cls = DELAY_CLASSIFICATION[task.classification] || DELAY_CLASSIFICATION.recoverable;
              return (
                <div key={i} className="flex items-center justify-between p-2 rounded-md border text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    {task.is_critical && <ShieldAlert className="h-3.5 w-3.5 text-destructive shrink-0" />}
                    <span className="truncate font-medium">{task.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-[10px] ${cls.color}`}>
                      {cls.label}
                    </Badge>
                    <span className="text-destructive font-bold">+{task.delay_days}d</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Axia post-analysis */}
      <Card className="border-[#00679d]/30 bg-[#00679d]/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#00679d]" />
            Análise de Impacto Axia™
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-[10px] text-muted-foreground">
            A Axia analisa o impacto no cronograma e recomenda ações corretivas.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={askAxiaImpact}
            disabled={axiaLoading}
            className="text-xs border-[#00679d]/30 text-[#00679d] hover:bg-[#00679d]/10"
          >
            {axiaLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
            {axiaLoading ? 'A analisar...' : 'Analisar impacto com Axia™'}
          </Button>
          {axiaInsight && (
            <div className="mt-2 p-3 rounded-md bg-background border text-xs whitespace-pre-wrap leading-relaxed">
              {axiaInsight}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
