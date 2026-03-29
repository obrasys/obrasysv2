import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Wallet, Users } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

const mockUsers = [
  { email: "bruno.ferreira@ferreiralcantara.com", plano: "Founder", valor: 490 },
  { email: "inrioimobiliaria@gmail.com", plano: "Professional", valor: 99 },
  { email: "modenoepeculiar@gmail.com", plano: "Starter", valor: 49 },
  { email: "jmsplacido@gmail.com", plano: "Professional", valor: 99 },
];

const totalMRR = mockUsers.reduce((sum, u) => sum + u.valor, 0);

const chartData = [
  { month: "Nov 2025", receita: 0 },
  { month: "Dez 2025", receita: 0 },
  { month: "Jan 2026", receita: 0 },
  { month: "Fev 2026", receita: 247 },
  { month: "Mar 2026", receita: 737 },
];

const chartConfig = {
  receita: {
    label: "Receita Mensal",
    color: "hsl(var(--primary))",
  },
};

export default function AdminFinanceiroGlobal() {
  return (
    <AppLayout
      title="Financeiro Global"
      subtitle="Visão agregada das receitas de subscrições"
    >
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MRR (Receita Mensal)</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                €{totalMRR.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                {mockUsers.length} subscrições ativas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilizadores Pagantes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockUsers.length}</div>
              <p className="text-xs text-muted-foreground">
                 {mockUsers.filter(u => u.plano === "Founder").length} Founder · {mockUsers.filter(u => u.valor === 99).length} Professional · {mockUsers.filter(u => u.valor === 49).length} Starter
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                €{(totalMRR / mockUsers.length).toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">por utilizador/mês</p>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução da Receita Mensal (últimos 6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `€${value}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="receita" fill="var(--color-receita)" name="Receita Mensal" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Subscrições Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilizador</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-right">Valor Mensal</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockUsers.map((user) => (
                  <TableRow key={user.email}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                     <TableCell>
                       <Badge variant={user.plano === "Founder" ? "default" : user.plano === "Professional" ? "default" : "secondary"} className={user.plano === "Founder" ? "bg-amber-600 hover:bg-amber-700" : ""}>
                         {user.plano === "Founder" ? "⭐ Founder" : user.plano}
                       </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      €{user.valor.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-green-600 border-green-300">Ativo</Badge>
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
