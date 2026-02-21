import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertTriangle, TrendingDown, PackageMinus, CheckCircle, XCircle, Clock } from 'lucide-react';
import { AxiaIcon } from '@/components/axia/AxiaIcon';
import { useAxiaDashboard } from '@/hooks/useAxiaDashboard';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

function ScoreCircle({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={radius} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Score</span>
      </div>
    </div>
  );
}

export default function AxiaPage() {
  const { data, isLoading } = useAxiaDashboard();

  if (isLoading) {
    return (
      <AppLayout title="Axia">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#7C3AED]" />
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
      title="Axia"
      subtitle="Inteligência ativa"
    >
      <div className="p-4 md:p-6 space-y-6">
        {/* Hero branding */}
        <Card className="border-[#7C3AED]/20 bg-gradient-to-br from-[#7C3AED]/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1 text-center md:text-left space-y-2">
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <AxiaIcon size={28} className="text-[#7C3AED]" />
                  <h2 className="text-2xl font-bold tracking-tight">Axia</h2>
                  <span className="text-xs text-muted-foreground">Inteligência ativa</span>
                </div>
                <p className="text-sm text-muted-foreground max-w-lg">
                  Axia&#8482; é o motor inteligente do Obra Sys. Analisa orçamentos, identifica riscos e ajuda a proteger a sua margem.
                </p>
                <p className="text-xs text-muted-foreground italic">Axia aprende com cada obra.</p>
              </div>
              <ScoreCircle score={d.score} />
            </div>
          </CardContent>
        </Card>

        {/* Indicators grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-5 w-5 mx-auto mb-2 text-red-500" />
              <p className="text-2xl font-bold">{d.criticalCount}</p>
              <p className="text-xs text-muted-foreground">Itens Críticos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <TrendingDown className="h-5 w-5 mx-auto mb-2 text-amber-500" />
              <p className="text-2xl font-bold">{d.outlierCount}</p>
              <p className="text-xs text-muted-foreground">Desvios de Preço</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <PackageMinus className="h-5 w-5 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{d.missingCount}</p>
              <p className="text-xs text-muted-foreground">Itens em Falta</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-5 w-5 mx-auto mb-2 text-emerald-500" />
              <p className="text-2xl font-bold">{d.appliedInsights}</p>
              <p className="text-xs text-muted-foreground">Sugestões Aplicadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total de Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{d.totalInsights}</span>
                <span className="text-xs text-muted-foreground">gerados</span>
              </div>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="text-xs">{d.openInsights} abertos</Badge>
                <Badge variant="secondary" className="text-xs">{d.appliedInsights} aplicados</Badge>
                <Badge variant="secondary" className="text-xs">{d.dismissedInsights} ignorados</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Risco de Margem</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{d.marginCount}</span>
                <span className="text-xs text-muted-foreground">alertas ativos</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Alertas Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{d.warnCount}</span>
                <span className="text-xs text-muted-foreground">a aguardar decisão</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action history */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Histórico de Decisões
            </CardTitle>
            <CardDescription>Ações aplicadas e decisões registadas pela Axia</CardDescription>
          </CardHeader>
          <CardContent>
            {d.actionHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma ação registada ainda. Analise um orçamento para começar.
              </p>
            ) : (
              <div className="space-y-3">
                {d.actionHistory.map((action) => (
                  <div key={action.id} className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5">
                      {action.action === 'apply' ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
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
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
