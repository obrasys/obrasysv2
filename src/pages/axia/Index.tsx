import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { AppLayout } from '@/components/layout';
import { PageHeader, MetricCardGrid, MetricCard } from '@/components/patterns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2, AlertTriangle, TrendingDown, PackageMinus, CheckCircle, XCircle,
  Clock, Brain, Zap, MessageSquare, ShieldAlert, CalendarClock, Search as SearchIcon,
  Lightbulb, Eye, BarChart3, ArrowUpRight, ArrowDownRight, Activity,
  HardHat, Send, Sparkles, ChevronRight, FileWarning, Target, User, Bot, Eraser,
  RefreshCw,
} from 'lucide-react';
import { AxiaIcon } from '@/components/axia/AxiaIcon';
import { useAxiaDashboard } from '@/hooks/useAxiaDashboard';
import type { AxiaSugestao, AxiaAlertaOrcamento, AxiaAlertaPrazo, AxiaInconsistencia, AxiaPrevisaoDesvio, AxiaInsightObra } from '@/hooks/useAxiaDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

/* ── Types ─────────────────────────────────────────────── */
type ChatMessage = { role: 'user' | 'assistant'; content: string };

/* ── Stream helper ─────────────────────────────────────── */
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/axia-chat`;

async function streamAxiaChat({
  question, history, token, onDelta, onDone, onError,
}: {
  question: string; history: ChatMessage[]; token: string;
  onDelta: (t: string) => void; onDone: () => void; onError: (msg: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ question, history }),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({ error: 'Erro de rede' }));
    onError(body.error || `Erro ${resp.status}`);
    return;
  }

  if (!resp.body) { onError('Sem resposta'); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buf.indexOf('\n')) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (json === '[DONE]') { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buf = line + '\n' + buf;
        break;
      }
    }
  }
  onDone();
}

/* ── Score Ring ─────────────────────────────────────────── */
function ScoreRing({ score }: { score: number }) {
  const r = 50, c = 2 * Math.PI * r, off = c - (score / 100) * c;
  const color = score >= 75 ? 'hsl(160 84% 39%)' : score >= 50 ? 'hsl(38 92% 50%)' : 'hsl(0 84% 60%)';
  return (
    <div className="relative w-28 h-28">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="7" />
        <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-widest">Score</span>
      </div>
    </div>
  );
}

/* ── Section wrapper ───────────────────────────────────── */
function Section({ icon: Icon, title, description, children, accentClass = 'bg-primary/10 text-primary' }: {
  icon: React.ElementType; title: string; description?: string; children: React.ReactNode; accentClass?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accentClass}`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            {description && <CardDescription className="text-xs">{description}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

/* ── Loading skeleton for sections ─────────────────────── */
function SectionSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ── Empty state ───────────────────────────────────────── */
function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-6">
      <CheckCircle className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/* ── Quick question chips ──────────────────────────────── */
const QUICK_QUESTIONS = [
  'Qual a obra com maior risco?',
  'Tenho algum orçamento abaixo da margem?',
  'Quais são os desvios do mês?',
  'Resumo de alertas ativos',
  'Qual a previsão de faturação?',
  'Há itens em falta nos orçamentos?',
];

/* ── Priority helpers ──────────────────────────────────── */
function priorityConfig(p: string) {
  switch (p) {
    case 'critical': return { label: 'Crítico', class: 'bg-red-500/10 text-red-600', icon: AlertTriangle, iconClass: 'bg-red-500/10 text-red-500' };
    case 'high': return { label: 'Alto', class: 'bg-amber-500/10 text-amber-600', icon: TrendingDown, iconClass: 'bg-amber-500/10 text-amber-600' };
    case 'medium': return { label: 'Médio', class: 'bg-primary/10 text-primary', icon: Lightbulb, iconClass: 'bg-primary/10 text-primary' };
    default: return { label: 'Baixo', class: 'bg-emerald-500/10 text-emerald-600', icon: Sparkles, iconClass: 'bg-emerald-500/10 text-emerald-600' };
  }
}

function severityConfig(s: string) {
  switch (s) {
    case 'critical': return { label: 'Crítico', icon: AlertTriangle, iconClass: 'bg-red-500/10 text-red-500' };
    case 'warn': return { label: 'Aviso', icon: TrendingDown, iconClass: 'bg-amber-500/10 text-amber-600' };
    default: return { label: 'Info', icon: Eye, iconClass: 'bg-primary/10 text-primary' };
  }
}

function insightTipoConfig(tipo: string) {
  switch (tipo) {
    case 'positivo': return { icon: CheckCircle, iconClass: 'bg-emerald-500/10 text-emerald-500' };
    case 'custo': return { icon: AlertTriangle, iconClass: 'bg-amber-500/10 text-amber-500' };
    case 'risco': return { icon: ShieldAlert, iconClass: 'bg-red-500/10 text-red-500' };
    case 'prazo': return { icon: CalendarClock, iconClass: 'bg-orange-500/10 text-orange-500' };
    default: return { icon: Target, iconClass: 'bg-primary/10 text-primary' };
  }
}

/* ── Main Page ─────────────────────────────────────────── */
export default function AxiaPage() {
  const { data, isLoading, analysis, analysisLoading, refetchAnalysis } = useAxiaDashboard();
  const { session } = useAuth();
  const { toast } = useToast();
  const [question, setQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSend = useCallback(async (text?: string) => {
    const q = (text || question).trim();
    if (!q || isStreaming) return;
    if (!session?.access_token) {
      toast({ title: 'Sessão expirada', description: 'Faça login novamente.', variant: 'destructive' });
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: q };
    setChatMessages(prev => [...prev, userMsg]);
    setQuestion('');
    setIsStreaming(true);

    let assistantSoFar = '';
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setChatMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      await streamAxiaChat({
        question: q,
        history: chatMessages,
        token: session.access_token,
        onDelta: upsert,
        onDone: () => setIsStreaming(false),
        onError: (msg) => {
          toast({ title: 'Erro Axia', description: msg, variant: 'destructive' });
          setIsStreaming(false);
        },
      });
    } catch {
      toast({ title: 'Erro', description: 'Falha ao contactar a Axia.', variant: 'destructive' });
      setIsStreaming(false);
    }
  }, [question, isStreaming, session, chatMessages, toast]);

  if (isLoading) {
    return (
      <AppLayout title="Axia IA">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const d = data || {
    score: 100, totalInsights: 0, openInsights: 0, appliedInsights: 0, dismissedInsights: 0,
    criticalCount: 0, warnCount: 0, missingCount: 0, outlierCount: 0, marginCount: 0,
    actionHistory: [],
  };

  const a = analysis;

  return (
    <AppLayout
      title="Axia IA"
      subtitle="Central de Inteligência Operacional"
    >
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
        <PageHeader
          eyebrow="Inteligência"
          title="Axia IA"
          subtitle="Central de Inteligência Operacional — monitorização preditiva de obras, orçamentos e prazos"
          actions={
            <Button variant="outline" size="sm" onClick={() => refetchAnalysis()} disabled={analysisLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${analysisLoading ? 'animate-spin' : ''}`} />
              Atualizar análise
            </Button>
          }
        />


        {/* ═══ HERO ═══ */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/[0.03] rounded-full -translate-y-1/2 translate-x-1/3" />
          <CardContent className="pt-6 pb-5 relative">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1 space-y-3 text-center md:text-left">
                <div className="flex items-center gap-2.5 justify-center md:justify-start">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Central de Inteligência</h2>
                    <p className="text-xs text-muted-foreground">Powered by Axia™</p>
                  </div>
                </div>
                {a?.resumo_executivo ? (
                  <p className="text-sm text-muted-foreground max-w-lg">{a.resumo_executivo}</p>
                ) : (
                  <p className="text-sm text-muted-foreground max-w-lg">
                    Monitorização inteligente de obras, orçamentos e prazos. A Axia analisa dados em tempo real, 
                    identifica riscos e sugere ações para proteger a sua margem e eficiência operacional.
                  </p>
                )}
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                    <Activity className="w-3 h-3 mr-1" /> {d.totalInsights} insights gerados
                  </Badge>
                  <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600">
                    <CheckCircle className="w-3 h-3 mr-1" /> {d.appliedInsights} aplicados
                  </Badge>
                  <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600">
                    <AlertTriangle className="w-3 h-3 mr-1" /> {d.openInsights} pendentes
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={() => refetchAnalysis()} disabled={analysisLoading}>
                    <RefreshCw className={`w-3 h-3 mr-1 ${analysisLoading ? 'animate-spin' : ''}`} /> Atualizar análise
                  </Button>
                </div>
              </div>
              <ScoreRing score={d.score} />
            </div>
          </CardContent>
        </Card>

        {/* ═══ KPI STRIP ═══ */}
        <MetricCardGrid columns={4}>
          <MetricCard label="Itens Críticos" value={d.criticalCount} icon={AlertTriangle} tone="destructive" />
          <MetricCard label="Desvios de Preço" value={d.outlierCount} icon={TrendingDown} tone="warning" />
          <MetricCard label="Itens em Falta" value={d.missingCount} icon={PackageMinus} tone="primary" />
          <MetricCard label="Risco de Margem" value={d.marginCount} icon={ShieldAlert} tone="warning" />
        </MetricCardGrid>

        {/* ═══ 1. PERGUNTAS RÁPIDAS (CHAT) ═══ */}
        <Section icon={MessageSquare} title="Perguntas Rápidas" description="Faça perguntas sobre os seus dados operacionais"
          accentClass="bg-primary/10 text-primary">
          <div className="space-y-3">
            {chatMessages.length > 0 && (
              <div ref={chatContainerRef} className="max-h-[360px] overflow-y-auto pr-2 space-y-3">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div className={`rounded-xl px-3.5 py-2.5 max-w-[85%] text-sm ${
                      msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1.5 [&>ul]:mt-1 [&>ol]:mt-1">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isStreaming && chatMessages[chatMessages.length - 1]?.role === 'user' && (
                  <div className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-xl px-3.5 py-2.5">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Pergunte algo à Axia..."
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  className="pl-10"
                  disabled={isStreaming}
                />
              </div>
              {chatMessages.length > 0 && (
                <Button variant="outline" size="icon" className="shrink-0" onClick={() => setChatMessages([])}
                  disabled={isStreaming} title="Limpar conversa">
                  <Eraser className="w-4 h-4" />
                </Button>
              )}
              <Button size="icon" className="shrink-0" onClick={() => handleSend()} disabled={isStreaming || !question.trim()}>
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>

            {chatMessages.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {QUICK_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    className="text-xs px-3 py-1.5 rounded-full border border-primary/20 text-primary hover:bg-primary/5 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* ═══ 2 + 3. SUGESTÕES + ALERTAS ORÇAMENTO ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section icon={Sparkles} title="Sugestões Automáticas" description="Ações sugeridas pela IA com base nos seus dados reais"
            accentClass="bg-amber-500/10 text-amber-600">
            {analysisLoading ? <SectionSkeleton /> : (
              a?.sugestoes && a.sugestoes.length > 0 ? (
                <div className="space-y-0.5">
                  {a.sugestoes.map((s, i) => {
                    const cfg = priorityConfig(s.priority);
                    return (
                      <div key={i} className="flex items-center gap-3 py-2.5 border-b last:border-0 border-border/50">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconClass}`}>
                          <cfg.icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{s.label}</p>
                          <p className="text-xs text-muted-foreground">{s.detail}</p>
                        </div>
                        <Badge variant="secondary" className="font-semibold text-xs shrink-0">{cfg.label}</Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState message="Nenhuma sugestão ativa. Os seus dados estão otimizados." />
              )
            )}
          </Section>

          <Section icon={FileWarning} title="Alertas de Orçamento" description="Riscos identificados nos orçamentos ativos"
            accentClass="bg-red-500/10 text-red-500">
            {analysisLoading ? <SectionSkeleton /> : (
              a?.alertas_orcamento && a.alertas_orcamento.length > 0 ? (
                <div className="space-y-0.5">
                  {a.alertas_orcamento.map((al, i) => {
                    const cfg = severityConfig(al.severity);
                    return (
                      <div key={i} className="flex items-center gap-3 py-2.5 border-b last:border-0 border-border/50">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconClass}`}>
                          <cfg.icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{al.label}</p>
                          <p className="text-xs text-muted-foreground">{al.detail}</p>
                        </div>
                        <Badge variant={al.severity === 'critical' ? 'destructive' : 'secondary'} className="font-semibold text-xs shrink-0">
                          {cfg.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState message="Nenhum alerta de orçamento. Tudo em ordem." />
              )
            )}
          </Section>
        </div>

        {/* ═══ 4 + 5. ALERTAS PRAZO + INCONSISTÊNCIAS ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section icon={CalendarClock} title="Alertas de Prazo" description="Obras com desvios de cronograma detectados"
            accentClass="bg-orange-500/10 text-orange-600">
            {analysisLoading ? <SectionSkeleton /> : (
              a?.alertas_prazo && a.alertas_prazo.length > 0 ? (
                <div className="space-y-2.5">
                  {a.alertas_prazo.map((ap, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0 border-border/50">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ap.tipo === 'atraso' ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                        {ap.tipo === 'atraso'
                          ? <ArrowUpRight className="w-4 h-4 text-red-500" />
                          : <ArrowDownRight className="w-4 h-4 text-emerald-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ap.obra}</p>
                        <p className="text-xs text-muted-foreground">
                          {ap.tipo === 'atraso' ? `${ap.dias} dias de atraso` : `${Math.abs(ap.dias)} dias adiantado`}
                          {ap.detail ? ` - ${ap.detail}` : ''}
                        </p>
                      </div>
                      <Badge variant={ap.tipo === 'atraso' ? 'destructive' : 'secondary'} className="text-xs shrink-0">
                        {ap.tipo === 'atraso' ? 'Atraso' : 'Adiantado'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="Nenhum desvio de prazo detetado. Cronogramas dentro do esperado." />
              )
            )}
          </Section>

          <Section icon={SearchIcon} title="Inconsistências Detectadas" description="Erros e anomalias encontrados nos dados"
            accentClass="bg-rose-500/10 text-rose-600">
            {analysisLoading ? <SectionSkeleton /> : (
              a?.inconsistencias && a.inconsistencias.length > 0 ? (
                <div className="space-y-2.5">
                  {a.inconsistencias.map((inc, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0 border-border/50">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <XCircle className="w-4 h-4 text-rose-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{inc.desc}</p>
                        <Badge variant="outline" className="text-[10px] mt-1">{inc.tipo}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="Nenhuma inconsistência detetada nos dados." />
              )
            )}
          </Section>
        </div>

        {/* ═══ 6 + 7. PREVISÃO DESVIOS + INSIGHTS OBRA ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section icon={BarChart3} title="Previsão de Desvios" description="Estimativa de desvios financeiros por obra"
            accentClass="bg-indigo-500/10 text-indigo-600">
            {analysisLoading ? <SectionSkeleton /> : (
              a?.previsao_desvios && a.previsao_desvios.length > 0 ? (
                <div className="space-y-3">
                  {a.previsao_desvios.map((p, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate mr-2">{p.obra}</span>
                        <span className={`text-xs font-semibold whitespace-nowrap ${p.desvio_percent > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                          {p.desvio_percent > 0 ? '+' : ''}{p.desvio_percent.toFixed(1)}%
                          <span className="text-muted-foreground font-normal ml-1">
                            ({p.valor > 0 ? '+' : ''}€{Math.abs(p.valor).toLocaleString('pt-PT')})
                          </span>
                        </span>
                      </div>
                      {p.detail && <p className="text-xs text-muted-foreground">{p.detail}</p>}
                      <Progress
                        value={Math.min(Math.abs(p.desvio_percent) * 5, 100)}
                        className={`h-1.5 ${p.desvio_percent > 0 ? '[&>div]:bg-red-500' : '[&>div]:bg-emerald-500'}`}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="Sem desvios financeiros significativos." />
              )
            )}
          </Section>

          <Section icon={HardHat} title="Insights da Obra" description="Observações inteligentes sobre as obras ativas"
            accentClass="bg-teal-500/10 text-teal-600">
            {analysisLoading ? <SectionSkeleton /> : (
              a?.insights_obra && a.insights_obra.length > 0 ? (
                <div className="space-y-2.5">
                  {a.insights_obra.map((ins, i) => {
                    const cfg = insightTipoConfig(ins.tipo);
                    return (
                      <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0 border-border/50">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${cfg.iconClass}`}>
                          <cfg.icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-muted-foreground">{ins.obra}</p>
                          <p className="text-sm mt-0.5">{ins.insight}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState message="Sem insights adicionais para as obras ativas." />
              )
            )}
          </Section>
        </div>

        {/* ═══ 8. ASSISTENTE CONTEXTUAL + HISTÓRICO ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section icon={Zap} title="Assistente Contextual" description="Ações rápidas baseadas no contexto atual"
            accentClass="bg-primary/10 text-primary">
            <div className="space-y-2">
              {[
                { label: 'Gerar relatório de desvios do mês', question: 'Gera um relatório completo dos desvios financeiros e de prazo deste mês, por obra.' },
                { label: 'Verificar orçamentos sem aprovação', question: 'Quais orçamentos estão em rascunho há mais de 7 dias sem aprovação? Lista-os com valores e clientes.' },
                { label: 'Analisar produtividade da equipa', question: 'Analisa a produtividade da equipa nas obras ativas. Há trabalhadores sem obra alocada? Que obras precisam de mais recursos?' },
                { label: 'Comparar custos reais vs. previstos', question: 'Compara os custos reais das obras em curso com os valores previstos. Quais obras estão acima do orçamento?' },
                { label: 'Resumo semanal para a direção', question: 'Gera um resumo executivo semanal para a direção com: estado das obras, orçamentos pendentes, riscos financeiros e prazos em risco.' },
                { label: 'Identificar oportunidades de poupança', question: 'Com base nos dados dos orçamentos e obras, identifica oportunidades concretas de redução de custos ou otimização de recursos.' },
              ].map((action, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(action.question)}
                  disabled={isStreaming}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/60 hover:border-primary/30 hover:bg-primary/[0.03] transition-all text-left group disabled:opacity-50"
                >
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    {i === 0 ? <BarChart3 className="w-3.5 h-3.5 text-primary" /> :
                     i === 1 ? <FileWarning className="w-3.5 h-3.5 text-primary" /> :
                     i === 2 ? <Activity className="w-3.5 h-3.5 text-primary" /> :
                     i === 3 ? <TrendingDown className="w-3.5 h-3.5 text-primary" /> :
                     i === 4 ? <Brain className="w-3.5 h-3.5 text-primary" /> :
                     <Lightbulb className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <span className="text-sm flex-1">{action.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          </Section>

          <Section icon={Clock} title="Histórico de Decisões" description="Ações aplicadas e decisões registadas pela Axia"
            accentClass="bg-slate-500/10 text-slate-600">
            {d.actionHistory.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Nenhuma ação registada ainda.</p>
                <p className="text-xs text-muted-foreground mt-1">Analise um orçamento para começar.</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {d.actionHistory.slice(0, 5).map((action) => (
                  <div key={action.id} className="flex items-start gap-3 py-2.5 border-b last:border-0 border-border/50">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      action.action === 'apply' ? 'bg-emerald-500/10' : 'bg-muted'
                    }`}>
                      {action.action === 'apply'
                        ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                        : <XCircle className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {action.action === 'apply' ? 'Sugestão aplicada' : 'Sugestão ignorada'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(action.created_at), "dd MMM yyyy 'às' HH:mm", { locale: pt })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

      </div>
    </AppLayout>
  );
}
