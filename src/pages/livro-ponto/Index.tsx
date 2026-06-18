import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { AppLayout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Clock, Users, Building2, CheckCircle, Calendar, Euro, Timer } from "lucide-react";
import { useTimesheets, useTimesheetAllocations, useWorkers, useApproveTimesheet } from "@/hooks/useLivroPonto";
import { useObras } from "@/hooks/useObras";
import { PageHeader, MetricCard, MetricCardGrid, EmptyState } from "@/components/patterns";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  submitted: { label: "Submetido", variant: "default" },
  approved: { label: "Aprovado", variant: "outline" },
  locked: { label: "Bloqueado", variant: "destructive" },
};

const costTypeLabels: Record<string, string> = {
  regular: "Normal",
  overtime: "Extra",
  night: "Noturno",
  weekend: "Fim-de-semana",
};

export default function LivroPontoIndex() {
  const navigate = useNavigate();
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedObra, setSelectedObra] = useState<string>("");
  const [selectedWorker, setSelectedWorker] = useState<string>("");
  const [activeTab, setActiveTab] = useState("diario");

  const { data: workers = [] } = useWorkers();
  const { obras = [] } = useObras() as any;
  const obraFilter = selectedObra && selectedObra !== "all" ? selectedObra : undefined;
  const workerFilter = selectedWorker && selectedWorker !== "all" ? selectedWorker : undefined;

  const { data: timesheets = [], isLoading } = useTimesheets({
    date: activeTab === "diario" ? selectedDate : undefined,
    obraId: obraFilter,
    workerId: workerFilter,
  });
  const { data: allocations = [] } = useTimesheetAllocations(undefined, {
    date: activeTab !== "aprovacoes" ? selectedDate : undefined,
    obraId: obraFilter,
  });
  const approveMutation = useApproveTimesheet();

  const formatMinutes = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${h}h${min > 0 ? `${min}m` : ""}`;
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

  // ── Aggregations ──
  const totalWorkers = new Set(allocations.map((a: any) => a.worker_id)).size;
  const totalMinutes = allocations.reduce((s: number, a: any) => s + (a.worked_minutes || 0), 0);
  const totalCost = allocations.reduce((s: number, a: any) => s + (a.cost_amount || 0), 0);

  // Group allocations by worker
  const byWorker = allocations.reduce((acc: any, a: any) => {
    const key = a.worker_id;
    if (!acc[key]) acc[key] = { worker: a.worker, items: [], totalMin: 0, totalCost: 0 };
    acc[key].items.push(a);
    acc[key].totalMin += a.worked_minutes || 0;
    acc[key].totalCost += a.cost_amount || 0;
    return acc;
  }, {} as Record<string, any>);

  // Group allocations by obra
  const byObra = allocations.reduce((acc: any, a: any) => {
    const key = a.obra_id;
    if (!acc[key]) acc[key] = { obra: a.obras, items: [], totalMin: 0, totalCost: 0 };
    acc[key].items.push(a);
    acc[key].totalMin += a.worked_minutes || 0;
    acc[key].totalCost += a.cost_amount || 0;
    return acc;
  }, {} as Record<string, any>);

  const pendingTimesheets = timesheets.filter((t: any) => t.status === "draft" || t.status === "submitted");

  return (
    <AppLayout 
      title="Livro de Ponto" 
      subtitle="Gestão de presenças, horas e custos de mão de obra"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/livro-ponto/trabalhadores")}>
            <Users className="h-4 w-4 mr-2" />
            Trabalhadores
          </Button>
          <Button onClick={() => navigate("/livro-ponto/lancar")}>
            <Plus className="h-4 w-4 mr-2" />
            Lançar Horas
          </Button>
        </div>
      }
    >
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Trabalhadores", value: totalWorkers, icon: Users, color: "text-blue-600", bgColor: "bg-blue-100" },
            { title: "Horas Totais", value: formatMinutes(totalMinutes), icon: Timer, color: "text-green-600", bgColor: "bg-green-100" },
            { title: "Custo Total", value: formatCurrency(totalCost), icon: Euro, color: "text-purple-600", bgColor: "bg-purple-100" },
            { title: "Pendentes", value: pendingTimesheets.length, icon: Clock, color: "text-amber-600", bgColor: "bg-amber-100" },
          ].map((card, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold mt-1">{card.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${card.bgColor}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-44"
                />
              </div>
              <Select value={selectedObra} onValueChange={setSelectedObra}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Todas as obras" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as obras</SelectItem>
                  {(obras as any[]).map((o: any) => (
                    <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Todos os trabalhadores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os trabalhadores</SelectItem>
                  {workers.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="diario">Vista Diária</TabsTrigger>
            <TabsTrigger value="trabalhador">Por Trabalhador</TabsTrigger>
            <TabsTrigger value="obra">Por Obra</TabsTrigger>
            <TabsTrigger value="aprovacoes">Aprovações</TabsTrigger>
          </TabsList>

          {/* ── Vista Diária ── */}
          <TabsContent value="diario">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Apontamentos - {format(new Date(selectedDate), "dd 'de' MMMM 'de' yyyy", { locale: pt })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground">A carregar...</p>
                ) : timesheets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Sem registos para este dia</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate("/livro-ponto/lancar")}>
                      Lançar Horas
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Trabalhador</TableHead>
                        <TableHead>Entrada</TableHead>
                        <TableHead>Saída</TableHead>
                        <TableHead>Horas</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timesheets.map((ts: any) => {
                        const st = statusMap[ts.status] || statusMap.draft;
                        return (
                          <TableRow key={ts.id}>
                            <TableCell>
                              <div className="font-medium">{ts.worker?.full_name || "-"}</div>
                              <div className="text-[11px] text-muted-foreground">{format(new Date(ts.work_date), "dd/MM/yyyy", { locale: pt })}</div>
                            </TableCell>
                            <TableCell>{ts.check_in_time?.slice(0, 5) || "-"}</TableCell>
                            <TableCell>{ts.check_out_time?.slice(0, 5) || "-"}</TableCell>
                            <TableCell>{formatMinutes(ts.total_worked_minutes)}</TableCell>
                            <TableCell>
                              <Badge variant={st.variant}>{st.label}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {ts.status === "draft" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => approveMutation.mutate({ id: ts.id, action: "approve" })}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Aprovar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Por Trabalhador ── */}
          <TabsContent value="trabalhador">
            <div className="grid gap-4">
              {Object.entries(byWorker).length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    Sem dados para os filtros selecionados
                  </CardContent>
                </Card>
              ) : (
                Object.entries(byWorker).map(([key, group]: [string, any]) => (
                  <Card key={key}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {group.worker?.full_name || "Trabalhador"}
                          <span className="text-xs text-muted-foreground font-normal ml-2">
                            {group.items[0]?.work_date ? format(new Date(group.items[0].work_date), "dd/MM/yyyy", { locale: pt }) : ""}
                          </span>
                        </CardTitle>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">{formatMinutes(group.totalMin)}</span>
                          <span className="font-semibold text-primary">{formatCurrency(group.totalCost)}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {group.items.map((a: any) => (
                          <div key={a.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <span>{a.obras?.nome || "Obra"}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="text-xs">{costTypeLabels[a.cost_type] || a.cost_type}</Badge>
                              <span className="text-muted-foreground">{formatMinutes(a.worked_minutes)}</span>
                              <span className="font-medium">{formatCurrency(a.cost_amount)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* ── Por Obra ── */}
          <TabsContent value="obra">
            <div className="grid gap-4">
              {Object.entries(byObra).length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    Sem dados para os filtros selecionados
                  </CardContent>
                </Card>
              ) : (
                Object.entries(byObra).map(([key, group]: [string, any]) => (
                  <Card key={key}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          <Building2 className="h-4 w-4 inline mr-2" />
                          {group.obra?.nome || "Obra"}
                        </CardTitle>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            {new Set(group.items.map((a: any) => a.worker_id)).size} trabalhadores
                          </span>
                          <span className="text-muted-foreground">{formatMinutes(group.totalMin)}</span>
                          <span className="font-semibold text-primary">{formatCurrency(group.totalCost)}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Trabalhador</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Horas</TableHead>
                            <TableHead className="text-right">Custo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.items.map((a: any) => (
                            <TableRow key={a.id}>
                            <TableCell>
                              <div>{a.worker?.full_name || "-"}</div>
                              <div className="text-[11px] text-muted-foreground">{a.work_date ? format(new Date(a.work_date), "dd/MM/yyyy", { locale: pt }) : ""}</div>
                            </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{costTypeLabels[a.cost_type] || a.cost_type}</Badge>
                              </TableCell>
                              <TableCell>{formatMinutes(a.worked_minutes)}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(a.cost_amount)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* ── Aprovações ── */}
          <TabsContent value="aprovacoes">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Registos Pendentes de Aprovação</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingTimesheets.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">Sem registos pendentes</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Trabalhador</TableHead>
                        <TableHead>Horas</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingTimesheets.map((ts: any) => {
                        const st = statusMap[ts.status] || statusMap.draft;
                        return (
                          <TableRow key={ts.id}>
                            <TableCell>{format(new Date(ts.work_date), "dd/MM/yyyy")}</TableCell>
                            <TableCell className="font-medium">{ts.worker?.full_name || "-"}</TableCell>
                            <TableCell>{formatMinutes(ts.total_worked_minutes)}</TableCell>
                            <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => approveMutation.mutate({ id: ts.id, action: "approve" })}
                              >
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => approveMutation.mutate({ id: ts.id, action: "lock" })}
                              >
                                Bloquear
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
