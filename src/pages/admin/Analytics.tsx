import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { KpiCard } from "@/components/relatorios/KpiCard";
import {
  Users, UserCheck, UserX, TrendingUp, Activity, Target, Building2, Clock, Zap,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { format, differenceInDays, subDays } from "date-fns";
import { pt } from "date-fns/locale";

const COLORS = [
  "hsl(0, 70%, 55%)", "hsl(45, 80%, 55%)", "hsl(210, 80%, 55%)", "hsl(142, 60%, 45%)",
];

export default function AdminAnalytics() {
  const { data: profiles, isLoading: lp } = useQuery({
    queryKey: ["analytics-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: engagementData, isLoading: le } = useQuery({
    queryKey: ["analytics-engagement"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_engagement_status").select("*");
      if (error) throw error;
      return data;
    },
  });

  const isLoading = lp || le;
  const now = new Date();
  const last7 = subDays(now, 7);
  const last30 = subDays(now, 30);
  const totalUsers = profiles?.length || 0;

  const activeUsers = engagementData?.filter(e => e.last_action_date && new Date(e.last_action_date) >= last7).length || 0;
  const loggedLast30 = engagementData?.filter(e => e.last_login_date && new Date(e.last_login_date) >= last30).length || 0;
  const withProject = engagementData?.filter(e => e.has_created_project).length || 0;
  const withBudget = engagementData?.filter(e => e.has_created_budget).length || 0;
  const with3Records = engagementData?.filter(e => e.total_records_created >= 3).length || 0;
  const with10Records = engagementData?.filter(e => e.total_records_created >= 10).length || 0;
  const dormantUsers = engagementData?.filter(e => {
    if (!e.last_action_date) return true;
    return differenceInDays(now, new Date(e.last_action_date)) > 14;
  }).length || 0;

  const pct = (n: number) => totalUsers > 0 ? Math.round((n / totalUsers) * 100) : 0;

  const stateA = engagementData?.filter(e => !e.has_created_project).length || 0;
  const stateB = engagementData?.filter(e => e.has_created_project && !e.has_created_budget).length || 0;
  const stateC = engagementData?.filter(e => e.has_created_budget && e.total_records_created < 3).length || 0;
  const stateD = engagementData?.filter(e => e.total_records_created >= 3).length || 0;

  const engagementStateData = [
    { name: "Sem Obra", value: stateA, fill: COLORS[0] },
    { name: "Sem Orçamento", value: stateB, fill: COLORS[1] },
    { name: "Baixa Atividade", value: stateC, fill: COLORS[2] },
    { name: "Ativo", value: stateD, fill: COLORS[3] },
  ].filter(d => d.value > 0);

  const signupsByWeek = Array.from({ length: 8 }, (_, i) => {
    const weekStart = subDays(now, (7 - i) * 7 + 7);
    const weekEnd = subDays(now, (7 - i) * 7);
    return {
      name: format(weekEnd, "dd/MM", { locale: pt }),
      novos: profiles?.filter(p => { const d = new Date(p.created_at); return d >= weekStart && d < weekEnd; }).length || 0,
    };
  });

  const isTrialExpiredByDate = (p: any) => p.trial_end && new Date(p.trial_end) < now;
  const trialExpired = profiles?.filter(isTrialExpiredByDate).length || 0;
  const trialActive = totalUsers - trialExpired;

  const topUsers = [...(engagementData || [])]
    .sort((a, b) => (b.total_records_created || 0) - (a.total_records_created || 0))
    .slice(0, 10);

  const getProfileByUserId = (userId: string) => profiles?.find(p => p.user_id === userId);

  const funnelSteps = [
    { label: "Registados", value: totalUsers },
    { label: "Criaram Obra", value: withProject },
    { label: "Criaram Orçamento", value: withBudget },
    { label: "3+ Registos", value: with3Records },
    { label: "10+ Registos (Power)", value: with10Records },
  ];

  return (
    <AdminLayout title="Analytics & Retenção" subtitle="Métricas de engagement e ativação">
      <div className="p-4 md:p-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard icon={Users} title="Total Utilizadores" value={totalUsers} description={`${loggedLast30} ativos (30d)`} />
              <KpiCard icon={Activity} title="Ativos (7d)" value={activeUsers} description={`${pct(activeUsers)}% do total`} />
              <KpiCard icon={Target} title="Meta 3+ Registos" value={`${pct(with3Records)}%`} description={`${with3Records} de ${totalUsers}`} />
              <KpiCard icon={UserX} title="Dormentes (>14d)" value={dormantUsers} description={`${pct(dormantUsers)}% do total`} iconClassName="bg-destructive/10" />
            </div>

            {/* Funnel */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Funil de Ativação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {funnelSteps.map((step) => {
                  const p = totalUsers > 0 ? Math.round((step.value / totalUsers) * 100) : 0;
                  return (
                    <div key={step.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-xs">{step.label}</span>
                        <span className="text-muted-foreground text-xs">{step.value} ({p}%)</span>
                      </div>
                      <Progress value={p} className="h-1.5" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Estados de Engagement</CardTitle>
                </CardHeader>
                <CardContent>
                  {engagementStateData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={engagementStateData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" labelLine={false}>
                          {engagementStateData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Novos por Semana</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={signupsByWeek}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="novos" fill="hsl(199, 100%, 31%)" name="Novos" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Trial status */}
            <div className="grid grid-cols-3 gap-3">
              <KpiCard icon={UserCheck} title="Trials Ativos" value={trialActive} description="Dentro do período" />
              <KpiCard icon={Clock} title="Trials Expirados" value={trialExpired} description="Necessitam conversão" iconClassName="bg-destructive/10" />
              <KpiCard icon={Zap} title="Taxa Conversão" value={`${pct(withBudget)}%`} description="Criaram obra + orçamento" />
            </div>

            {/* Top Users */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Top 10 por Atividade
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilizador</TableHead>
                      <TableHead className="text-center">Obra</TableHead>
                      <TableHead className="text-center">Orçamento</TableHead>
                      <TableHead className="text-center">Registos</TableHead>
                      <TableHead className="text-center">Última Ação</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topUsers.map((eu) => {
                      const p = getProfileByUserId(eu.user_id);
                      const state = eu.total_records_created >= 3 ? "D" : eu.has_created_budget ? "C" : eu.has_created_project ? "B" : "A";
                      const stateMap: Record<string, { label: string; cls: string }> = {
                        A: { label: "Sem Obra", cls: "bg-destructive/15 text-destructive border-destructive/30" },
                        B: { label: "Sem Orçamento", cls: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
                        C: { label: "Baixa Atividade", cls: "bg-blue-500/15 text-blue-700 border-blue-500/30" },
                        D: { label: "Ativo", cls: "bg-green-500/15 text-green-700 border-green-500/30" },
                      };
                      const s = stateMap[state];
                      return (
                        <TableRow key={eu.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{p?.nome || "—"}</p>
                              <p className="text-xs text-muted-foreground">{p?.email || "—"}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={eu.has_created_project ? "default" : "outline"} className="text-xs">
                              {eu.has_created_project ? "Sim" : "Não"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={eu.has_created_budget ? "default" : "outline"} className="text-xs">
                              {eu.has_created_budget ? "Sim" : "Não"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono font-medium text-sm">{eu.total_records_created}</TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {eu.last_action_date ? format(new Date(eu.last_action_date), "dd/MM/yyyy", { locale: pt }) : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`text-xs ${s.cls}`}>{s.label}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {topUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sem dados disponíveis</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
