import { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KpiCard, ReportPieChart, ReportBarChart } from '@/components/relatorios';
import { useRelatorios } from '@/hooks/useRelatorios';
import { useFormatting } from '@/hooks/useFormatting';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { UpgradePromptModal } from '@/components/subscription/UpgradePromptModal';
import { Loader2, Building2, FileText, Users, CheckSquare, Wallet, TrendingUp, BarChart3, Clock, AlertTriangle, UserCheck, Briefcase, ArrowUpRight, ArrowDownRight, Scale, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { STATUS_CONFIG } from '@/types/orcamentos';

export default function RelatoriosPage() {
  const { isLoading, resumo, orcamentoStats, obraStats, tarefaStats, clienteStats, financeiroDashboard, margensLucro, recursosStats } = useRelatorios();
  const { formatCurrency } = useFormatting();
  const { hasFeature, tier } = useFeatureGate();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const canAccessFullReports = hasFeature('relatoriosPersonalizados');
  const { formatCurrency } = useFormatting();

  if (isLoading) {
    return (
      <AppLayout title="Relatórios" subtitle="Visão geral da atividade">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Relatórios" subtitle="Visão geral da sua atividade">
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <Tabs defaultValue="resumo" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="orcamentos">Orçamentos</TabsTrigger>
            <TabsTrigger value="obras">Obras</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
            <TabsTrigger value="clientes">Clientes</TabsTrigger>
            <TabsTrigger value="recursos">Recursos</TabsTrigger>
          </TabsList>

          {/* RESUMO */}
          <TabsContent value="resumo" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard title="Obras" value={resumo.totalObras} icon={Building2} />
              <KpiCard title="Orçamentos" value={resumo.totalOrcamentos} icon={FileText} />
              <KpiCard title="Clientes" value={resumo.totalClientes} icon={Users} />
              <KpiCard title="Valor Obras" value={formatCurrency(resumo.valorTotalObras)} icon={TrendingUp} />
              <KpiCard title="Saldo" value={formatCurrency(resumo.saldoFinanceiro)} icon={Wallet} />
              <KpiCard title="Tarefas" value={resumo.totalTarefas} icon={CheckSquare} />
            </div>
            <ReportBarChart
              title="Receitas vs Despesas"
              data={[
                { name: 'Receitas', valor: resumo.receitas },
                { name: 'Despesas', valor: resumo.despesas },
              ]}
              bars={[
                { dataKey: 'valor', fill: 'hsl(142, 60%, 45%)', name: 'Valor' },
              ]}
              formatValue={(v) => formatCurrency(v)}
            />
          </TabsContent>

          {/* ORÇAMENTOS */}
          <TabsContent value="orcamentos" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <KpiCard title="Total" value={orcamentoStats.total} icon={FileText} />
              <KpiCard title="Rascunho" value={orcamentoStats.rascunho} icon={FileText} description={formatCurrency(orcamentoStats.valorRascunho)} />
              <KpiCard title="Enviados" value={orcamentoStats.enviados} icon={FileText} description={formatCurrency(orcamentoStats.valorEnviados)} />
              <KpiCard title="Adjudicados" value={orcamentoStats.adjudicados} icon={FileText} description={formatCurrency(orcamentoStats.valorAdjudicados)} />
              <KpiCard title="Rejeitados" value={orcamentoStats.rejeitados} icon={FileText} description={formatCurrency(orcamentoStats.valorRejeitados)} />
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
                bars={[{ dataKey: 'valor', fill: 'hsl(210, 80%, 55%)', name: 'Valor' }]}
                formatValue={(v) => formatCurrency(v)}
              />
            </div>
            {orcamentoStats.recentes.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Últimos Orçamentos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {orcamentoStats.recentes.map(o => (
                    <Link key={o.id} to={`/orcamentos/${o.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{o.titulo}</p>
                        <p className="text-xs text-muted-foreground">{o.codigo}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="secondary" className={`${STATUS_CONFIG[o.status]?.bgColor} ${STATUS_CONFIG[o.status]?.color} text-xs`}>
                          {STATUS_CONFIG[o.status]?.label}
                        </Badge>
                        <span className="text-sm font-medium">{formatCurrency(o.valor_total || 0)}</span>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* OBRAS */}
          <TabsContent value="obras" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <KpiCard title="Total" value={obraStats.total} icon={Building2} />
              <KpiCard title="Em Curso" value={obraStats.emCurso} icon={Building2} />
              <KpiCard title="Planeamento" value={obraStats.planeamento} icon={Clock} />
              <KpiCard title="Concluídas" value={obraStats.concluidas} icon={CheckSquare} />
              <KpiCard title="Pausadas" value={obraStats.pausadas} icon={AlertTriangle} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <ReportPieChart title="Distribuição por Estado" data={obraStats.statusData} />
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Indicadores</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Progresso Médio (ativas)</span>
                    <span className="text-lg font-bold">{obraStats.progressoMedio.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Valor Total Obras</span>
                    <span className="text-lg font-bold">{formatCurrency(obraStats.valorTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total RDOs</span>
                    <span className="text-lg font-bold">{obraStats.totalRDOs}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Autos de Medição</span>
                    <span className="text-lg font-bold">{obraStats.totalAutos}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* FINANCEIRO */}
          <TabsContent value="financeiro" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard title="A Pagar" value={formatCurrency(financeiroDashboard?.totalPagar || 0)} icon={ArrowDownRight} iconClassName="bg-destructive/10" />
              <KpiCard title="A Receber" value={formatCurrency(financeiroDashboard?.totalReceber || 0)} icon={ArrowUpRight} iconClassName="bg-green-500/10" />
              <KpiCard title="Saldo" value={formatCurrency(financeiroDashboard?.saldo || 0)} icon={Scale} />
              <KpiCard title="Contas Vencidas" value={financeiroDashboard?.vencidas || 0} icon={AlertTriangle} description={formatCurrency(financeiroDashboard?.valorVencido || 0)} />
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
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Margens de Lucro</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Valor Base (custos)</span>
                    <span className="text-lg font-bold">{formatCurrency(margensLucro.valorBase)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Valor com Margem</span>
                    <span className="text-lg font-bold">{formatCurrency(margensLucro.valorComMargem)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Lucro Total</span>
                    <span className="text-lg font-bold text-primary">{formatCurrency(margensLucro.lucroTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Margem Média</span>
                    <span className="text-lg font-bold">{margensLucro.margemMedia.toFixed(1)}%</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAREFAS */}
          <TabsContent value="tarefas" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard title="Total" value={tarefaStats?.total || 0} icon={CheckSquare} />
              <KpiCard title="Pendentes" value={tarefaStats?.pendentes || 0} icon={Clock} />
              <KpiCard title="Em Progresso" value={tarefaStats?.emProgresso || 0} icon={BarChart3} />
              <KpiCard title="Concluídas" value={tarefaStats?.concluidas || 0} icon={CheckSquare} />
              <KpiCard title="Atrasadas" value={tarefaStats?.atrasadas || 0} icon={AlertTriangle} iconClassName="bg-destructive/10" />
              <KpiCard title="Urgentes" value={tarefaStats?.urgentes || 0} icon={AlertTriangle} iconClassName="bg-orange-500/10" />
            </div>
            <ReportPieChart
              title="Distribuição por Estado"
              data={[
                { name: 'Pendente', value: tarefaStats?.pendentes || 0, fill: 'hsl(45, 80%, 55%)' },
                { name: 'Em Progresso', value: tarefaStats?.emProgresso || 0, fill: 'hsl(210, 80%, 55%)' },
                { name: 'Concluída', value: tarefaStats?.concluidas || 0, fill: 'hsl(142, 60%, 45%)' },
              ].filter(d => d.value > 0)}
            />
          </TabsContent>

          {/* CLIENTES */}
          <TabsContent value="clientes" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <KpiCard title="Total" value={clienteStats?.total || 0} icon={Users} />
              <KpiCard title="Ativos" value={clienteStats?.ativos || 0} icon={UserCheck} />
              <KpiCard title="Inativos" value={clienteStats?.inativos || 0} icon={Users} />
            </div>
            <ReportPieChart
              title="Distribuição por Nível de Acesso"
              data={[
                { name: 'Básico', value: clienteStats?.porNivel?.basico || 0, fill: 'hsl(210, 80%, 55%)' },
                { name: 'Intermediário', value: clienteStats?.porNivel?.intermediario || 0, fill: 'hsl(45, 80%, 55%)' },
                { name: 'Completo', value: clienteStats?.porNivel?.completo || 0, fill: 'hsl(142, 60%, 45%)' },
              ].filter(d => d.value > 0)}
            />
          </TabsContent>

          {/* RECURSOS */}
          <TabsContent value="recursos" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <KpiCard title="Total Membros" value={recursosStats.totalMembros} icon={Users} />
              <KpiCard title="Alocados a Obras" value={recursosStats.alocados} icon={Briefcase} />
              <KpiCard title="Custo Mensal Total" value={formatCurrency(recursosStats.custoTotalMensal)} icon={Wallet} />
            </div>
            {recursosStats.membrosComObra.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Membros em Obra</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recursosStats.membrosComObra.map(m => (
                    <Link key={m.id} to={`/recursos/${m.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{m.nome}</p>
                        <p className="text-xs text-muted-foreground">{m.cargo || 'Sem cargo'}</p>
                      </div>
                      {m.obra_atual && (
                        <Badge variant="secondary" className="text-xs">{(m.obra_atual as any)?.nome || 'Em obra'}</Badge>
                      )}
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
