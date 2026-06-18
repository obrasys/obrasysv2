import { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { PageHeader } from '@/components/patterns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportPieChart, ReportBarChart } from '@/components/relatorios';
import { useRelatorios } from '@/hooks/useRelatorios';
import { useFormatting } from '@/hooks/useFormatting';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import {
  Loader2, Building2, FileText, Users, CheckSquare, Wallet,
  TrendingUp, BarChart3, Clock, AlertTriangle, UserCheck, Briefcase,
  ArrowUpRight, ArrowDownRight, Scale, Activity, Target, PieChart,
  DollarSign, Percent, HardHat, ClipboardList
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { STATUS_CONFIG } from '@/types/orcamentos';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

function MetricCard({ 
  title, value, subtitle, icon: Icon, trend, trendLabel, variant = 'default' 
}: { 
  title: string; value: string | number; subtitle?: string; icon: any; 
  trend?: 'up' | 'down' | 'neutral'; trendLabel?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary';
}) {
  const variantStyles = {
    default: 'bg-primary/8 text-primary',
    success: 'bg-emerald-500/10 text-emerald-600',
    warning: 'bg-amber-500/10 text-amber-600',
    danger: 'bg-destructive/10 text-destructive',
    primary: 'bg-primary/10 text-primary',
  };

  return (
    <Card className="group hover:shadow-md transition-all duration-200 border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            {trend && trendLabel && (
              <div className={cn(
                "inline-flex items-center gap-1 text-xs font-medium mt-1",
                trend === 'up' && 'text-emerald-600',
                trend === 'down' && 'text-destructive',
                trend === 'neutral' && 'text-muted-foreground'
              )}>
                {trend === 'up' && <ArrowUpRight className="w-3 h-3" />}
                {trend === 'down' && <ArrowDownRight className="w-3 h-3" />}
                {trendLabel}
              </div>
            )}
          </div>
          <div className={cn(
            'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110',
            variantStyles[variant]
          )}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatRow({ label, value, percentage, color }: { label: string; value: string | number; percentage?: number; color?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{value}</span>
      </div>
      {percentage !== undefined && (
        <Progress value={percentage} className="h-1.5" />
      )}
    </div>
  );
}

export default function RelatoriosPage() {
  const { isLoading, resumo, orcamentoStats, obraStats, tarefaStats, clienteStats, financeiroDashboard, margensLucro, recursosStats } = useRelatorios();
  const { formatCurrency } = useFormatting();
  const { hasFeature } = useFeatureGate();

  if (isLoading) {
    return (
      <AppLayout title="Relatórios" subtitle="Análise e métricas do negócio">
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">A carregar relatórios...</p>
        </div>
      </AppLayout>
    );
  }

  const taxaSucesso = orcamentoStats.total > 0
    ? ((orcamentoStats.adjudicados + orcamentoStats.aprovados) / orcamentoStats.total * 100).toFixed(0)
    : '0';

  return (
    <AppLayout title="Relatórios" subtitle="Análise e métricas do negócio">
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader
          eyebrow="Análise"
          title="Relatórios"
          subtitle="Análise e métricas do negócio em tempo real"
        />
        {/* Hero Summary Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            title="Volume de Negócio"
            value={formatCurrency(resumo.valorTotalObras)}
            subtitle={`${resumo.totalObras} obras`}
            icon={TrendingUp}
            variant="primary"
          />
          <MetricCard
            title="Pipeline"
            value={formatCurrency(orcamentoStats.valorTotal)}
            subtitle={`${orcamentoStats.total} orçamentos`}
            icon={Target}
            variant="default"
          />
          <MetricCard
            title="Saldo Financeiro"
            value={formatCurrency(resumo.saldoFinanceiro)}
            subtitle={resumo.saldoFinanceiro >= 0 ? 'Positivo' : 'Negativo'}
            icon={Wallet}
            variant={resumo.saldoFinanceiro >= 0 ? 'success' : 'danger'}
          />
          <MetricCard
            title="Taxa de Sucesso"
            value={`${taxaSucesso}%`}
            subtitle={`${orcamentoStats.adjudicados + orcamentoStats.aprovados} adjudicados`}
            icon={Percent}
            variant="success"
          />
        </div>

        <Tabs defaultValue="resumo" className="space-y-5">
          <TabsList className="bg-muted/60 p-1 rounded-xl flex flex-wrap h-auto gap-0.5">
            <TabsTrigger value="resumo" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-3">
              <Activity className="w-3.5 h-3.5 mr-1.5" />Resumo
            </TabsTrigger>
            <TabsTrigger value="orcamentos" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-3">
              <FileText className="w-3.5 h-3.5 mr-1.5" />Orçamentos
            </TabsTrigger>
            <TabsTrigger value="obras" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-3">
              <Building2 className="w-3.5 h-3.5 mr-1.5" />Obras
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-3">
              <DollarSign className="w-3.5 h-3.5 mr-1.5" />Financeiro
            </TabsTrigger>
            <TabsTrigger value="tarefas" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-3">
              <CheckSquare className="w-3.5 h-3.5 mr-1.5" />Tarefas
            </TabsTrigger>
            <TabsTrigger value="clientes" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-3">
              <Users className="w-3.5 h-3.5 mr-1.5" />Clientes
            </TabsTrigger>
            <TabsTrigger value="recursos" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-3">
              <HardHat className="w-3.5 h-3.5 mr-1.5" />Recursos
            </TabsTrigger>
          </TabsList>

          {/* RESUMO */}
          <TabsContent value="resumo" className="space-y-5">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Quick Stats */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Visão Geral do Negócio
                  </CardTitle>
                  <CardDescription>Indicadores consolidados da empresa</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <StatRow label="Obras Ativas" value={obraStats.emCurso} percentage={obraStats.total > 0 ? (obraStats.emCurso / obraStats.total) * 100 : 0} />
                    <StatRow label="Progresso Médio" value={`${obraStats.progressoMedio.toFixed(0)}%`} percentage={obraStats.progressoMedio} />
                    <StatRow label="Orçamentos Enviados" value={orcamentoStats.enviados} percentage={orcamentoStats.total > 0 ? (orcamentoStats.enviados / orcamentoStats.total) * 100 : 0} />
                    <StatRow label="Tarefas Concluídas" value={tarefaStats?.concluidas || 0} percentage={tarefaStats?.total ? ((tarefaStats.concluidas || 0) / tarefaStats.total) * 100 : 0} />
                    <StatRow label="Clientes Ativos" value={clienteStats?.ativos || 0} percentage={clienteStats?.total ? ((clienteStats.ativos || 0) / clienteStats.total) * 100 : 0} />
                    <StatRow label="Equipa Alocada" value={recursosStats.alocados} percentage={recursosStats.totalMembros > 0 ? (recursosStats.alocados / recursosStats.totalMembros) * 100 : 0} />
                  </div>
                </CardContent>
              </Card>

              {/* Financial Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Scale className="w-4 h-4 text-primary" />
                    Balanço Financeiro
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-sm text-muted-foreground">Receitas</span>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">{formatCurrency(resumo.receitas)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-destructive" />
                        <span className="text-sm text-muted-foreground">Despesas</span>
                      </div>
                      <span className="text-sm font-semibold text-destructive">{formatCurrency(resumo.despesas)}</span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Saldo</span>
                        <span className={cn(
                          "text-lg font-bold",
                          resumo.saldoFinanceiro >= 0 ? 'text-emerald-600' : 'text-destructive'
                        )}>
                          {formatCurrency(resumo.saldoFinanceiro)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {margensLucro.margemMedia > 0 && (
                    <div className="bg-primary/5 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-medium text-primary uppercase tracking-wider">Margem de Lucro</p>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold text-primary">{margensLucro.margemMedia.toFixed(1)}%</span>
                        <span className="text-xs text-muted-foreground pb-1">média</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Lucro: {formatCurrency(margensLucro.lucroTotal)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <ReportBarChart
                title="Receitas vs Despesas"
                data={[
                  { name: 'Receitas', valor: resumo.receitas },
                  { name: 'Despesas', valor: resumo.despesas },
                ]}
                bars={[{ dataKey: 'valor', fill: 'hsl(var(--primary))', name: 'Valor' }]}
                formatValue={(v) => formatCurrency(v)}
              />
              <ReportPieChart title="Obras por Estado" data={obraStats.statusData} />
            </div>
          </TabsContent>

          {/* ORÇAMENTOS */}
          <TabsContent value="orcamentos" className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <MetricCard title="Total" value={orcamentoStats.total} icon={FileText} variant="primary" />
              <MetricCard title="Rascunho" value={orcamentoStats.rascunho} subtitle={formatCurrency(orcamentoStats.valorRascunho)} icon={ClipboardList} />
              <MetricCard title="Enviados" value={orcamentoStats.enviados} subtitle={formatCurrency(orcamentoStats.valorEnviados)} icon={ArrowUpRight} variant="default" />
              <MetricCard title="Adjudicados" value={orcamentoStats.adjudicados} subtitle={formatCurrency(orcamentoStats.valorAdjudicados)} icon={CheckSquare} variant="success" />
              <MetricCard title="Rejeitados" value={orcamentoStats.rejeitados} subtitle={formatCurrency(orcamentoStats.valorRejeitados)} icon={AlertTriangle} variant="danger" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <ReportPieChart title="Distribuição por Estado" data={orcamentoStats.statusData} />
              <ReportBarChart
                title="Valor por Estado"
                data={[
                  { name: 'Rascunho', valor: orcamentoStats.valorRascunho },
                  { name: 'Enviado', valor: orcamentoStats.valorEnviados },
                  { name: 'Adjudicado', valor: orcamentoStats.valorAdjudicados },
                  { name: 'Rejeitado', valor: orcamentoStats.valorRejeitados },
                ].filter(d => d.valor > 0)}
                bars={[{ dataKey: 'valor', fill: 'hsl(var(--primary))', name: 'Valor' }]}
                formatValue={(v) => formatCurrency(v)}
              />
            </div>
            {orcamentoStats.recentes.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    Últimos Orçamentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-border/50">
                    {orcamentoStats.recentes.map(o => (
                      <Link key={o.id} to={`/orcamentos/${o.id}`} className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted/40 transition-colors group">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{o.titulo}</p>
                          <p className="text-xs text-muted-foreground">{o.codigo}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <Badge variant="secondary" className={`${STATUS_CONFIG[o.status]?.bgColor} ${STATUS_CONFIG[o.status]?.color} text-xs`}>
                            {STATUS_CONFIG[o.status]?.label}
                          </Badge>
                          <span className="text-sm font-semibold tabular-nums">{formatCurrency(o.valor_total || 0)}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* OBRAS */}
          <TabsContent value="obras" className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <MetricCard title="Total" value={obraStats.total} icon={Building2} variant="primary" />
              <MetricCard title="Em Curso" value={obraStats.emCurso} icon={Activity} variant="default" />
              <MetricCard title="Planeamento" value={obraStats.planeamento} icon={Clock} variant="warning" />
              <MetricCard title="Concluídas" value={obraStats.concluidas} icon={CheckSquare} variant="success" />
              <MetricCard title="Pausadas" value={obraStats.pausadas} icon={AlertTriangle} variant="danger" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <ReportPieChart title="Distribuição por Estado" data={obraStats.statusData} />
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Indicadores de Obra
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-primary/5 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Progresso Médio</p>
                    <div className="flex items-end gap-2 mb-2">
                      <span className="text-3xl font-bold text-primary">{obraStats.progressoMedio.toFixed(0)}%</span>
                      <span className="text-xs text-muted-foreground pb-1">das obras ativas</span>
                    </div>
                    <Progress value={obraStats.progressoMedio} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/40 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">{formatCurrency(obraStats.valorTotal)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Valor Total</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">{obraStats.totalRDOs}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">RDOs Registados</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm px-1">
                    <span className="text-muted-foreground">Autos de Medição</span>
                    <span className="font-semibold">{obraStats.totalAutos}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* FINANCEIRO */}
          <TabsContent value="financeiro" className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard title="A Pagar" value={formatCurrency(financeiroDashboard?.totalPagar || 0)} icon={ArrowDownRight} variant="danger" />
              <MetricCard title="A Receber" value={formatCurrency(financeiroDashboard?.totalReceber || 0)} icon={ArrowUpRight} variant="success" />
              <MetricCard title="Saldo" value={formatCurrency(financeiroDashboard?.saldo || 0)} icon={Scale} variant={financeiroDashboard?.saldo && financeiroDashboard.saldo >= 0 ? 'success' : 'danger'} />
              <MetricCard title="Contas Vencidas" value={financeiroDashboard?.vencidas || 0} subtitle={formatCurrency(financeiroDashboard?.valorVencido || 0)} icon={AlertTriangle} variant="warning" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <ReportPieChart
                title="Distribuição por Origem"
                data={[
                  { name: 'Mão de Obra', value: financeiroDashboard?.contasPorOrigem?.mao_de_obra || 0, fill: 'hsl(210, 80%, 55%)' },
                  { name: 'Material', value: financeiroDashboard?.contasPorOrigem?.material || 0, fill: 'hsl(45, 80%, 55%)' },
                  { name: 'Outros', value: financeiroDashboard?.contasPorOrigem?.outros || 0, fill: 'hsl(142, 60%, 45%)' },
                ].filter(d => d.value > 0)}
              />
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Margens de Lucro
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-primary/5 rounded-lg p-4 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Margem Média</p>
                    <span className="text-3xl font-bold text-primary">{margensLucro.margemMedia.toFixed(1)}%</span>
                  </div>
                  <div className="space-y-3">
                    <StatRow label="Valor Base (custos)" value={formatCurrency(margensLucro.valorBase)} />
                    <StatRow label="Valor com Margem" value={formatCurrency(margensLucro.valorComMargem)} />
                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                      <span className="font-medium">Lucro Total</span>
                      <span className="text-lg font-bold text-primary">{formatCurrency(margensLucro.lucroTotal)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAREFAS */}
          <TabsContent value="tarefas" className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <MetricCard title="Total" value={tarefaStats?.total || 0} icon={CheckSquare} variant="primary" />
              <MetricCard title="Pendentes" value={tarefaStats?.pendentes || 0} icon={Clock} variant="warning" />
              <MetricCard title="Em Progresso" value={tarefaStats?.emProgresso || 0} icon={Activity} variant="default" />
              <MetricCard title="Concluídas" value={tarefaStats?.concluidas || 0} icon={CheckSquare} variant="success" />
              <MetricCard title="Atrasadas" value={tarefaStats?.atrasadas || 0} icon={AlertTriangle} variant="danger" />
              <MetricCard title="Urgentes" value={tarefaStats?.urgentes || 0} icon={AlertTriangle} variant="warning" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <ReportPieChart
                title="Distribuição por Estado"
                data={[
                  { name: 'Pendente', value: tarefaStats?.pendentes || 0, fill: 'hsl(45, 80%, 55%)' },
                  { name: 'Em Progresso', value: tarefaStats?.emProgresso || 0, fill: 'hsl(210, 80%, 55%)' },
                  { name: 'Concluída', value: tarefaStats?.concluidas || 0, fill: 'hsl(142, 60%, 45%)' },
                ].filter(d => d.value > 0)}
              />
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Produtividade
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-primary/5 rounded-lg p-4 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Taxa de Conclusão</p>
                    <span className="text-3xl font-bold text-primary">
                      {tarefaStats?.total ? ((tarefaStats.concluidas || 0) / tarefaStats.total * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                  <StatRow label="Concluídas" value={tarefaStats?.concluidas || 0} percentage={tarefaStats?.total ? ((tarefaStats.concluidas || 0) / tarefaStats.total) * 100 : 0} />
                  <StatRow label="Atrasadas" value={tarefaStats?.atrasadas || 0} percentage={tarefaStats?.total ? ((tarefaStats.atrasadas || 0) / tarefaStats.total) * 100 : 0} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* CLIENTES */}
          <TabsContent value="clientes" className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <MetricCard title="Total" value={clienteStats?.total || 0} icon={Users} variant="primary" />
              <MetricCard title="Ativos" value={clienteStats?.ativos || 0} icon={UserCheck} variant="success" />
              <MetricCard title="Inativos" value={clienteStats?.inativos || 0} icon={Users} variant="default" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <ReportPieChart
                title="Distribuição por Nível de Acesso"
                data={[
                  { name: 'Básico', value: clienteStats?.porNivel?.basico || 0, fill: 'hsl(210, 80%, 55%)' },
                  { name: 'Intermediário', value: clienteStats?.porNivel?.intermediario || 0, fill: 'hsl(45, 80%, 55%)' },
                  { name: 'Completo', value: clienteStats?.porNivel?.completo || 0, fill: 'hsl(142, 60%, 45%)' },
                ].filter(d => d.value > 0)}
              />
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-primary" />
                    Resumo de Clientes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StatRow label="Ativos" value={clienteStats?.ativos || 0} percentage={clienteStats?.total ? ((clienteStats.ativos || 0) / clienteStats.total) * 100 : 0} />
                  <StatRow label="Inativos" value={clienteStats?.inativos || 0} percentage={clienteStats?.total ? ((clienteStats.inativos || 0) / clienteStats.total) * 100 : 0} />
                  <div className="bg-primary/5 rounded-lg p-3 text-center mt-2">
                    <p className="text-xs text-muted-foreground">Taxa de Atividade</p>
                    <p className="text-2xl font-bold text-primary">
                      {clienteStats?.total ? ((clienteStats.ativos || 0) / clienteStats.total * 100).toFixed(0) : 0}%
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* RECURSOS */}
          <TabsContent value="recursos" className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <MetricCard title="Total Membros" value={recursosStats.totalMembros} icon={Users} variant="primary" />
              <MetricCard title="Alocados a Obras" value={recursosStats.alocados} icon={Briefcase} variant="success" />
              <MetricCard title="Custo Mensal" value={formatCurrency(recursosStats.custoTotalMensal)} icon={Wallet} variant="default" />
            </div>
            {recursosStats.membrosComObra.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <HardHat className="w-4 h-4 text-muted-foreground" />
                    Membros em Obra
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-border/50">
                    {recursosStats.membrosComObra.map(m => (
                      <Link key={m.id} to={`/recursos/${m.id}`} className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted/40 transition-colors group">
                        <div>
                          <p className="text-sm font-medium group-hover:text-primary transition-colors">{m.nome}</p>
                          <p className="text-xs text-muted-foreground">{m.cargo || 'Sem cargo'}</p>
                        </div>
                        {m.obra_atual && (
                          <Badge variant="secondary" className="text-xs">{(m.obra_atual as any)?.nome || 'Em obra'}</Badge>
                        )}
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
