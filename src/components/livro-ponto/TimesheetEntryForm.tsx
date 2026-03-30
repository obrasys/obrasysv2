import { useState, useMemo, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, UserPlus, AlertTriangle } from "lucide-react";
import type { Worker, AllocationFormData, CostType } from "@/types/livro-ponto";
import { WorkerSummaryCard } from "./WorkerSummaryCard";

interface TimesheetEntryFormProps {
  workers: Worker[];
  obras: { id: string; nome: string }[];
  workerId: string;
  onWorkerIdChange: (id: string) => void;
  onOpenWorkerModal: () => void;
  checkIn: string;
  onCheckInChange: (v: string) => void;
  checkOut: string;
  onCheckOutChange: (v: string) => void;
  breakMin: number;
  onBreakMinChange: (v: number) => void;
  manualHours: string;
  onManualHoursChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  allocations: AllocationFormData[];
  onAllocationsChange: (allocs: AllocationFormData[]) => void;
  overtimeHours: string;
  onOvertimeHoursChange: (v: string) => void;
}

function calcMinutesFromTimes(start: string, end: string, breakMin: number): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm) - breakMin);
}

function formatMinutesToDecimal(m: number): string {
  if (m <= 0) return "";
  return (m / 60).toFixed(2).replace(/\.?0+$/, "");
}

export function TimesheetEntryForm({
  workers,
  obras,
  workerId,
  onWorkerIdChange,
  onOpenWorkerModal,
  checkIn,
  onCheckInChange,
  checkOut,
  onCheckOutChange,
  breakMin,
  onBreakMinChange,
  manualHours,
  onManualHoursChange,
  notes,
  onNotesChange,
  allocations,
  onAllocationsChange,
  overtimeHours,
  onOvertimeHoursChange,
}: TimesheetEntryFormProps) {
  const selectedWorker = workers.find((w) => w.id === workerId);

  const timeBasedMinutes = useMemo(
    () => calcMinutesFromTimes(checkIn, checkOut, breakMin),
    [checkIn, checkOut, breakMin]
  );

  const manualMinutes = useMemo(() => {
    const parsed = parseFloat(manualHours);
    return isNaN(parsed) || parsed <= 0 ? 0 : Math.round(parsed * 60);
  }, [manualHours]);

  // Time-based takes priority; manual is fallback
  const totalWorkedMinutes = timeBasedMinutes > 0 ? timeBasedMinutes : manualMinutes;

  // Sync manual hours display when calculated from times
  useEffect(() => {
    if (timeBasedMinutes > 0) {
      const decimal = formatMinutesToDecimal(timeBasedMinutes);
      if (manualHours !== decimal) {
        onManualHoursChange(decimal);
      }
    }
  }, [timeBasedMinutes]);

  const formatMinutes = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${h}h${min > 0 ? ` ${min}m` : ""}`;
  };

  // Auto-set allocation minutes when we have a single allocation
  useEffect(() => {
    if (allocations.length === 1 && totalWorkedMinutes > 0) {
      const a = allocations[0];
      if (a.worked_minutes !== totalWorkedMinutes) {
        onAllocationsChange([{ ...a, worked_minutes: totalWorkedMinutes }]);
      }
    }
  }, [totalWorkedMinutes, allocations.length]);

  const updateAllocation = (i: number, updates: Partial<AllocationFormData>) => {
    const next = [...allocations];
    next[i] = { ...next[i], ...updates };
    onAllocationsChange(next);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 md:p-5 space-y-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Clock className="h-4 w-4 text-muted-foreground" />
        Registo diário
      </div>

      {/* Worker selector */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Trabalhador *</Label>
        <div className="flex gap-2">
          <Select value={workerId} onValueChange={onWorkerIdChange}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecione o trabalhador" />
            </SelectTrigger>
            <SelectContent>
              {workers.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.full_name} {w.role ? `· ${w.role}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="default"
            onClick={onOpenWorkerModal}
            className="shrink-0 gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo trabalhador</span>
          </Button>
        </div>
      </div>

      {/* Worker Summary */}
      {selectedWorker && (
        <WorkerSummaryCard worker={selectedWorker} workedMinutes={totalWorkedMinutes} />
      )}

      {/* Time inputs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Hora de entrada</Label>
          <Input type="time" value={checkIn} onChange={(e) => onCheckInChange(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Hora de saída</Label>
          <Input type="time" value={checkOut} onChange={(e) => onCheckOutChange(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Pausa (min)</Label>
          <Input
            type="number"
            value={breakMin}
            onChange={(e) => onBreakMinChange(parseInt(e.target.value) || 0)}
            min={0}
          />
        </div>
      </div>

      {/* Manual hours input */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Horas totais (manual)</Label>
          <Input
            type="number"
            step="0.25"
            min={0}
            placeholder="Ex: 7.5"
            value={manualHours}
            onChange={(e) => onManualHoursChange(e.target.value)}
            disabled={timeBasedMinutes > 0}
          />
          <p className="text-[10px] text-muted-foreground">
            {timeBasedMinutes > 0
              ? "Calculado a partir dos horários"
              : "Preencha se não tiver horário de entrada/saída"}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Total calculado</Label>
          <div className="flex h-10 items-center rounded-md border border-input bg-muted/50 px-3 text-sm font-medium text-foreground">
            {totalWorkedMinutes > 0 ? formatMinutes(totalWorkedMinutes) : "—"}
          </div>
        </div>
      </div>

      {/* Overtime hours */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            Horas extra
          </Label>
          <Input
            type="number"
            step="0.25"
            min={0}
            placeholder="Ex: 2"
            value={overtimeHours}
            onChange={(e) => onOvertimeHoursChange(e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground">
            Calculadas ao custo de hora extra do trabalhador
          </p>
        </div>
        {selectedWorker && parseFloat(overtimeHours) > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Custo hora extra</Label>
            <div className="flex h-10 items-center rounded-md border border-amber-200 bg-amber-50 px-3 text-sm font-medium text-amber-700">
              €{(selectedWorker.overtime_hourly_cost || selectedWorker.default_hourly_cost || 0).toFixed(2)}/h
            </div>
          </div>
        )}
      </div>

      {/* Allocations - simplified for single obra */}
      {allocations.map((a, i) => (
        <div key={i} className="space-y-3">
          {allocations.length > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Obra {i + 1}</span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Obra *</Label>
              <Select value={a.obra_id} onValueChange={(v) => updateAllocation(i, { obra_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar obra" />
                </SelectTrigger>
                <SelectContent>
                  {obras.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tipo de custo</Label>
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
        </div>
      ))}

      {/* Notes */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Notas</Label>
        <Textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Observações do dia..."
          rows={2}
        />
      </div>
    </div>
  );
}
