import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/relatorios/KpiCard";
import { TrendingUp, Users, Wallet, BarChart3, Star, ArrowUpRight } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
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

const PLAN_COLORS = ["hsl(36, 77%, 49%)", "hsl(199, 100%, 31%)", "hsl(199, 30%, 60%)"];

const chartConfig = {
  receita: { label: "Receita Mensal", color: "hsl(var(--primary))" },
  acumulado: { label: "Receita Acumulada", color: "hsl(var(--accent))" },
};

function getPlanBadge(plano: string) {
  if (plano === "Founder") {
    return (
      <Badge className="bg-amber-600/15 text-amber-700 border border-amber-300 hover:bg-amber-600/20 gap-1">
        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
        Parceiro Fundador
      </Badge>
    );
  }
  if (plano === "Professional") return <Badge variant="default">{plano}</Badge>;
  return <Badge variant="secondary">{plano}</Badge>;
}

export default function AdminFinanceiroGlobal() {
  const growthPercent = revenueChartData[5].receita > 0 && revenueChartData[4].receita > 0
    ? Math.round(((revenueChartData[5].receita - revenueChartData[4].receita) / revenueChartData[4].receita) * 100)
    : 0;

  return (
    <AdminLayout title="Financeiro Global" subtitle="Receitas de subscrições e planos">
      <div className="p-4 md:p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            title="MRR Atual"
            value={`€${totalMRR.toLocaleString("pt-PT")}`}
            icon={TrendingUp}
            description={`+${growthPercent}% vs mês anterior`}
          />
          <KpiCard
            title="Receita Acumulada"
            value={`€${revenueChartData[revenueChartData.length - 1].acumulado.toLocaleString("pt-PT")}`}
            icon={BarChart3}
            description="Desde o lançamento"
          />
          <KpiCard
            title="Utilizadores Pagantes"
            value={String(mockUsers.length)}
            icon={Users}
            description={`${founderCount} Founder · ${proCount} Pro · ${starterCount} Starter`}
          />
          <KpiCard
            title="Ticket Médio"
            value={`€${(totalMRR / mockUsers.length).toFixed(0)}`}
            icon={Wallet}
            description="Por utilizador"
          />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Evolução da Receita</CardTitle>
              <CardDescription className="text-xs">Últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueChartData} barCategoryGap="20%">
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

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Subscrições Ativas</CardTitle>
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
                {mockUsers.map((user) => (
                  <TableRow key={user.email}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary uppercase">
                          {user.email.charAt(0)}
                        </div>
                        <span className="text-sm truncate max-w-[200px]">{user.email}</span>
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
