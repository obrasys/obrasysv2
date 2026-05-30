import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, CheckCircle2, Clock, Circle, AlertTriangle, Sparkles, TrendingUp, TrendingDown, Wallet, Database, Loader2, ExternalLink, ShieldCheck } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { fmtEUR } from '@/lib/finance';
import { useOrcamentoRaiObra } from '@/hooks/useOrcamentoRaiObra';
import { useFinancialCycles } from '@/hooks/useFinancialCycles';
import { useSnapshotAndLockBudget } from '@/hooks/useBudgetSnapshot';
import { useAuth } from '@/contexts/AuthContext';
import type { FinancialPhase, PhaseStatus } from '@/types/orcamento-rai';
import { PHASE_DESCRIPTIONS } from '@/types/orcamento-rai';

const statusConfig: Record<PhaseStatus, { icon: typeof Lock; label: string; pill: string }> = {
  future: { icon: Circle, label: 'Futura', pill: 'bg-muted text-muted-foreground' },
  pending: { icon: Clock, label: 'Pendente', pill: 'bg-amber-100 text-amber-700' },
  active: { icon: Sparkles, label: 'Ativa', pill: 'bg-primary/15 text-primary' },
  locked: { icon: Lock, label: 'Bloqueada', pill: 'bg-slate-100 text-slate-700' },
  done: { icon: CheckCircle2, label: 'Concluída', pill: 'bg-emerald-100 text-emerald-700' },
};

const sourceStateLabel: Record<string, { label: string; tone: string }> = {
  no_data: { label: 'Sem dados', tone: 'bg-muted text-muted-foreground' },
  found: { label: 'Dados encontrados', tone: 'bg-blue-100 text-blue-700' },
  pending_review: { label: 'Pendente de revisão', tone: 'bg-amber-100 text-amber-700' },
  with_conflicts: { label: 'Com conflitos', tone: 'bg-rose-100 text-rose-700' },
  consolidated: { label: 'Consolidado', tone: 'bg-emerald-100 text-emerald-700' },
  sync_error: { label: 'Erro de sincronização', tone: 'bg-rose-100 text-rose-700' },
};

export default function OrcamentoRaiObra() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useOrcamentoRaiObra(id);
  const [selected, setSelected] = useState<FinancialPhase | null>(null);

  const activePhase: FinancialPhase = selected || data?.currentPhase || 'budget';
  const currentPhaseData = useMemo(
    () => data?.phases.find(p => p.phase === activePhase),
    [data, activePhase],
  );

  if (isLoading || !data) {
    return (
      <AppLayout title="Orçamento & RAI da Obra" subtitle="Carregando consolidação financeira…">
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Orçamento & RAI da Obra"
      subtitle={`Visão financeira consolidada — fase atual: ${currentPhaseData?.label}`}
      actions={
        <Button variant="outline" size="sm" onClick={() => navigate(`/obras/${id}`)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar à obra
        </Button>
      }
    >
      {/* Cabeçalho inteligente */}
      <Card className="rounded-xl border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-5 grid md:grid-cols-4 gap-4">
          <KPI label="RAI da fase atual" value={fmtEUR(data.kpis.rai)} hint={currentPhaseData?.label} />
          <KPI label="Margem" value={`${data.kpis.margemPct.toFixed(1)}%`} hint={fmtEUR(data.kpis.margemValor)} />
          <KPI label="Vendas" value={fmtEUR(data.kpis.vendas)} />
          <KPI label="Custos" value={fmtEUR(data.kpis.custos)} />
        </CardContent>
      </Card>

      {/* Timeline financeira */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Linha do tempo financeira</h2>
        <div className="grid md:grid-cols-4 gap-3 overflow-x-auto">
          {data.phases.map((p, i) => {
            const cfg = statusConfig[p.status];
            const Icon = cfg.icon;
            const isCurrent = activePhase === p.phase;
            return (
              <button
                key={p.phase}
                onClick={() => setSelected(p.phase)}
                className={cn(
                  'text-left rounded-xl border p-4 transition-all hover:shadow-md min-w-[200px]',
                  isCurrent
                    ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30'
                    : 'border-border bg-card hover:border-primary/40',
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                    <span className="font-semibold">{p.label}</span>
                  </div>
                  <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', cfg.pill)}>
                    <Icon className="w-3 h-3" /> {cfg.label}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2 mb-2">{p.note || PHASE_DESCRIPTIONS[p.phase]}</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">RAI</div>
                    <div className="font-bold">{fmtEUR(p.rai)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Margem</div>
                    <div className="font-bold">{p.marginPct.toFixed(1)}%</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* KPI extras */}
      <section className="mt-6 grid md:grid-cols-4 gap-3">
        <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="Margem €" value={fmtEUR(data.kpis.margemValor)} />
        <KpiCard
          icon={data.kpis.desvioBudget >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-rose-600" />}
          label="Desvio vs Budget"
          value={fmtEUR(data.kpis.desvioBudget)}
          tone={data.kpis.desvioBudget >= 0 ? 'positive' : 'negative'}
        />
        <KpiCard icon={<Database className="w-4 h-4" />} label="Impacto MCE" value={fmtEUR(data.kpis.impactoMce)} hint="Fase 4" />
        <KpiCard icon={<Wallet className="w-4 h-4" />} label="RAI c/ SPV" value={fmtEUR(data.kpis.raiComSpv)} hint={`SPV: ${fmtEUR(data.kpis.custosSpv)}`} />
      </section>

      {/* O que precisa da sua atenção */}
      <section className="mt-6 grid md:grid-cols-3 gap-4">
        <Card className="rounded-xl md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> O que precisa da sua atenção
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.attention.length === 0 && (
              <div className="text-sm text-muted-foreground py-4 text-center">Sem alertas para esta obra. Tudo em ordem.</div>
            )}
            {data.attention.map(item => (
              <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full mt-1.5',
                    item.severity === 'high' && 'bg-rose-500',
                    item.severity === 'warning' && 'bg-amber-500',
                    item.severity === 'info' && 'bg-blue-500',
                  )}
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.description}</div>
                  <Badge variant="outline" className="mt-1 text-[10px]">{item.source}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Painel Axia */}
        <Card className="rounded-xl border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Axia
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>A Axia analisa a fase <strong className="text-foreground">{currentPhaseData?.label}</strong> e identifica desvios e oportunidades.</p>
            <p className="text-xs">Análise contextual sem alterar valores automaticamente.</p>
            <Button variant="outline" size="sm" disabled className="w-full mt-2">
              <Loader2 className="w-3 h-3 mr-1" /> Análise em breve
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Fontes e integrações */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Fontes que alimentam este resultado</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          {data.sources.map(src => {
            const tone = sourceStateLabel[src.state];
            return (
              <Card key={src.key} className="rounded-xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{src.label}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', tone.tone)}>{tone.label}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">{src.module}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Docs</div>
                      <div className="font-bold">{src.totalDocs}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Valor</div>
                      <div className="font-bold">{fmtEUR(src.amount)}</div>
                    </div>
                  </div>
                  {src.conflicts > 0 && (
                    <Badge variant="destructive" className="mt-2 text-[10px]">{src.conflicts} conflito(s)</Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Área da fase ativa - placeholder */}
      <section className="mt-6">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ExternalLink className="w-4 h-4" /> Área de trabalho — {currentPhaseData?.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p className="mb-3">{PHASE_DESCRIPTIONS[activePhase]}</p>
            <p className="text-xs">
              Nesta fase inicial, a área consolida dados existentes em modo leitura. As próximas entregas adicionarão:
              motor de consolidação real com anti-duplicação, mapa MCE completo, gestão de retenções, fluxo Outturn e SPV.
            </p>
          </CardContent>
        </Card>
      </section>
    </AppLayout>
  );
}

function KPI({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

function KpiCard({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: string; hint?: string; tone?: 'positive' | 'negative' }) {
  return (
    <Card className="rounded-xl">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">{icon}<span>{label}</span></div>
        <div className={cn('text-xl font-bold', tone === 'positive' && 'text-emerald-600', tone === 'negative' && 'text-rose-600')}>{value}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
      </CardContent>
    </Card>
  );
}
