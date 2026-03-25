import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2, AlertTriangle, TrendingDown, PackageMinus, CheckCircle, XCircle,
  Clock, Brain, Zap, MessageSquare, ShieldAlert, CalendarClock, Search as SearchIcon,
  Lightbulb, Eye, BarChart3, ArrowUpRight, ArrowDownRight, Activity,
  HardHat, Send, Sparkles, ChevronRight, FileWarning, Target, User, Bot, Eraser,
} from 'lucide-react';
import { AxiaIcon } from '@/components/axia/AxiaIcon';
import { useAxiaDashboard } from '@/hooks/useAxiaDashboard';
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

/* ── Insight item row ──────────────────────────────────── */
function InsightRow({ icon: Icon, iconClass, label, value, sub }: {
  icon: React.ElementType; iconClass: string; label: string; value: string | number; sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0 border-border/50">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      <Badge variant="secondary" className="font-semibold text-xs shrink-0">{value}</Badge>
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

/* ── Simulated data for demo sections ──────────────────── */
const MOCK_ALERTS_PRAZO = [
  { obra: 'Remodelação T3 Cascais', dias: 5, tipo: 'atraso' as const },
  { obra: 'Reabilitação Almada', dias: 12, tipo: 'atraso' as const },
  { obra: 'Instalação Solar Oeiras', dias: -3, tipo: 'adiantado' as const },
];

const MOCK_INCONSISTENCIAS = [
  { desc: 'Artigo "Tinta Vinílica" com preço 40% acima da média', tipo: 'preço' },
  { desc: 'Quantidade de betão C25/30 duplicada no cap. 3', tipo: 'duplicado' },
  { desc: 'Unidade "ml" usada onde deveria ser "m²"', tipo: 'unidade' },
];

const MOCK_PREVISOES = [
  { obra: 'T3 Cascais', desvioPercent: 12, valor: 4800 },
  { obra: 'Loft Chiado', desvioPercent: -3, valor: -1200 },
  { obra: 'Moradia Sintra', desvioPercent: 8, valor: 6400 },
];

const MOCK_INSIGHTS_OBRA = [
  { obra: 'T3 Cascais', insight: 'Produtividade 15% abaixo da média nas últimas 2 semanas', tipo: 'produtividade' },
  { obra: 'Almada', insight: 'Custo de mão-de-obra excedeu previsão em 8%', tipo: 'custo' },
  { obra: 'Oeiras', insight: 'Obra com maior progresso do mês (92%)', tipo: 'positivo' },
];

/* ── Main Page ─────────────────────────────────────────── */
export default function AxiaPage() {
  const { data, isLoading } = useAxiaDashboard();
  const { session } = useAuth();
  const { toast } = useToast();
  const [question, setQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  return (
    <AppLayout
      title="Axia IA"
      subtitle="Central de Inteligência Operacional"
    >
      <div className="p-4 md:p-6 space-y-6">

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
                <p className="text-sm text-muted-foreground max-w-lg">
                  Monitorização inteligente de obras, orçamentos e prazos. A Axia analisa dados em tempo real, 
                  identifica riscos e sugere ações para proteger a sua margem e eficiência operacional.
                </p>
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
                </div>
              </div>
              <ScoreRing score={d.score} />
            </div>
          </CardContent>
        </Card>

        {/* ═══ KPI STRIP ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: AlertTriangle, label: 'Itens Críticos', value: d.criticalCount, bg: 'bg-red-500/10', ic: 'text-red-500' },
            { icon: TrendingDown, label: 'Desvios de Preço', value: d.outlierCount, bg: 'bg-amber-500/10', ic: 'text-amber-500' },
            { icon: PackageMinus, label: 'Itens em Falta', value: d.missingCount, bg: 'bg-primary/10', ic: 'text-primary' },
            { icon: ShieldAlert, label: 'Risco de Margem', value: d.marginCount, bg: 'bg-purple-500/10', ic: 'text-purple-500' },
          ].map((k, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${k.bg}`}>
                  <k.icon className={`w-5 h-5 ${k.ic}`} />
                </div>
                <div>
                  <p className="text-xl font-bold leading-none">{k.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{k.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ═══ 1. PERGUNTAS RÁPIDAS (OPERACIONAL) ═══ */}
        <Section icon={MessageSquare} title="Perguntas Rápidas" description="Faça perguntas sobre os seus dados operacionais"
          accentClass="bg-primary/10 text-primary">
          <div className="space-y-3">
            {/* Chat messages */}
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
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
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

            {/* Input */}
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

            {/* Quick question chips — hide when chat has messages */}
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
          <Section icon={Sparkles} title="Sugestões Automáticas" description="Ações sugeridas pela IA para otimizar operações"
            accentClass="bg-amber-500/10 text-amber-600">
            <div className="space-y-0.5">
              <InsightRow icon={TrendingDown} iconClass="bg-amber-500/10 text-amber-600" label="Rever preço de betão armado C25/30"
                value="Alto" sub="Preço 23% acima da mediana de mercado" />
              <InsightRow icon={PackageMinus} iconClass="bg-primary/10 text-primary" label="Adicionar impermeabilização no Cap. 5"
                value="Médio" sub="Item comum em obras similares" />
              <InsightRow icon={Lightbulb} iconClass="bg-emerald-500/10 text-emerald-600" label="Agrupar compras de cerâmica"
                value="Baixo" sub="Potencial de poupança ~€2.400" />
            </div>
            <Button variant="outline" size="sm" className="w-full mt-3 text-xs">
              Ver todas as sugestões <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Section>

          <Section icon={FileWarning} title="Alertas de Orçamento" description="Riscos identificados nos orçamentos ativos"
            accentClass="bg-red-500/10 text-red-500">
            <div className="space-y-0.5">
              <InsightRow icon={AlertTriangle} iconClass="bg-red-500/10 text-red-500" label="Margem negativa no orçamento ORC-047"
                value="Crítico" sub="Margem atual: -2.3%" />
              <InsightRow icon={TrendingDown} iconClass="bg-amber-500/10 text-amber-600" label="3 artigos sem preço atualizado"
                value="Aviso" sub="Última atualização há 90+ dias" />
              <InsightRow icon={Eye} iconClass="bg-primary/10 text-primary" label="Orçamento ORC-051 sem revisão"
                value="Info" sub="Criado há 15 dias sem aprovação" />
            </div>
            <Button variant="outline" size="sm" className="w-full mt-3 text-xs">
              Ver todos os alertas <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Section>
        </div>

        {/* ═══ 4 + 5. ALERTAS PRAZO + INCONSISTÊNCIAS ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section icon={CalendarClock} title="Alertas de Prazo" description="Obras com desvios de cronograma detectados"
            accentClass="bg-orange-500/10 text-orange-600">
            <div className="space-y-2.5">
              {MOCK_ALERTS_PRAZO.map((a, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0 border-border/50">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.tipo === 'atraso' ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                    {a.tipo === 'atraso'
                      ? <ArrowUpRight className="w-4 h-4 text-red-500" />
                      : <ArrowDownRight className="w-4 h-4 text-emerald-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.obra}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.tipo === 'atraso' ? `${a.dias} dias de atraso` : `${Math.abs(a.dias)} dias adiantado`}
                    </p>
                  </div>
                  <Badge variant={a.tipo === 'atraso' ? 'destructive' : 'secondary'} className="text-xs shrink-0">
                    {a.tipo === 'atraso' ? 'Atraso' : 'Adiantado'}
                  </Badge>
                </div>
              ))}
            </div>
          </Section>

          <Section icon={SearchIcon} title="Inconsistências Detectadas" description="Erros e anomalias encontrados nos dados"
            accentClass="bg-rose-500/10 text-rose-600">
            <div className="space-y-2.5">
              {MOCK_INCONSISTENCIAS.map((inc, i) => (
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
          </Section>
        </div>

        {/* ═══ 6 + 7. PREVISÃO DESVIOS + INSIGHTS OBRA ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section icon={BarChart3} title="Previsão de Desvios" description="Estimativa de desvios financeiros por obra"
            accentClass="bg-indigo-500/10 text-indigo-600">
            <div className="space-y-3">
              {MOCK_PREVISOES.map((p, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{p.obra}</span>
                    <span className={`text-xs font-semibold ${p.desvioPercent > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {p.desvioPercent > 0 ? '+' : ''}{p.desvioPercent}%
                      <span className="text-muted-foreground font-normal ml-1">
                        ({p.valor > 0 ? '+' : ''}€{Math.abs(p.valor).toLocaleString('pt-PT')})
                      </span>
                    </span>
                  </div>
                  <Progress
                    value={Math.min(Math.abs(p.desvioPercent) * 5, 100)}
                    className={`h-1.5 ${p.desvioPercent > 0 ? '[&>div]:bg-red-500' : '[&>div]:bg-emerald-500'}`}
                  />
                </div>
              ))}
            </div>
          </Section>

          <Section icon={HardHat} title="Insights da Obra" description="Observações inteligentes sobre as obras ativas"
            accentClass="bg-teal-500/10 text-teal-600">
            <div className="space-y-2.5">
              {MOCK_INSIGHTS_OBRA.map((ins, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0 border-border/50">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    ins.tipo === 'positivo' ? 'bg-emerald-500/10' : ins.tipo === 'custo' ? 'bg-amber-500/10' : 'bg-primary/10'
                  }`}>
                    {ins.tipo === 'positivo'
                      ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                      : ins.tipo === 'custo'
                        ? <AlertTriangle className="w-4 h-4 text-amber-500" />
                        : <Target className="w-4 h-4 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground">{ins.obra}</p>
                    <p className="text-sm mt-0.5">{ins.insight}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* ═══ 8. ASSISTENTE CONTEXTUAL + HISTÓRICO ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section icon={Zap} title="Assistente Contextual" description="Acções rápidas baseadas no contexto atual"
            accentClass="bg-primary/10 text-primary">
            <div className="space-y-2">
              {[
                { label: 'Gerar relatório de desvios do mês', icon: BarChart3 },
                { label: 'Verificar orçamentos sem aprovação', icon: FileWarning },
                { label: 'Analisar produtividade da equipa', icon: Activity },
                { label: 'Comparar custos reais vs. previstos', icon: TrendingDown },
              ].map((action, i) => (
                <button
                  key={i}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/60 hover:border-primary/30 hover:bg-primary/[0.03] transition-all text-left group"
                >
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <action.icon className="w-3.5 h-3.5 text-primary" />
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
