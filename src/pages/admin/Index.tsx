import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, FileText, Wallet, AlertTriangle, UserCheck, Clock, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();

  // Fetch all profiles for user stats
  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all obras
  const { data: obras, isLoading: obrasLoading } = useQuery({
    queryKey: ["admin-obras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obras")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all orcamentos
  const { data: orcamentos, isLoading: orcamentosLoading } = useQuery({
    queryKey: ["admin-orcamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all contas_financeiras
  const { data: contasFinanceiras, isLoading: financeiroLoading } = useQuery({
    queryKey: ["admin-contas-financeiras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_financeiras")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const isLoading = profilesLoading || obrasLoading || orcamentosLoading || financeiroLoading;

  // Calculate stats
  const totalUsers = profiles?.length || 0;
  const trialExpired = profiles?.filter(p => p.trial_expired)?.length || 0;
  const activeTrials = profiles?.filter(p => !p.trial_expired)?.length || 0;
  
  const roleStats = profiles?.reduce((acc, p) => {
    acc[p.role] = (acc[p.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const totalObras = obras?.length || 0;
  const totalOrcamentos = orcamentos?.length || 0;

  const totalAPagar = contasFinanceiras?.filter(c => c.tipo === 'pagar' && !c.pago)?.reduce((sum, c) => sum + Number(c.valor), 0) || 0;
  const totalAReceber = contasFinanceiras?.filter(c => c.tipo === 'receber' && !c.pago)?.reduce((sum, c) => sum + Number(c.valor), 0) || 0;
  const contasVencidas = contasFinanceiras?.filter(c => !c.pago && new Date(c.data_vencimento) < new Date())?.length || 0;

  const navigationCards = [
    {
      title: "Gestão de Utilizadores",
      description: "Ver e gerir todos os utilizadores do sistema",
      icon: Users,
      href: "/admin/utilizadores",
      color: "text-blue-500"
    },
    {
      title: "Financeiro Global",
      description: "Visão agregada de todas as contas financeiras",
      icon: Wallet,
      href: "/admin/financeiro",
      color: "text-green-500"
    },
    {
      title: "Auditoria",
      description: "Logs de sistema e histórico de ações",
      icon: Clock,
      href: "/admin/auditoria",
      color: "text-orange-500"
    },
    {
      title: "Migração V1→V2",
      description: "Gestão de migração de utilizadores",
      icon: TrendingUp,
      href: "/admin/migracao",
      color: "text-purple-500"
    }
  ];

  return (
    <AppLayout
      title="Dashboard Administrativo"
      subtitle="Painel de controlo exclusivo para super administradores"
    >
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Utilizadores</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    {activeTrials} ativos, {trialExpired} expirados
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Obras</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalObras}</div>
                  <p className="text-xs text-muted-foreground">
                    Em todo o sistema
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orçamentos</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalOrcamentos}</div>
                  <p className="text-xs text-muted-foreground">
                    Em todo o sistema
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Volume Financeiro</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    €{((totalAReceber - totalAPagar) / 1000).toFixed(1)}k
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {contasVencidas > 0 && (
                      <span className="text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {contasVencidas} contas vencidas
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Role breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Utilizadores por Role
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {Object.entries(roleStats).map(([role, count]) => (
                    <div key={role} className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-sm text-muted-foreground capitalize">{role}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {navigationCards.map((card) => (
                <Card 
                  key={card.href}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(card.href)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <card.icon className={`h-8 w-8 ${card.color}`} />
                      <div>
                        <CardTitle className="text-lg">{card.title}</CardTitle>
                        <CardDescription>{card.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
