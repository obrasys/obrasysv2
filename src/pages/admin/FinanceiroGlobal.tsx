import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/relatorios/KpiCard";
import { TrendingUp, Users, Wallet, BarChart3, Star, Loader2 } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const PLAN_PRICES: Record<string, number> = {
  founder: 490,
  professional: 99,
  starter: 49,
  trial: 0,
};

const PLAN_LABELS: Record<string, string> = {
  founder: "Founder",
  professional: "Professional",
  starter: "Starter",
  trial: "Trial",
};

const PLAN_COLORS = ["hsl(36, 77%, 49%)", "hsl(199, 100%, 31%)", "hsl(199, 30%, 60%)"];

const chartConfig = {
  receita: { label: "Receita Mensal", color: "hsl(var(--primary))" },
  acumulado: { label: "Receita Acumulada", color: "hsl(var(--accent))" },
};

function getPlanBadge(plano: string) {
  if (plano === "founder") {
    return (
      <Badge className="bg-amber-600/15 text-amber-700 border border-amber-300 hover:bg-amber-600/20 gap-1">
        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
        Parceiro Fundador
      </Badge>
    );
  }
  if (plano === "professional") return <Badge variant="default">Professional</Badge>;
  return <Badge variant="secondary">{PLAN_LABELS[plano] || plano}</Badge>;
}

export default function AdminFinanceiroGlobal() {
  const { data: subs, isLoading } = useQuery({
    queryKey: ["admin-financeiro-subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscribers")
        .select("user_id, email, subscription_tier, subscription_status, subscription_end, subscribed, updated_at, created_at")
        .eq("subscribed", true)
        .in("subscription_tier", ["founder", "professional", "starter"])
        .in("subscription_status", ["active", "trialing"])
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60_000,
  });

  const payingUsers = (subs || []).map((s) => ({
    email: s.email,
    plano: s.subscription_tier || "trial",
    valor: PLAN_PRICES[s.subscription_tier || "trial"] || 0,
    desde: s.created_at ? format(new Date(s.created_at), "MMM yyyy", { locale: pt }) : "—",
    tipo: s.subscription_tier === "founder" ? "Vitalício" : "Mensal",
  }));

  const totalMRR = payingUsers
    .filter((u) => u.plano !== "founder")
    .reduce((sum, u) => sum + u.valor, 0);
  const founderCount = payingUsers.filter((u) => u.plano === "founder").length;
  const proCount = payingUsers.filter((u) => u.plano === "professional").length;
  const starterCount = payingUsers.filter((u) => u.plano === "starter").length;
  const founderRevenue = payingUsers.filter((u) => u.plano === "founder").reduce((s, u) => s + u.valor, 0);
  const proRevenue = proCount * PLAN_PRICES.professional;
  const starterRevenue = starterCount * PLAN_PRICES.starter;
  const totalAccumulated = founderRevenue + proRevenue + starterRevenue;

  const planDistribution = [
    { name: "Founder", value: founderRevenue, count: founderCount },
    { name: "Professional", value: proRevenue, count: proCount },
    { name: "Starter", value: starterRevenue, count: starterCount },
  ];

  // Build a 6-month trailing revenue chart from created_at
  const now = new Date();
  const months: { key: string; month: string; receita: number; acumulado: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: format(d, "MMM yy", { locale: pt }),
      receita: 0,
      acumulado: 0,
    });
  }
  (subs || []).forEach((s) => {
    if (!s.created_at) return;
    const d = new Date(s.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const slot = months.find((m) => m.key === key);
    if (slot && s.subscription_tier && s.subscription_tier !== "founder") {
      slot.receita += PLAN_PRICES[s.subscription_tier] || 0;
    }
  });
  let acc = 0;
  months.forEach((m) => {
    acc += m.receita;
    m.acumulado = acc;
  });

  const growthPercent =
    months[5].receita > 0 && months[4].receita > 0
      ? Math.round(((months[5].receita - months[4].receita) / months[4].receita) * 100)
      : 0;

  if (isLoading) {
    return (
      <AdminLayout title="Financeiro Global" subtitle="Receitas de subscrições e planos">
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Financeiro Global" subtitle="Receitas de subscrições e planos">
      <div className="p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            title="MRR Atual"
            value={`€${totalMRR.toLocaleString("pt-PT")}`}
            icon={TrendingUp}
            description={growthPercent !== 0 ? `${growthPercent > 0 ? "+" : ""}${growthPercent}% vs mês anterior` : "Receita recorrente"}
          />
          <KpiCard
            title="Receita Acumulada"
            value={`€${totalAccumulated.toLocaleString("pt-PT")}`}
            icon={BarChart3}
            description="Inclui Founder vitalício"
          />
          <KpiCard
            title="Utilizadores Pagantes"
            value={String(payingUsers.length)}
            icon={Users}
            description={`${founderCount} Founder · ${proCount} Pro · ${starterCount} Starter`}
          />
          <KpiCard
            title="Ticket Médio"
            value={`€${payingUsers.length > 0 ? (totalMRR / Math.max(proCount + starterCount, 1)).toFixed(0) : 0}`}
            icon={Wallet}
            description="Por utilizador mensal"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Evolução da Receita</CardTitle>
              <CardDescription className="text-xs">Últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={months} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `€${v}`} tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="receita" fill="var(--color-receita)" name="Receita Mensal" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Por Plano</CardTitle>
              <CardDescription className="text-xs">Distribuição de receita</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={4}
                      strokeWidth={2}
                    >
                      {planDistribution.map((_, i) => (
                        <Cell key={i} fill={PLAN_COLORS[i]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
              <div className="space-y-2 mt-3">
                {planDistribution.map((plan, i) => (
                  <div key={plan.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PLAN_COLORS[i] }} />
                      <span className="text-muted-foreground text-xs">{plan.name} ({plan.count})</span>
                    </div>
                    <span className="font-medium text-xs">€{plan.value.toLocaleString("pt-PT")}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Subscrições Ativas ({payingUsers.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilizador</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payingUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                      Sem subscrições ativas
                    </TableCell>
                  </TableRow>
                )}
                {payingUsers.map((user) => (
                  <TableRow key={user.email}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary uppercase">
                          {user.email.charAt(0)}
                        </div>
                        <span className="text-sm truncate max-w-[260px]">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getPlanBadge(user.plano)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {user.tipo === "Vitalício" ? "∞ Vitalício" : user.tipo}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{user.desde}</TableCell>
                    <TableCell className="text-right font-semibold text-sm">
                      €{user.valor.toLocaleString("pt-PT")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-emerald-300 text-emerald-600 bg-emerald-50/50 text-xs">
                        Ativo
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
