import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, CheckCircle2, Clock, Circle, AlertTriangle, Sparkles, TrendingUp, TrendingDown, Wallet, Database, Loader2, ExternalLink, ShieldCheck, Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { fmtEUR } from '@/lib/finance';
import { useOrcamentoRaiObra } from '@/hooks/useOrcamentoRaiObra';
import { useFinancialCycles, useGuaranteeRetentions, useAftercareRecords } from '@/hooks/useFinancialCycles';
import { useSnapshotAndLockPhase } from '@/hooks/useBudgetSnapshot';
import { useCreateAftercareRecord, useCreateGuaranteeRetention, useResolveAftercareRecord, useReleaseGuaranteeRetention } from '@/hooks/useFinancialExtras';
import { useAxiaOrcamentoRai, type AxiaRaiInsight } from '@/hooks/useAxiaOrcamentoRai';
import { useAuth } from '@/contexts/AuthContext';
import type { FinancialPhase, PhaseStatus } from '@/types/orcamento-rai';
import { PHASE_DESCRIPTIONS, PHASE_LABELS } from '@/types/orcamento-rai';

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
  const { organization } = useAuth();
  const { data, isLoading } = useOrcamentoRaiObra(id);
  const { data: cycles } = useFinancialCycles(id);
  const { data: retentions } = useGuaranteeRetentions(id);
  const { data: aftercare } = useAftercareRecords(id);
  const snapshotMutation = useSnapshotAndLockPhase();
  const axiaMutation = useAxiaOrcamentoRai();
  const createAftercare = useCreateAftercareRecord();
  const createRetention = useCreateGuaranteeRetention();
  const resolveAftercare = useResolveAftercareRecord();
  const releaseRetention = useReleaseGuaranteeRetention();
  const [selected, setSelected] = useState<FinancialPhase | null>(null);
  const [insights, setInsights] = useState<AxiaRaiInsight[] | null>(null);

  const activePhase: FinancialPhase = selected || data?.currentPhase || 'budget';
  const currentPhaseData = useMemo(
    () => data?.phases.find(p => p.phase === activePhase),
    [data, activePhase],
  );

  const lockedByPhase = useMemo(() => {
    const map: Partial<Record<FinancialPhase, typeof cycles extends Array<infer T> ? T : never>> = {};
    (cycles ?? []).forEach((c) => {
      if (c.status === 'locked' && !map[c.phase]) map[c.phase] = c;
    });
    return map;
  }, [cycles]);
  const lockedActive = lockedByPhase[activePhase];
  const canLockActive = !!currentPhaseData && (currentPhaseData.status === 'locked' || currentPhaseData.status === 'active') && !lockedActive;

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
      <div className="p-4 md:p-6 space-y-5">
      {/* Breadcrumbs */}
      <div>

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigate('/obras')} className="cursor-pointer">Obras</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigate(`/obras/${id}`)} className="cursor-pointer max-w-[240px] truncate">
                {data.obraNome}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Orçamento &amp; RAI</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Cabeçalho inteligente */}
      <Card className="rounded-xl border-primary/20 bg-gradient-to-br from-primary/5 to-transparent mt-3">
        <CardContent className="p-5 grid md:grid-cols-4 gap-4">
          <KPI label="RAI da fase atual" value={fmtEUR(data.kpis.rai)} hint={currentPhaseData?.label} />
          <KPI label="Margem" value={`${data.kpis.margemPct.toFixed(1)}%`} hint={fmtEUR(data.kpis.margemValor)} />
          <KPI label="Vendas" value={fmtEUR(data.kpis.vendas)} />
          <KPI label="Custos" value={fmtEUR(data.kpis.custos)} />
        </CardContent>
      </Card>

      {/* Snapshot & Lock por fase ativa */}
      <Card className={cn('rounded-xl mt-4 border', lockedActive ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/40')}>
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className={cn('w-5 h-5 mt-0.5', lockedActive ? 'text-emerald-600' : 'text-amber-600')} />
            <div>
              <div className="font-semibold text-sm">
                {lockedActive
                  ? `${PHASE_LABELS[activePhase]} bloqueado — v${lockedActive.version}`
                  : `Snapshot do ${PHASE_LABELS[activePhase]} pendente`}
              </div>
              <div className="text-xs text-muted-foreground">
                {lockedActive
                  ? `Bloqueado em ${new Date(lockedActive.locked_at!).toLocaleString('pt-PT')} · RAI ${fmtEUR(lockedActive.rai)} · Margem ${lockedActive.margem_pct.toFixed(1)}%`
                  : canLockActive
                  ? 'Capture um snapshot para tornar esta fase a referência oficial desta obra.'
                  : 'Snapshot disponível quando a fase estiver consolidada.'}
              </div>
            </div>
          </div>
          {canLockActive && organization?.id && id && data && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={snapshotMutation.isPending}>
                  {snapshotMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Lock className="w-3 h-3 mr-1" />}
                  Bloquear {PHASE_LABELS[activePhase]}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Bloquear {PHASE_LABELS[activePhase]} desta obra?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Será criado um snapshot oficial (v{((cycles?.filter(c => c.phase === activePhase).length ?? 0) + 1)}) com os valores e fontes consolidadas atuais.
                    Alterações posteriores passam a ser desvios face a este snapshot.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      snapshotMutation.mutate({
                        obra_id: id,
                        organization_id: organization.id,
                        phase: activePhase,
                        consolidation: data,
                      })
                    }
                  >
                    Confirmar e bloquear
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
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
          <CardContent className="text-sm space-y-2">
            <p className="text-muted-foreground text-xs">
              Análise contextual da fase <strong className="text-foreground">{currentPhaseData?.label}</strong>. Não altera valores.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={axiaMutation.isPending || !data}
              onClick={async () => {
                if (!data) return;
                const r = await axiaMutation.mutateAsync(data);
                setInsights(r.insights ?? []);
              }}
            >
              {axiaMutation.isPending ? (
                <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> A analisar…</>
              ) : (
                <><Sparkles className="w-3 h-3 mr-1" /> Analisar agora</>
              )}
            </Button>
            {insights && insights.length > 0 && (
              <div className="space-y-2 mt-2">
                {insights.map((ins, i) => (
                  <div key={i} className="rounded-lg border bg-card p-2 text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        ins.level === 'critical' && 'bg-rose-500',
                        ins.level === 'warning' && 'bg-amber-500',
                        ins.level === 'info' && 'bg-blue-500',
                      )} />
                      <span className="font-semibold text-foreground">{ins.title}</span>
                    </div>
                    <div className="text-muted-foreground">{ins.message}</div>
                  </div>
                ))}
              </div>
            )}
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

      {/* Retenções de garantia */}
      <section className="mt-6 grid md:grid-cols-2 gap-4">
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Retenções de garantia
            </CardTitle>
            {organization?.id && id && (
              <RetentionDialog
                onSubmit={(p) => createRetention.mutate({ obra_id: id, organization_id: organization.id, ...p })}
                pending={createRetention.isPending}
              />
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {(retentions ?? []).length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-3">Sem retenções registadas.</div>
            )}
            {(retentions ?? []).map((r) => {
              const pendente = r.retained_amount - r.released_amount;
              return (
                <div key={r.id} className="flex items-center justify-between p-2 rounded-lg border bg-card text-xs">
                  <div>
                    <div className="font-medium">{r.description || 'Retenção'}</div>
                    <div className="text-muted-foreground">
                      Retido {fmtEUR(r.retained_amount)} · Pendente {fmtEUR(pendente)}
                      {r.due_date && ` · Até ${new Date(r.due_date).toLocaleDateString('pt-PT')}`}
                    </div>
                  </div>
                  {r.status !== 'liberada_total' && pendente > 0 && (
                    <Button size="sm" variant="outline"
                      onClick={() => id && releaseRetention.mutate({ id: r.id, released_amount: r.retained_amount, obra_id: id })}>
                      Libertar
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Pós-venda / SPV */}
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Pós-venda / SPV
            </CardTitle>
            {organization?.id && id && (
              <AftercareDialog
                onSubmit={(p) => createAftercare.mutate({ obra_id: id, organization_id: organization.id, ...p })}
                pending={createAftercare.isPending}
              />
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {(aftercare ?? []).length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-3">Sem registos de pós-venda.</div>
            )}
            {(aftercare ?? []).map((a) => (
              <div key={a.id} className="flex items-center justify-between p-2 rounded-lg border bg-card text-xs">
                <div>
                  <div className="font-medium">{a.description}</div>
                  <div className="text-muted-foreground">
                    {fmtEUR(a.cost_value)} · {a.category || 'Sem categoria'} · {a.status}
                  </div>
                </div>
                {a.status !== 'resolvido' && id && (
                  <Button size="sm" variant="outline"
                    onClick={() => resolveAftercare.mutate({ id: a.id, obra_id: id })}>
                    Resolver
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Área da fase ativa */}
      <section className="mt-6">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ExternalLink className="w-4 h-4" /> Área de trabalho — {currentPhaseData?.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>{PHASE_DESCRIPTIONS[activePhase]}</p>
          </CardContent>
        </Card>
      </section>
      </div>
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

function RetentionDialog({ onSubmit, pending }: { onSubmit: (p: { description?: string; retained_amount: number; due_date?: string; notes?: string }) => void; pending: boolean }) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [due, setDue] = useState('');
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="w-3 h-3 mr-1" /> Nova</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova retenção de garantia</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Descrição</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: Retenção 5% — Empreiteiro X" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Valor retido (€)</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div><Label>Data de libertação</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            disabled={pending || !amount}
            onClick={() => {
              onSubmit({ description: desc || undefined, retained_amount: parseFloat(amount) || 0, due_date: due || undefined });
              setOpen(false); setDesc(''); setAmount(''); setDue('');
            }}
          >Registar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AftercareDialog({ onSubmit, pending }: { onSubmit: (p: { description: string; cost_value: number; category?: string; notes?: string }) => void; pending: boolean }) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState('');
  const [cost, setCost] = useState('');
  const [cat, setCat] = useState('');
  const [notes, setNotes] = useState('');
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="w-3 h-3 mr-1" /> Novo</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo registo de pós-venda</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Descrição</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: Infiltração na cozinha — Lote 12" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Custo (€)</Label><Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} /></div>
            <div><Label>Categoria</Label><Input value={cat} onChange={(e) => setCat(e.target.value)} placeholder="Ex.: Canalização" /></div>
          </div>
          <div><Label>Notas</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            disabled={pending || !desc || !cost}
            onClick={() => {
              onSubmit({ description: desc, cost_value: parseFloat(cost) || 0, category: cat || undefined, notes: notes || undefined });
              setOpen(false); setDesc(''); setCost(''); setCat(''); setNotes('');
            }}
          >Registar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
