import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users, UserCheck, UserX, TrendingUp, Activity, Target,
  Building2, FileText, Clock, Zap,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { format, differenceInDays, subDays } from "date-fns";
import { pt } from "date-fns/locale";

const COLORS = [
  "hsl(210, 80%, 55%)",
  "hsl(142, 60%, 45%)",
  "hsl(45, 80%, 55%)",
  "hsl(0, 70%, 55%)",
  "hsl(270, 60%, 55%)",
  "hsl(180, 60%, 45%)",
];

export default function AdminAnalytics() {
  // All profiles
  const { data: profiles, isLoading: loadingProfiles } = useQuery({
    queryKey: ["analytics-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  // All engagement statuses
  const { data: engagementData, isLoading: loadingEngagement } = useQuery({
    queryKey: ["analytics-engagement"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_engagement_status").select("*");
      if (error) throw error;
      return data;
    },
  });

  // All obras count per user
  const { data: obrasData } = useQuery({
    queryKey: ["analytics-obras"],
    queryFn: async () => {
      const { data, error } = await supabase.from("obras").select("id, user_id, created_at");
      if (error) throw error;
      return data;
    },
  });

  // All orcamentos count per user
  const { data: orcamentosData } = useQuery({
    queryKey: ["analytics-orcamentos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orcamentos").select("id, user_id, created_at");
      if (error) throw error;
      return data;
    },
  });

  const isLoading = loadingProfiles || loadingEngagement;

  // ────────── Computed metrics ──────────
  const totalUsers = profiles?.length || 0;

  const now = new Date();
  const last7 = subDays(now, 7);
  const last30 = subDays(now, 30);

  // Active users (last action within 7 days)
  const activeUsers = engagementData?.filter(
    (e) => e.last_action_date && new Date(e.last_action_date) >= last7
  ).length || 0;

  // Users who logged in last 30 days
  const loggedLast30 = engagementData?.filter(
    (e) => e.last_login_date && new Date(e.last_login_date) >= last30
  ).length || 0;

  // Activation funnel
  const withProject = engagementData?.filter((e) => e.has_created_project).length || 0;
  const withBudget = engagementData?.filter((e) => e.has_created_budget).length || 0;
  const with3Records = engagementData?.filter((e) => e.total_records_created >= 3).length || 0;
  const with10Records = engagementData?.filter((e) => e.total_records_created >= 10).length || 0;

  const pct = (n: number) => totalUsers > 0 ? Math.round((n / totalUsers) * 100) : 0;

  // Engagement state distribution
  const stateA = engagementData?.filter((e) => !e.has_created_project).length || 0;
  const stateB = engagementData?.filter((e) => e.has_created_project && !e.has_created_budget).length || 0;
  const stateC = engagementData?.filter(
    (e) => e.has_created_budget && e.total_records_created < 3
  ).length || 0;
  const stateD = engagementData?.filter((e) => e.total_records_created >= 3).length || 0;

  const engagementStateData = [
    { name: "A - Sem Obra", value: stateA, fill: COLORS[3] },
    { name: "B - Sem Orçamento", value: stateB, fill: COLORS[2] },
    { name: "C - Baixa Atividade", value: stateC, fill: COLORS[0] },
    { name: "D - Ativo", value: stateD, fill: COLORS[1] },
  ].filter((d) => d.value > 0);

  // New users by week (last 8 weeks)
  const signupsByWeek = Array.from({ length: 8 }, (_, i) => {
    const weekStart = subDays(now, (7 - i) * 7 + 7);
    const weekEnd = subDays(now, (7 - i) * 7);
    const label = format(weekEnd, "dd/MM", { locale: pt });
    const count = profiles?.filter((p) => {
      const d = new Date(p.created_at);
      return d >= weekStart && d < weekEnd;
    }).length || 0;
    return { name: label, novos: count };
  });

  // Trial status — compute from trial_end date instead of unreliable boolean
  const isTrialExpiredByDate = (p: any) => {
    if (!p.trial_end) return false;
    return new Date(p.trial_end) < now;
  };
  const trialExpired = profiles?.filter((p) => isTrialExpiredByDate(p)).length || 0;
  const trialActive = (totalUsers - trialExpired);

  // Top users by records
  const topUsers = [...(engagementData || [])]
    .sort((a, b) => (b.total_records_created || 0) - (a.total_records_created || 0))
    .slice(0, 10);

  const getProfileByUserId = (userId: string) =>
    profiles?.find((p) => p.user_id === userId);

  // Dormant users (no action > 14 days)
  const dormantUsers = engagementData?.filter((e) => {
    if (!e.last_action_date) return true;
    return differenceInDays(now, new Date(e.last_action_date)) > 14;
  }).length || 0;

  return (
    <AppLayout
      title="Analytics & Retenção"
      subtitle="Métricas de engagement e ativação dos utilizadores"
    >
      <div className="p-4 md:p-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                icon={Users}
                title="Total Utilizadores"
                value={totalUsers}
                sub={`${loggedLast30} ativos (30d)`}
              />
              <KpiCard
                icon={Activity}
                title="Ativos (7d)"
                value={activeUsers}
                sub={`${pct(activeUsers)}% do total`}
                accent
              />
              <KpiCard
                icon={Target}
                title="Meta 3+ Registos"
                value={`${pct(with3Records)}%`}
                sub={`${with3Records} de ${totalUsers} utilizadores`}
              />
              <KpiCard
                icon={UserX}
                title="Dormentes (>14d)"
                value={dormantUsers}
                sub={`${pct(dormantUsers)}% do total`}
                destructive
              />
            </div>

            {/* Activation Funnel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Funil de Ativação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FunnelRow label="Registados" value={totalUsers} total={totalUsers} />
                <FunnelRow label="Criaram Obra" value={withProject} total={totalUsers} />
                <FunnelRow label="Criaram Orçamento" value={withBudget} total={totalUsers} />
                <FunnelRow label="3+ Registos" value={with3Records} total={totalUsers} />
                <FunnelRow label="10+ Registos (Power)" value={with10Records} total={totalUsers} />
              </CardContent>
            </Card>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Engagement States Pie */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribuição de Estados</CardTitle>
                </CardHeader>
                <CardContent>
                  {engagementStateData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={engagementStateData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                          labelLine={false}
                        >
                          {engagementStateData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend iconSize={10} wrapperStyle={{ fontSize: "12px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
                  )}
                </CardContent>
              </Card>

              {/* Signups by Week */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Novos Utilizadores por Semana</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={signupsByWeek}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="novos" fill="hsl(210, 80%, 55%)" name="Novos" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Trial Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <KpiCard icon={UserCheck} title="Trials Ativos" value={trialActive} sub="Dentro do período" />
              <KpiCard icon={Clock} title="Trials Expirados" value={trialExpired} sub="Necessitam conversão" destructive />
              <KpiCard
                icon={Zap}
                title="Taxa Conversão"
                value={`${totalUsers > 0 ? Math.round(((withBudget) / totalUsers) * 100) : 0}%`}
                sub="Criaram obra + orçamento"
              />
            </div>

            {/* Top Users Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Top 10 Utilizadores por Atividade
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                      const state = eu.total_records_created >= 3
                        ? "D"
                        : eu.has_created_budget
                        ? "C"
                        : eu.has_created_project
                        ? "B"
                        : "A";
                      return (
                        <TableRow key={eu.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{p?.nome || "—"}</p>
                              <p className="text-xs text-muted-foreground">{p?.email || "—"}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {eu.has_created_project ? (
                              <Badge variant="default" className="bg-primary/15 text-primary text-xs">Sim</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Não</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {eu.has_created_budget ? (
                              <Badge variant="default" className="bg-primary/15 text-primary text-xs">Sim</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Não</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-mono font-medium">
                            {eu.total_records_created}
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {eu.last_action_date
                              ? format(new Date(eu.last_action_date), "dd/MM/yyyy", { locale: pt })
                              : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            <StateBadge state={state} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {topUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Sem dados de engagement disponíveis
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}

// ─── Sub-components ───

function KpiCard({
  icon: Icon,
  title,
  value,
  sub,
  accent,
  destructive,
}: {
  icon: React.ElementType;
  title: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  destructive?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className={`text-2xl font-bold truncate ${destructive ? "text-destructive" : accent ? "text-primary" : "text-foreground"}`}>
              {value}
            </p>
            {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
          </div>
          <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${destructive ? "bg-destructive/10" : "bg-primary/10"}`}>
            <Icon className={`w-5 h-5 ${destructive ? "text-destructive" : "text-primary"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FunnelRow({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {value} <span className="text-xs">({pct}%)</span>
        </span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}

function StateBadge({ state }: { state: string }) {
  const map: Record<string, { label: string; className: string }> = {
    A: { label: "Sem Obra", className: "bg-destructive/15 text-destructive border-destructive/30" },
    B: { label: "Sem Orçamento", className: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-400" },
    C: { label: "Baixa Atividade", className: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400" },
    D: { label: "Ativo", className: "bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400" },
  };
  const s = map[state] || map.A;
  return <Badge variant="outline" className={`text-xs ${s.className}`}>{s.label}</Badge>;
}
