import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp, TrendingDown, AlertTriangle, Wallet } from "lucide-react";
import { format, isAfter, isBefore } from "date-fns";
import { pt } from "date-fns/locale";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export default function AdminFinanceiroGlobal() {
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch all contas_financeiras with profile info
  const { data: contas, isLoading } = useQuery({
    queryKey: ["admin-all-contas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_financeiras")
        .select(`
          *,
          profiles:user_id (nome, email),
          obras:obra_id (nome)
        `)
        .order("data_vencimento", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Calculate totals
  const totalAPagar = contas?.filter(c => c.tipo === 'pagar' && !c.pago)?.reduce((sum, c) => sum + Number(c.valor), 0) || 0;
  const totalAReceber = contas?.filter(c => c.tipo === 'receber' && !c.pago)?.reduce((sum, c) => sum + Number(c.valor), 0) || 0;
  const totalPago = contas?.filter(c => c.tipo === 'pagar' && c.pago)?.reduce((sum, c) => sum + Number(c.valor), 0) || 0;
  const totalRecebido = contas?.filter(c => c.tipo === 'receber' && c.pago)?.reduce((sum, c) => sum + Number(c.valor), 0) || 0;
  
  const contasVencidas = contas?.filter(c => !c.pago && isBefore(new Date(c.data_vencimento), new Date())) || [];

  // Filter contas
  const filteredContas = contas?.filter((conta) => {
    const matchesSearch = 
      conta.descricao?.toLowerCase().includes(search.toLowerCase()) ||
      (conta.profiles as any)?.nome?.toLowerCase().includes(search.toLowerCase()) ||
      (conta.profiles as any)?.email?.toLowerCase().includes(search.toLowerCase()) ||
      (conta.obras as any)?.nome?.toLowerCase().includes(search.toLowerCase());
    
    const matchesTipo = tipoFilter === "all" || conta.tipo === tipoFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "pendente" && !conta.pago) ||
      (statusFilter === "pago" && conta.pago) ||
      (statusFilter === "vencido" && !conta.pago && isBefore(new Date(conta.data_vencimento), new Date()));
    
    return matchesSearch && matchesTipo && matchesStatus;
  });

  // Prepare chart data by month
  const chartData = (() => {
    if (!contas) return [];
    
    const monthlyData: Record<string, { month: string; pagar: number; receber: number }> = {};
    
    contas.forEach(conta => {
      const monthKey = format(new Date(conta.data_vencimento), "yyyy-MM");
      const monthLabel = format(new Date(conta.data_vencimento), "MMM yyyy", { locale: pt });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthLabel, pagar: 0, receber: 0 };
      }
      
      if (conta.tipo === 'pagar') {
        monthlyData[monthKey].pagar += Number(conta.valor);
      } else {
        monthlyData[monthKey].receber += Number(conta.valor);
      }
    });
    
    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  })();

  const chartConfig = {
    pagar: {
      label: "A Pagar",
      color: "hsl(var(--destructive))",
    },
    receber: {
      label: "A Receber",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <AppLayout
      title="Financeiro Global"
      subtitle="Visão agregada de todas as contas financeiras do sistema"
    >
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">A Pagar</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                €{totalAPagar.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                {contas?.filter(c => c.tipo === 'pagar' && !c.pago)?.length || 0} contas pendentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">A Receber</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                €{totalAReceber.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                {contas?.filter(c => c.tipo === 'receber' && !c.pago)?.length || 0} contas pendentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balanço</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalAReceber - totalAPagar >= 0 ? "text-primary" : "text-destructive"}`}>
                €{(totalAReceber - totalAPagar).toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Receber - Pagar
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contas Vencidas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {contasVencidas.length}
              </div>
              <p className="text-xs text-muted-foreground">
                €{contasVencidas.reduce((sum, c) => sum + Number(c.valor), 0).toLocaleString("pt-PT", { minimumFractionDigits: 2 })} em atraso
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução Mensal (últimos 6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="receber" fill="var(--color-receber)" name="A Receber" />
                  <Bar dataKey="pagar" fill="var(--color-pagar)" name="A Pagar" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Filters and Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por descrição, utilizador ou obra..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pagar">A Pagar</SelectItem>
                  <SelectItem value="receber">A Receber</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilizador</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContas?.slice(0, 50).map((conta) => {
                    const isVencida = !conta.pago && isBefore(new Date(conta.data_vencimento), new Date());
                    return (
                      <TableRow key={conta.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{(conta.profiles as any)?.nome || "-"}</div>
                            <div className="text-xs text-muted-foreground">{(conta.profiles as any)?.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{conta.descricao}</TableCell>
                        <TableCell>{(conta.obras as any)?.nome || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={conta.tipo === "pagar" ? "destructive" : "default"}>
                            {conta.tipo === "pagar" ? "Pagar" : "Receber"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          €{Number(conta.valor).toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          {format(new Date(conta.data_vencimento), "dd/MM/yyyy", { locale: pt })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={conta.pago ? "secondary" : isVencida ? "destructive" : "outline"}>
                            {conta.pago ? "Pago" : isVencida ? "Vencido" : "Pendente"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            {filteredContas && filteredContas.length > 50 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                Mostrando 50 de {filteredContas.length} resultados
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
