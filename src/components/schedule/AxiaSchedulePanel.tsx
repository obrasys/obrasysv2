import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BrainCircuit,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lightbulb,
  RefreshCw,
  Sparkles,
  GitBranch,
  Zap,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { ScheduleTask, ScheduleDependency } from '@/types/schedule';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  obraId: string;
  obraNome: string;
  tasks: ScheduleTask[];
  dependencies: ScheduleDependency[];
  hasBaseline: boolean;
}

type AnalysisType = 'health' | 'suggestions' | 'conflicts' | 'optimization';

export function AxiaSchedulePanel({ obraId, obraNome, tasks, dependencies, hasBaseline }: Props) {
  const [analysisType, setAnalysisType] = useState<AnalysisType | null>(null);
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [response]);

  const buildContext = () => {
    const delayed = tasks.filter(t => {
      if (!t.planned_end || !t.forecast_end) return false;
      return new Date(t.forecast_end) > new Date(t.planned_end);
    });

    const completed = tasks.filter(t => t.status_flag === 'completed');
    const inProgress = tasks.filter(t => t.status_flag === 'in_progress' || t.status_flag === 'started');
    const notStarted = tasks.filter(t => t.status_flag === 'not_started');
    const suspended = tasks.filter(t => t.status_flag === 'suspended');

    const totalWeight = tasks.reduce((s, t) => s + (t.weight_financial ?? t.weight_physical ?? 1), 0);
    const weightedActual = tasks.reduce((s, t) => {
      const w = t.weight_financial ?? t.weight_physical ?? 1;
      return s + (t.actual_progress_percent * w);
    }, 0);
    const weightedPlanned = tasks.reduce((s, t) => {
      const w = t.weight_financial ?? t.weight_physical ?? 1;
      return s + (t.planned_progress_percent * w);
    }, 0);

    const globalActual = totalWeight > 0 ? (weightedActual / totalWeight).toFixed(1) : '0';
    const globalPlanned = totalWeight > 0 ? (weightedPlanned / totalWeight).toFixed(1) : '0';

    return `
OBRA: "${obraNome}" (ID: ${obraId})
BASELINE: ${hasBaseline ? 'Aprovada' : 'Pendente'}
TOTAL DE TAREFAS: ${tasks.length}
PROGRESSO GLOBAL: Planeado ${globalPlanned}% | Real ${globalActual}%

ESTADO DAS TAREFAS:
- Concluídas: ${completed.length}
- Em curso: ${inProgress.length}
- Não iniciadas: ${notStarted.length}
- Suspensas: ${suspended.length}
- Atrasadas: ${delayed.length}

TAREFAS DETALHADAS:
${tasks.map(t => {
  const delay = t.planned_end && t.forecast_end
    ? Math.max(0, Math.ceil((new Date(t.forecast_end).getTime() - new Date(t.planned_end).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  return `- [${t.wbs_code || '-'}] "${t.name}" | Tipo: ${t.task_type} | Estado: ${t.status_flag} | Planeado: ${t.planned_progress_percent}% | Real: ${t.actual_progress_percent}% | Início: ${t.planned_start || 'N/D'} | Fim planeado: ${t.planned_end || 'N/D'} | Fim previsto: ${t.forecast_end || 'N/D'} | Atraso: ${delay}d | Classificação: ${t.delay_classification || 'N/A'} | Criticidade: ${t.criticality} | Peso: ${t.weight_financial ?? t.weight_physical ?? 1}`;
}).join('\n')}

DEPENDÊNCIAS (${dependencies.length}):
${dependencies.map(d => {
  const pred = tasks.find(t => t.id === d.predecessor_task_id);
  const succ = tasks.find(t => t.id === d.successor_task_id);
  return `- "${pred?.name || '?'}" → "${succ?.name || '?'}" (${d.dependency_type}, lag: ${d.lag_days}d)`;
}).join('\n')}
`.trim();
  };

  const prompts: Record<AnalysisType, string> = {
    health: `Analisa a saúde global do cronograma desta obra. Avalia:
1. O desvio entre progresso planeado vs real
2. Tarefas em atraso e o seu impacto no caminho crítico
3. Tarefas suspensas e riscos associados
4. Previsão de conclusão
Termina com um resumo de saúde (🟢 Saudável / 🟡 Em risco / 🔴 Crítico) e 2-3 recomendações prioritárias.`,

    suggestions: `Com base no estado atual do cronograma, sugere melhorias específicas:
1. Tarefas que podem ser paralelizadas para ganhar tempo
2. Durações que parecem subestimadas ou sobreestimadas
3. Dependências em falta que deveriam existir
4. Pesos financeiros que podem estar desalinhados
5. Novas sub-tarefas que podem ajudar no controlo
Sê específico com nomes de tarefas e valores concretos.`,

    conflicts: `Analisa potenciais conflitos e riscos no cronograma:
1. Dependências circulares ou em cadeia que amplificam atrasos
2. Tarefas com folga zero no caminho crítico
3. Sobreposições problemáticas
4. Tarefas sem dependências que deveriam tê-las
5. Recursos que podem estar sobrecarregados (baseado nas datas)
Lista cada conflito com severidade (🔴 Alto / 🟡 Médio / 🟢 Baixo).`,

    optimization: `Propõe um plano de otimização para recuperar atrasos:
1. Identifica as tarefas mais impactantes se aceleradas
2. Propõe compressão de durações com justificação
3. Sugere resequenciamento possível
4. Calcula o ganho estimado em dias para cada ação
Apresenta como tabela com: Ação | Tarefa | Ganho (dias) | Risco.`,
  };

  const runAnalysis = async (type: AnalysisType) => {
    setAnalysisType(type);
    setResponse('');
    setIsStreaming(true);

    const context = buildContext();
    const prompt = `${prompts[type]}\n\nCONTEXTO DO CRONOGRAMA:\n${context}`;

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const resp = await fetch(`${supabaseUrl}/functions/v1/axia-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: prompt, history: [] }),
      });

      if (!resp.ok || !resp.body) throw new Error('Erro na análise');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setResponse(accumulated);
            }
          } catch { /* partial */ }
        }
      }
    } catch (err) {
      setResponse('❌ Erro ao processar análise. Tente novamente.');
      console.error(err);
    } finally {
      setIsStreaming(false);
    }
  };

  const analysisButtons: { type: AnalysisType; icon: React.ReactNode; label: string; color: string }[] = [
    { type: 'health', icon: <Sparkles className="h-3.5 w-3.5" />, label: 'Saúde Global', color: 'text-cyan-700 bg-cyan-50 border-cyan-200 hover:bg-cyan-100' },
    { type: 'suggestions', icon: <Lightbulb className="h-3.5 w-3.5" />, label: 'Sugestões', color: 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100' },
    { type: 'conflicts', icon: <AlertTriangle className="h-3.5 w-3.5" />, label: 'Conflitos', color: 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100' },
    { type: 'optimization', icon: <Zap className="h-3.5 w-3.5" />, label: 'Otimização', color: 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100' },
  ];

  // Quick stats
  const delayed = tasks.filter(t => {
    if (!t.planned_end) return false;
    const end = t.forecast_end || t.actual_end;
    if (!end) return false;
    return new Date(end) > new Date(t.planned_end);
  });
  const critical = tasks.filter(t => t.criticality === 'critical');
  const suspended = tasks.filter(t => t.status_flag === 'suspended');

  return (
    <Card className="border-[hsl(var(--accent))]/20 bg-gradient-to-br from-background to-accent/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-[#00679d]" />
          <span className="text-[#00679d] font-bold">Axia™</span>
          <span className="text-muted-foreground font-normal">· Assistente de Cronograma</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick health indicators */}
        <div className="flex flex-wrap gap-2">
          {delayed.length > 0 && (
            <Badge variant="outline" className="text-[10px] border-amber-300 bg-amber-50 text-amber-700">
              <Clock className="h-3 w-3 mr-1" />
              {delayed.length} atrasada{delayed.length !== 1 ? 's' : ''}
            </Badge>
          )}
          {critical.length > 0 && (
            <Badge variant="outline" className="text-[10px] border-red-300 bg-red-50 text-red-700">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {critical.length} caminho crítico
            </Badge>
          )}
          {suspended.length > 0 && (
            <Badge variant="outline" className="text-[10px] border-red-300 bg-red-50 text-red-700">
              {suspended.length} bloqueada{suspended.length !== 1 ? 's' : ''}
            </Badge>
          )}
          {delayed.length === 0 && suspended.length === 0 && (
            <Badge variant="outline" className="text-[10px] border-green-300 bg-green-50 text-green-700">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Sem alertas
            </Badge>
          )}
        </div>

        {/* Analysis buttons */}
        <div className="grid grid-cols-2 gap-2">
          {analysisButtons.map(btn => (
            <Button
              key={btn.type}
              variant="outline"
              size="sm"
              className={`text-xs justify-start gap-1.5 ${btn.color} ${analysisType === btn.type ? 'ring-1 ring-offset-1' : ''}`}
              onClick={() => runAnalysis(btn.type)}
              disabled={isStreaming}
            >
              {isStreaming && analysisType === btn.type ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : btn.icon}
              {btn.label}
            </Button>
          ))}
        </div>

        {/* Response area */}
        {(response || isStreaming) && (
          <>
            <Separator />
            <div ref={scrollRef} className="max-h-[400px] overflow-y-auto">
              <div className="prose prose-sm max-w-none text-foreground [&_table]:text-xs [&_th]:p-1.5 [&_td]:p-1.5 [&_li]:my-0.5">
                <ReactMarkdown>{response || '⏳ A analisar...'}</ReactMarkdown>
              </div>
              {isStreaming && (
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Axia™ a processar...
                </div>
              )}
            </div>
          </>
        )}

        {!response && !isStreaming && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Selecione uma análise para a Axia™ avaliar o cronograma.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
