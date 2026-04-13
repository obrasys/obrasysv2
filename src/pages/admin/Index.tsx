import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserUsageMap } from "@/components/admin/UserUsageMap";
import { KpiCard } from "@/components/relatorios/KpiCard";
import {
  Users, Building2, FileText, Wallet, AlertTriangle, UserCheck,
  TrendingUp, Activity, Crown, TicketCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const { data: profiles, isLoading: p1 } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: obras, isLoading: p2 } = useQuery({
    queryKey: ["admin-obras"],
    queryFn: async () => {
      const { data, error } = await supabase.from("obras").select("id");
      if (error) throw error;
      return data;
    },
  });

  const { data: orcamentos, isLoading: p3 } = useQuery({
    queryKey: ["admin-orcamentos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orcamentos").select("id");
      if (error) throw error;
      return data;
    },
  });

  const { data: contasFinanceiras, isLoading: p4 } = useQuery({
    queryKey: ["admin-contas-financeiras"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contas_financeiras").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: tickets } = useQuery({
    queryKey: ["admin-tickets-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, status");
      if (error) throw error;
      return data;
    },
  });

  const isLoading = p1 || p2 || p3 || p4;

  const totalUsers = profiles?.length || 0;
  const isTrialExpiredByDate = (p: any) => p.trial_end && new Date(p.trial_end) < new Date();
  const trialExpired = profiles?.filter(isTrialExpiredByDate)?.length || 0;
  const activeTrials = totalUsers - trialExpired;

  const roleStats = profiles?.reduce((acc, p) => {
    acc[p.role] = (acc[p.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const totalObras = obras?.length || 0;
  const totalOrcamentos = orcamentos?.length || 0;

  const totalAPagar = contasFinanceiras?.filter(c => c.tipo === 'pagar' && !c.pago)?.reduce((sum, c) => sum + Number(c.valor), 0) || 0;
  const totalAReceber = contasFinanceiras?.filter(c => c.tipo === 'receber' && !c.pago)?.reduce((sum, c) => sum + Number(c.valor), 0) || 0;
  const contasVencidas = contasFinanceiras?.filter(c => !c.pago && new Date(c.data_vencimento) < new Date())?.length || 0;

  const openTickets = tickets?.filter(t => t.status !== 'resolvido')?.length || 0;

  const quickActions = [
    {
      label: "Utilizadores",
      value: String(totalUsers),
      description: `${activeTrials} ativos · ${trialExpired} expirados`,
      icon: Users,
      href: "/admin/utilizadores",
    },
    {
      label: "Financeiro",
      value: `€${((totalAReceber - totalAPagar) / 1000).toFixed(1)}k`,
      description: contasVencidas > 0 ? `${contasVencidas} vencidas` : "Sem contas vencidas",
      icon: Wallet,
      href: "/admin/financeiro",
    },
    {
      label: "Tickets Abertos",
      value: String(openTickets),
      description: "Necessitam resposta",
      icon: TicketCheck,
      href: "/admin/tickets",
    },
    {
      label: "Analytics",
      value: `${totalObras + totalOrcamentos}`,
      description: `${totalObras} obras · ${totalOrcamentos} orçamentos`,
      icon: Activity,
      href: "/admin/analytics",
    },
  ];

  return (
    <AdminLayout
      title="Painel Administrativo"
      subtitle="Visão geral do sistema"
    >
      <div className="p-4 md:p-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                title="Total Utilizadores"
                value={totalUsers}
                icon={Users}
                description={`${activeTrials} ativos`}
              />
              <KpiCard
                title="Total Obras"
                value={totalObras}
                icon={Building2}
                description="Em todo o sistema"
              />
              <KpiCard
                title="Total Orçamentos"
                value={totalOrcamentos}
                icon={FileText}
                description="Em todo o sistema"
              />
              <KpiCard
                title="Volume Financeiro"
                value={`€${((totalAReceber - totalAPagar) / 1000).toFixed(1)}k`}
                icon={Wallet}
                description={contasVencidas > 0 ? `${contasVencidas} vencidas` : "Sem pendências"}
              />
            </div>

            {/* Quick Access Cards */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Acesso Rápido</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {quickActions.map((action) => (
                  <Card
                    key={action.href}
                    className="group cursor-pointer hover:border-primary/40 hover:shadow-md transition-all duration-200"
                    onClick={() => navigate(action.href)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">{action.label}</p>
                          <p className="text-xl font-bold text-foreground">{action.value}</p>
                          <p className="text-[11px] text-muted-foreground">{action.description}</p>
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <action.icon className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Roles Distribution */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Distribuição por Role
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {Object.entries(roleStats).map(([role, count]) => (
                    <div key={role} className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-lg font-bold text-foreground">{count}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{role}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Alerts */}
            {(contasVencidas > 0 || trialExpired > 0) && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Atenção Necessária</p>
                      <div className="flex flex-wrap gap-2">
                        {contasVencidas > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {contasVencidas} contas vencidas
                          </Badge>
                        )}
                        {trialExpired > 0 && (
                          <Badge variant="outline" className="text-xs border-destructive/40 text-destructive">
                            {trialExpired} trials expirados
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* User Usage Map */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Mapa de Utilização
              </h2>
              <UserUsageMap />
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
