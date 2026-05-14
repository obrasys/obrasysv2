import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Save, Plus, X, UserPlus, Clock } from "lucide-react";
import { useWorkers, useCreateWorker, useCreateTimesheet } from "@/hooks/useLivroPonto";
import { useSubempreiteiros, useEquipaMembros } from "@/hooks/useRecursos";
import { useObras } from "@/hooks/useObras";
import { format } from "date-fns";
import type { AllocationFormData, CostType, UnitWorkFormData } from "@/types/livro-ponto";
import { TimesheetFilters } from "@/components/livro-ponto/TimesheetFilters";
import { TimesheetEntryForm } from "@/components/livro-ponto/TimesheetEntryForm";
import { WorkerCreateModal } from "@/components/livro-ponto/WorkerCreateModal";

const emptyAllocation: AllocationFormData = {
  obra_id: "",
  start_time: "",
  end_time: "",
  worked_minutes: 0,
  cost_type: "regular" as CostType,
  description: "",
};

export default function LancarPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialObra = searchParams.get("obra") || "";

  const { data: workers = [] } = useWorkers();
  const { obras = [] } = useObras() as any;
  const createMutation = useCreateTimesheet();
  const createWorkerMutation = useCreateWorker();
  const { subempreiteiros } = useSubempreiteiros();
  const { membros: equipaMembros } = useEquipaMembros();

  const activeWorkers = workers.filter((w: any) => w.active);

  // Filters
  const [filterSubempreiteiro, setFilterSubempreiteiro] = useState("");
  const [filterEquipa, setFilterEquipa] = useState("");
  const [workDate, setWorkDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Entry
  const [workerId, setWorkerId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [breakMin, setBreakMin] = useState(0);
  const [notes, setNotes] = useState("");
  const [manualHours, setManualHours] = useState("");
  const [overtimeHours, setOvertimeHours] = useState("");
  const [allocations, setAllocations] = useState<AllocationFormData[]>([
    { ...emptyAllocation, obra_id: initialObra },
  ]);
  const [unitWorks, setUnitWorks] = useState<UnitWorkFormData[]>([]);

  // Worker modal
  const [workerModalOpen, setWorkerModalOpen] = useState(false);

  const filteredWorkers = useMemo(() => {
    let list = activeWorkers;
    if (filterSubempreiteiro) {
      list = list.filter((w: any) => w.subempreiteiro_id === filterSubempreiteiro);
    }
    if (filterEquipa) {
      list = list.filter((w: any) => w.equipa_membro_id === filterEquipa);
    }
    return list;
  }, [activeWorkers, filterSubempreiteiro, filterEquipa]);

  // Calculate total
  const calcMinutes = (start: string, end: string, brk: number) => {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    return Math.max(0, (eh * 60 + em) - (sh * 60 + sm) - brk);
  };

  const manualMin = parseFloat(manualHours);
  const manualMinutes = isNaN(manualMin) || manualMin <= 0 ? 0 : Math.round(manualMin * 60);
  const totalMinutes = calcMinutes(checkIn, checkOut, breakMin) > 0 ? calcMinutes(checkIn, checkOut, breakMin) : manualMinutes;
  const selectedWorker = activeWorkers.find((w: any) => w.id === workerId);

  const overtimeParsed = parseFloat(overtimeHours);
  const overtimeMinutes = isNaN(overtimeParsed) || overtimeParsed <= 0 ? 0 : Math.round(overtimeParsed * 60);

  const unitWorksTotal = useMemo(
    () =>
      unitWorks.reduce(
        (sum, uw) => sum + (uw.quantity || 0) * (uw.unit_rate || 0),
        0
      ),
    [unitWorks]
  );

  const totalCost = useMemo(() => {
    let hourlyCost = 0;
    if (selectedWorker && totalMinutes > 0) {
      const isSalary = selectedWorker.compensation_type === "salary";
      if (!isSalary) {
        const rate = selectedWorker.hourly_rate || selectedWorker.default_hourly_cost;
        const regularCost = (totalMinutes / 60) * rate;
        const otRate = selectedWorker.overtime_hourly_cost || rate;
        const otCost = (overtimeMinutes / 60) * otRate;
        hourlyCost = regularCost + otCost;
      }
    }
    return hourlyCost + unitWorksTotal;
  }, [selectedWorker, totalMinutes, overtimeMinutes, unitWorksTotal]);

  const validUnitWorks = unitWorks.filter(
    (uw) => uw.obra_id && uw.quantity > 0 && uw.unit_rate >= 0
  );

  const canSave =
    workerId &&
    workDate &&
    (totalMinutes > 0 || validUnitWorks.length > 0) &&
    allocations.every((a) => a.obra_id) &&
    !createMutation.isPending;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

  const formatMinutes = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${h}h${min > 0 ? ` ${min}m` : ""}`;
  };

  const handleSave = async (addAnother = false) => {
    // Build allocations: regular + overtime (if any)
    const finalAllocations = allocations.map((a) => ({
      ...a,
      worked_minutes: a.worked_minutes || totalMinutes,
      cost_type: "regular" as CostType,
    }));

    if (overtimeMinutes > 0 && allocations.length > 0) {
      finalAllocations.push({
        ...allocations[0],
        worked_minutes: overtimeMinutes,
        cost_type: "overtime" as CostType,
        description: "Horas extra",
      });
    }

    await createMutation.mutateAsync({
      worker_id: workerId,
      work_date: workDate,
      check_in_time: checkIn || undefined,
      check_out_time: checkOut || undefined,
      break_minutes: breakMin,
      notes: notes || undefined,
      allocations: finalAllocations,
    });

    if (addAnother) {
      // Reset entry but keep context
      setWorkerId("");
      setCheckIn("");
      setCheckOut("");
      setBreakMin(0);
      setManualHours("");
      setOvertimeHours("");
      setNotes("");
      setAllocations([{ ...emptyAllocation, obra_id: initialObra }]);
    } else {
      navigate("/livro-ponto");
    }
  };

  const handleWorkerCreated = async (data: any) => {
    const result = await createWorkerMutation.mutateAsync(data);
    setWorkerModalOpen(false);
    if (result?.id) {
      setWorkerId(result.id);
    }
    return result;
  };

  return (
    <AppLayout
      title="Livro de Ponto"
      subtitle="Registe presenças, horas e equipas com rapidez e controlo diário."
    >
      <div className="p-4 md:p-6 max-w-3xl space-y-4">
        {/* Header action */}
        <div className="flex items-center justify-end">
          <Button variant="outline" onClick={() => setWorkerModalOpen(true)} className="gap-1.5">
            <UserPlus className="h-4 w-4" />
            Novo trabalhador
          </Button>
        </div>

        {/* Context block */}
        <TimesheetFilters
          filterSubempreiteiro={filterSubempreiteiro}
          onFilterSubempreiteiroChange={(v) => { setFilterSubempreiteiro(v); setWorkerId(""); }}
          filterEquipa={filterEquipa}
          onFilterEquipaChange={(v) => { setFilterEquipa(v); setWorkerId(""); }}
          workDate={workDate}
          onWorkDateChange={setWorkDate}
          subempreiteiros={subempreiteiros}
          equipaMembros={equipaMembros}
        />

        {/* Entry form */}
        <TimesheetEntryForm
          workers={filteredWorkers}
          obras={obras as { id: string; nome: string }[]}
          workerId={workerId}
          onWorkerIdChange={setWorkerId}
          onOpenWorkerModal={() => setWorkerModalOpen(true)}
          checkIn={checkIn}
          onCheckInChange={setCheckIn}
          checkOut={checkOut}
          onCheckOutChange={setCheckOut}
          breakMin={breakMin}
          onBreakMinChange={setBreakMin}
          manualHours={manualHours}
          onManualHoursChange={setManualHours}
          notes={notes}
          onNotesChange={setNotes}
          allocations={allocations}
          onAllocationsChange={setAllocations}
          overtimeHours={overtimeHours}
          onOvertimeHoursChange={setOvertimeHours}
          unitWorks={unitWorks}
          onUnitWorksChange={setUnitWorks}
        />

        {/* Summary bar */}
        {totalMinutes > 0 && (
          <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Resumo do registo</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-lg font-bold text-foreground">
                      {formatMinutes(totalMinutes)}
                    </span>
                    {overtimeMinutes > 0 && (
                      <span className="text-sm font-semibold text-amber-600">
                        + {formatMinutes(overtimeMinutes)} extra
                      </span>
                    )}
                    {totalCost > 0 && (
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(totalCost)}
                      </span>
                    )}
                    {selectedWorker?.compensation_type === "salary" && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        Ordenado mensal
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 pb-8">
          <Button variant="ghost" onClick={() => navigate("/livro-ponto")}>
            <X className="h-4 w-4 mr-1.5" />
            Cancelar
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave(true)}
              disabled={!canSave}
            >
              <Save className="h-4 w-4 mr-1.5" />
              Guardar e adicionar outro
            </Button>
            <Button
              onClick={() => handleSave(false)}
              disabled={!canSave}
              className="shadow-md"
            >
              <Save className="h-4 w-4 mr-1.5" />
              {createMutation.isPending ? "A guardar..." : "Guardar registo"}
            </Button>
          </div>
        </div>
      </div>

      {/* Worker creation modal */}
      <WorkerCreateModal
        open={workerModalOpen}
        onOpenChange={setWorkerModalOpen}
        subempreiteiros={subempreiteiros}
        equipaMembros={equipaMembros}
        onSave={handleWorkerCreated}
        isLoading={createWorkerMutation.isPending}
      />
    </AppLayout>
  );
}
