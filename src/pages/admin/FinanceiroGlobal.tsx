import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Wallet, Crown, BarChart3, ArrowUpRight, Star } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

const mockUsers = [
  { email: "bruno.ferreira@ferreiralcantara.com", plano: "Founder", valor: 490, desde: "Fev 2026", tipo: "Vitalício" },
  { email: "adm.mtpichelariaeletricidade@hotmail.com", plano: "Founder", valor: 490, desde: "Mar 2026", tipo: "Vitalício" },
  { email: "inrioimobiliaria@gmail.com", plano: "Professional", valor: 99, desde: "Fev 2026", tipo: "Mensal" },
  { email: "modenoepeculiar@gmail.com", plano: "Starter", valor: 49, desde: "Fev 2026", tipo: "Mensal" },
  { email: "jmsplacido@gmail.com", plano: "Professional", valor: 99, desde: "Mar 2026", tipo: "Mensal" },
];

const totalMRR = mockUsers.reduce((sum, u) => sum + u.valor, 0);
const founderCount = mockUsers.filter(u => u.plano === "Founder").length;
const proCount = mockUsers.filter(u => u.plano === "Professional").length;
const starterCount = mockUsers.filter(u => u.plano === "Starter").length;
const founderRevenue = mockUsers.filter(u => u.plano === "Founder").reduce((s, u) => s + u.valor, 0);
const proRevenue = mockUsers.filter(u => u.plano === "Professional").reduce((s, u) => s + u.valor, 0);
const starterRevenue = mockUsers.filter(u => u.plano === "Starter").reduce((s, u) => s + u.valor, 0);

const revenueChartData = [
  { month: "Out 25", receita: 0, acumulado: 0 },
  { month: "Nov 25", receita: 0, acumulado: 0 },
  { month: "Dez 25", receita: 0, acumulado: 0 },
  { month: "Jan 26", receita: 0, acumulado: 0 },
  { month: "Fev 26", receita: 737, acumulado: 737 },
  { month: "Mar 26", receita: 1227, acumulado: 1964 },
];

const planDistribution = [
  { name: "Founder", value: founderRevenue, count: founderCount },
  { name: "Professional", value: proRevenue, count: proCount },
  { name: "Starter", value: starterRevenue, count: starterCount },
];

const PLAN_COLORS = [
  "hsl(36, 77%, 49%)",   // amber/founder
  "hsl(var(--primary))",  // primary/professional
  "hsl(var(--muted-foreground))", // muted/starter
];

const chartConfig = {
  receita: { label: "Receita Mensal", color: "hsl(var(--primary))" },
  acumulado: { label: "Receita Acumulada", color: "hsl(var(--accent))" },
};

function KpiCard({
  title, value, subtitle, icon: Icon, trend, trendLabel, accentClass = "text-primary",
}: {
  title: string; value: string; subtitle: string;
  icon: React.ElementType; trend?: string; trendLabel?: string;
  accentClass?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</CardTitle>
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className={`text-2xl md:text-3xl font-bold ${accentClass}`}>{value}</div>
        <div className="flex items-center gap-1.5 mt-1">
          {trend && (
            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600">
              <ArrowUpRight className="h-3 w-3" /> {trend}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{trendLabel || subtitle}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function getPlanBadge(plano: string) {
  if (plano === "Founder") {
    return (
      <Badge className="bg-amber-600/15 text-amber-700 border border-amber-300 hover:bg-amber-600/20 gap-1">
        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
        Parceiro Fundador
      </Badge>
    );
  }
  if (plano === "Professional") {
    return <Badge variant="default">{plano}</Badge>;
  }
  return <Badge variant="secondary">{plano}</Badge>;
}

export default function AdminFinanceiroGlobal() {
  const growthPercent = revenueChartData[5].receita > 0 && revenueChartData[4].receita > 0
    ? Math.round(((revenueChartData[5].receita - revenueChartData[4].receita) / revenueChartData[4].receita) * 100)
    : 0;

  return (
    <AppLayout
      title="Financeiro Global"
      subtitle="Visão agregada das receitas de subscrições"
    >
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <KpiCard
            title="MRR Atual"
            value={`€${totalMRR.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`}
            subtitle={`${mockUsers.length} subscrições ativas`}
            icon={TrendingUp}
            trend={`+${growthPercent}%`}
            trendLabel="vs mês anterior"
            accentClass="text-primary"
          />
          <KpiCard
            title="Receita Acumulada"
            value={`€${revenueChartData[revenueChartData.length - 1].acumulado.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`}
            subtitle="desde o lançamento"
            icon={BarChart3}
            accentClass="text-foreground"
          />
          <KpiCard
            title="Utilizadores Pagantes"
            value={String(mockUsers.length)}
            subtitle={`${founderCount} Founder · ${proCount} Pro · ${starterCount} Starter`}
            icon={Users}
          />
          <KpiCard
            title="Ticket Médio"
            value={`€${(totalMRR / mockUsers.length).toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`}
            subtitle="por utilizador/mês"
            icon={Wallet}
          />
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Revenue evolution */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Evolução da Receita</CardTitle>
              <CardDescription>Receita mensal e acumulada nos últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueChartData} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `€${v}`} tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="receita" fill="var(--color-receita)" name="Receita Mensal" radius={[6, 6, 0, 0]} />
                    <Line type="monotone" dataKey="acumulado" stroke="var(--color-acumulado)" strokeWidth={2} dot={{ r: 4 }} name="Acumulado" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Plan distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Distribuição por Plano</CardTitle>
              <CardDescription>Receita por tipo de subscrição</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
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

              <div className="space-y-2 mt-2">
                {planDistribution.map((plan, i) => (
                  <div key={plan.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: PLAN_COLORS[i] }}
                      />
                      <span className="text-muted-foreground">{plan.name}</span>
                      <span className="text-xs text-muted-foreground/60">({plan.count})</span>
                    </div>
                    <span className="font-medium">€{plan.value.toLocaleString("pt-PT")}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscriptions table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Subscrições Ativas</CardTitle>
                <CardDescription>{mockUsers.length} utilizadores com plano ativo</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {mockUsers.length} ativos
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
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
                {mockUsers.map((user) => (
                  <TableRow key={user.email}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium uppercase text-muted-foreground">
                          {user.email.charAt(0)}
                        </div>
                        <span className="font-medium text-sm">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getPlanBadge(user.plano)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {user.tipo === "Vitalício" ? "∞ Vitalício" : user.tipo}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{user.desde}</span>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm">
                      €{user.valor.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-emerald-300 text-emerald-600 bg-emerald-50/50">
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
    </AppLayout>
  );
}
