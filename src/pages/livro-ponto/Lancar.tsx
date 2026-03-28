import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Save, Clock } from "lucide-react";
import { useWorkers, useCreateTimesheet } from "@/hooks/useLivroPonto";
import { useObras } from "@/hooks/useObras";
import { format } from "date-fns";
import type { AllocationFormData, CostType } from "@/types/livro-ponto";

const emptAllocation: AllocationFormData = {
  obra_id: "",
  start_time: "",
  end_time: "",
  worked_minutes: 0,
  cost_type: "regular" as CostType,
  description: "",
};

function calcMinutes(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
}

export default function LancarPage() {
  const navigate = useNavigate();
  const { data: workers = [] } = useWorkers();
  const { data: obras = [] } = useObras();
  const createMutation = useCreateTimesheet();

  const activeWorkers = workers.filter((w) => w.active);

  const [workerId, setWorkerId] = useState("");
  const [workDate, setWorkDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [breakMin, setBreakMin] = useState(0);
  const [notes, setNotes] = useState("");
  const [allocations, setAllocations] = useState<AllocationFormData[]>([{ ...emptAllocation }]);

  const selectedWorker = activeWorkers.find((w) => w.id === workerId);

  const updateAllocation = (i: number, updates: Partial<AllocationFormData>) => {
    setAllocations((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...updates };
      // Auto-calc minutes from times
      if (updates.start_time !== undefined || updates.end_time !== undefined) {
        const a = next[i];
        next[i].worked_minutes = calcMinutes(a.start_time, a.end_time);
      }
      return next;
    });
  };

  const addAllocation = () => setAllocations([...allocations, { ...emptAllocation }]);

  const removeAllocation = (i: number) => {
    if (allocations.length <= 1) return;
    setAllocations(allocations.filter((_, j) => j !== i));
  };

  const totalMinutes = allocations.reduce((s, a) => s + a.worked_minutes, 0);
  const totalCost = allocations.reduce((s, a) => {
    if (!selectedWorker) return s;
    const rate = a.cost_type === "overtime"
      ? (selectedWorker.overtime_hourly_cost || selectedWorker.default_hourly_cost)
      : selectedWorker.default_hourly_cost;
    return s + (a.worked_minutes / 60) * rate;
  }, 0);

  const canSave =
    workerId &&
    workDate &&
    allocations.every((a) => a.obra_id && a.worked_minutes > 0) &&
    !createMutation.isPending;

  const handleSave = async () => {
    await createMutation.mutateAsync({
      worker_id: workerId,
      work_date: workDate,
      check_in_time: checkIn || undefined,
      check_out_time: checkOut || undefined,
      break_minutes: breakMin,
      notes: notes || undefined,
      allocations,
    });
    navigate("/livro-ponto");
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

  const formatMinutes = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${h}h${min > 0 ? `${min}m` : ""}`;
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/livro-ponto")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Lançar Horas</h1>
            <p className="text-muted-foreground">Registar tempo de trabalho por trabalhador e obra</p>
          </div>
        </div>

        {/* Worker & Date */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Identificação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trabalhador *</Label>
                <Select value={workerId} onValueChange={setWorkerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar trabalhador" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeWorkers.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.full_name} {w.role ? `(${w.role})` : ""} — {formatCurrency(w.default_hourly_cost)}/h
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Hora Entrada</Label>
                <Input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Hora Saída</Label>
                <Input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Pausa (min)</Label>
                <Input
                  type="number"
                  value={breakMin}
                  onChange={(e) => setBreakMin(parseInt(e.target.value) || 0)}
                  min={0}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Allocations */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Alocações por Obra</CardTitle>
              <Button variant="outline" size="sm" onClick={addAllocation}>
                <Plus className="h-3 w-3 mr-1" />
                Adicionar Obra
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {allocations.map((a, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Alocação {i + 1}</span>
                  {allocations.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeAllocation(i)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Obra *</Label>
                    <Select value={a.obra_id} onValueChange={(v) => updateAllocation(i, { obra_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar obra" />
                      </SelectTrigger>
                      <SelectContent>
                        {(obras as any[]).map((o: any) => (
                          <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Custo</Label>
                    <Select value={a.cost_type} onValueChange={(v) => updateAllocation(i, { cost_type: v as CostType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regular">Normal</SelectItem>
                        <SelectItem value="overtime">Horas Extra</SelectItem>
                        <SelectItem value="night">Noturno</SelectItem>
                        <SelectItem value="weekend">Fim-de-semana</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Hora Início</Label>
                    <Input
                      type="time"
                      value={a.start_time}
                      onChange={(e) => updateAllocation(i, { start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora Fim</Label>
                    <Input
                      type="time"
                      value={a.end_time}
                      onChange={(e) => updateAllocation(i, { end_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Minutos</Label>
                    <Input
                      type="number"
                      value={a.worked_minutes}
                      onChange={(e) => updateAllocation(i, { worked_minutes: parseInt(e.target.value) || 0 })}
                      min={0}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Input
                    value={a.description}
                    onChange={(e) => updateAllocation(i, { description: e.target.value })}
                    placeholder="Trabalho realizado..."
                  />
                </div>
                {selectedWorker && a.worked_minutes > 0 && (
                  <div className="flex items-center justify-end gap-2 text-sm">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{formatMinutes(a.worked_minutes)}</span>
                    <span className="font-medium text-primary">
                      {formatCurrency(
                        (a.worked_minutes / 60) *
                          (a.cost_type === "overtime"
                            ? selectedWorker.overtime_hourly_cost || selectedWorker.default_hourly_cost
                            : selectedWorker.default_hourly_cost)
                      )}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações gerais do dia..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary + Save */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Resumo do dia</p>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-semibold">{formatMinutes(totalMinutes)}</span>
                  <span className="text-lg font-bold text-primary">{formatCurrency(totalCost)}</span>
                  <span className="text-sm text-muted-foreground">{allocations.length} obra(s)</span>
                </div>
              </div>
              <Button size="lg" onClick={handleSave} disabled={!canSave}>
                <Save className="h-4 w-4 mr-2" />
                {createMutation.isPending ? "A guardar..." : "Guardar Registo"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
