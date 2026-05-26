import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  GitBranch,
  BrainCircuit,
  Loader2,
  TrendingDown,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { ScheduleTask, ScheduleDependency } from '@/types/schedule';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  tasks: ScheduleTask[];
  dependencies: ScheduleDependency[];
  obraNome: string;
}

interface DelayedTask extends ScheduleTask {
  delayDays: number;
  impactedSuccessors: string[];
}

export function DeviationExplainerCard({ tasks, dependencies, obraNome }: Props) {
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [aiExplanation, setAiExplanation] = useState<Record<string, string>>({});
  const [loadingTask, setLoadingTask] = useState<string | null>(null);

  // Find delayed tasks with impact analysis
  const delayedTasks: DelayedTask[] = tasks
    .filter(t => {
      if (!t.planned_end) return false;
      const end = t.forecast_end || t.actual_end;
      if (!end) return false;
      return new Date(end) > new Date(t.planned_end);
    })
    .map(t => {
      const end = t.forecast_end || t.actual_end || t.planned_end!;
      const delayDays = Math.ceil(
        (new Date(end).getTime() - new Date(t.planned_end!).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Find successor tasks impacted
      const successorDeps = dependencies.filter(d => d.predecessor_task_id === t.id);
      const impactedSuccessors = successorDeps
        .map(d => tasks.find(task => task.id === d.successor_task_id)?.name)
        .filter(Boolean) as string[];

      return { ...t, delayDays, impactedSuccessors };
    })
    .sort((a, b) => b.delayDays - a.delayDays);

  const classificationConfig: Record<string, { label: string; icon: React.ReactNode; className: string; description: string }> = {
    recoverable: {
      label: 'Recuperável',
      icon: <RotateCcw className="h-3 w-3" />,
      className: 'border-amber-300 bg-amber-50 text-amber-800',
      description: 'Atraso menor que pode ser absorvido com ajustes de produtividade',
    },
    structural: {
      label: 'Estrutural',
      icon: <ShieldAlert className="h-3 w-3" />,
      className: 'border-orange-300 bg-orange-50 text-orange-800',
      description: 'Atraso significativo que afeta o planeamento mas não inviabiliza o prazo final',
    },
    critical: {
      label: 'Crítico',
      icon: <AlertTriangle className="h-3 w-3" />,
      className: 'border-red-300 bg-red-50 text-red-800',
      description: 'Atraso grave no caminho crítico que impacta a data de conclusão da obra',
    },
  };

  const explainDeviation = async (task: DelayedTask) => {
    if (aiExplanation[task.id]) return; // Already have explanation

    setLoadingTask(task.id);
    setExpandedTask(task.id);

    const prompt = `Explica brevemente o desvio da tarefa "${task.name}" no cronograma da obra "${obraNome}":
- Atraso: ${task.delayDays} dias
- Classificação: ${task.delay_classification || 'N/A'}
- Progresso planeado: ${task.planned_progress_percent}% vs Real: ${task.actual_progress_percent}%
- Início planeado: ${task.planned_start || 'N/D'} | Início real: ${task.actual_start || 'N/D'}
- Fim planeado: ${task.planned_end || 'N/D'} | Fim previsto: ${task.forecast_end || 'N/D'}
- Criticidade: ${task.criticality}
- Tarefas impactadas: ${task.impactedSuccessors.length > 0 ? task.impactedSuccessors.join(', ') : 'Nenhuma'}

Responde com:
1. **Causa provável** (1-2 frases)
2. **Impacto em cadeia** — como afeta tarefas sucessoras
3. **Ação recomendada** — 1 ação concreta para mitigar`;

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sessão expirada');
      const resp = await fetch(`${supabaseUrl}/functions/v1/axia-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ question: prompt, history: [] }),
      });

      if (!resp.ok || !resp.body) throw new Error('Erro');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setAiExplanation(prev => ({ ...prev, [task.id]: accumulated }));
            }
          } catch { /* partial */ }
        }
      }
    } catch {
      setAiExplanation(prev => ({ ...prev, [task.id]: '❌ Erro ao gerar explicação.' }));
    } finally {
      setLoadingTask(null);
    }
  };

  if (delayedTasks.length === 0) {
    return null; // Don't show card if no delays
  }

  return (
    <Card className="border-amber-200/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-amber-600" />
          Desvios Detetados
          <Badge variant="outline" className="ml-auto text-[10px] border-amber-300 bg-amber-50 text-amber-700">
            {delayedTasks.length} tarefa{delayedTasks.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {delayedTasks.map(task => {
          const config = task.delay_classification
            ? classificationConfig[task.delay_classification]
            : null;

          return (
            <Collapsible
              key={task.id}
              open={expandedTask === task.id}
              onOpenChange={(open) => setExpandedTask(open ? task.id : null)}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
                  {expandedTask === task.id ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  
                  <span className="text-sm font-medium truncate flex-1">{task.name}</span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Delay badge */}
                    <Badge variant="destructive" className="text-[10px]">
                      <Clock className="h-2.5 w-2.5 mr-0.5" />
                      {task.delayDays}d
                    </Badge>

                    {/* Classification badge */}
                    {config && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className={`text-[10px] gap-0.5 ${config.className}`}>
                              {config.icon}
                              {config.label}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px]">
                            <p className="text-xs">{config.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    {/* Critical path badge */}
                    {task.criticality === 'critical' && (
                      <Badge variant="outline" className="text-[10px] border-red-300 bg-red-50 text-red-700">
                        <GitBranch className="h-2.5 w-2.5 mr-0.5" />
                        Crítico
                      </Badge>
                    )}

                    {/* Impact count */}
                    {task.impactedSuccessors.length > 0 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="text-[10px]">
                              →{task.impactedSuccessors.length}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs font-medium mb-1">Tarefas impactadas:</p>
                            {task.impactedSuccessors.map((name, i) => (
                              <p key={i} className="text-xs">• {name}</p>
                            ))}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="ml-6 p-3 bg-muted/30 rounded-md space-y-3">
                  {/* Task details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Progresso</span>
                      <p className="font-medium">{task.actual_progress_percent}% / {task.planned_progress_percent}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Início</span>
                      <p className="font-medium">{task.actual_start || task.planned_start || 'N/D'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fim previsto</span>
                      <p className="font-medium text-amber-600">{task.forecast_end || task.planned_end || 'N/D'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duração restante</span>
                      <p className="font-medium">{task.remaining_duration_days ?? 'N/D'} dias</p>
                    </div>
                  </div>

                  {/* AI explanation */}
                  {aiExplanation[task.id] ? (
                    <div className="prose prose-sm max-w-none text-foreground text-xs [&_p]:my-1 [&_li]:my-0.5 [&_strong]:text-foreground">
                      <ReactMarkdown>{aiExplanation[task.id]}</ReactMarkdown>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1.5 text-[#00679d] border-[#00679d]/20 hover:bg-[#00679d]/5"
                      onClick={() => explainDeviation(task)}
                      disabled={loadingTask === task.id}
                    >
                      {loadingTask === task.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <BrainCircuit className="h-3 w-3" />
                      )}
                      Explicar desvio com Axia™
                    </Button>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
