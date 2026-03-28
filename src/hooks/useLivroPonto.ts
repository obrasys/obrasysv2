import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type {
  Worker,
  Timesheet,
  TimesheetAllocation,
  ProjectLaborCostEntry,
  TimesheetFormData,
} from "@/types/livro-ponto";

const sb = supabase as any;

// ── Workers ──────────────────────────────────────────────

export function useWorkers() {
  const { user } = useAuth();
  return useQuery<Worker[]>({
    queryKey: ["workers"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("workers")
        .select("*, subempreiteiro:subempreiteiros(id, nome), equipa_membro:equipa_membros(id, nome)")
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateWorker() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (worker: Partial<Worker>) => {
      const { data, error } = await sb
        .from("workers")
        .insert({ ...worker, user_id: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workers"] });
      toast.success("Trabalhador criado");
    },
    onError: () => toast.error("Erro ao criar trabalhador"),
  });
}

export function useUpdateWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Worker> & { id: string }) => {
      const { error } = await sb.from("workers").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workers"] });
      toast.success("Trabalhador atualizado");
    },
    onError: () => toast.error("Erro ao atualizar trabalhador"),
  });
}

export function useDeleteWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("workers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workers"] });
      toast.success("Trabalhador removido");
    },
    onError: () => toast.error("Erro ao remover trabalhador"),
  });
}

// ── Timesheets ───────────────────────────────────────────

export function useTimesheets(filters?: {
  date?: string;
  obraId?: string;
  workerId?: string;
  status?: string;
}) {
  const { user } = useAuth();
  return useQuery<Timesheet[]>({
    queryKey: ["timesheets", filters],
    queryFn: async () => {
      let q = sb
        .from("timesheets")
        .select("*, worker:workers(*)")
        .order("work_date", { ascending: false });

      if (filters?.date) q = q.eq("work_date", filters.date);
      if (filters?.workerId) q = q.eq("worker_id", filters.workerId);
      if (filters?.status) q = q.eq("status", filters.status);

      const { data, error } = await q;
      if (error) throw error;

      // If filtering by obra, we need to check allocations
      if (filters?.obraId) {
        const ids = data.map((t: any) => t.id);
        if (ids.length === 0) return [];
        const { data: allocs } = await sb
          .from("timesheet_allocations")
          .select("timesheet_id")
          .eq("obra_id", filters.obraId)
          .in("timesheet_id", ids);
        const matchIds = new Set((allocs || []).map((a: any) => a.timesheet_id));
        return data.filter((t: any) => matchIds.has(t.id));
      }
      return data;
    },
    enabled: !!user,
  });
}

export function useTimesheetAllocations(timesheetId?: string, filters?: { date?: string; obraId?: string }) {
  const { user } = useAuth();
  return useQuery<TimesheetAllocation[]>({
    queryKey: ["timesheet_allocations", timesheetId, filters],
    queryFn: async () => {
      let q = sb
        .from("timesheet_allocations")
        .select("*, worker:workers(id, full_name), obras(id, nome)")
        .order("start_time");

      if (timesheetId) q = q.eq("timesheet_id", timesheetId);
      if (filters?.date) q = q.eq("work_date", filters.date);
      if (filters?.obraId) q = q.eq("obra_id", filters.obraId);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// ── Create Timesheet with Allocations ────────────────────

export function useCreateTimesheet() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (form: TimesheetFormData) => {
      if (!user) throw new Error("Utilizador não autenticado");

      // Get worker for cost snapshot
      const { data: worker, error: wErr } = await sb
        .from("workers")
        .select("default_hourly_cost, overtime_hourly_cost")
        .eq("id", form.worker_id)
        .single();
      if (wErr) throw wErr;

      const totalMinutes = form.allocations.reduce(
        (sum, a) => sum + a.worked_minutes,
        0
      );

      // Create timesheet
      const { data: ts, error: tsErr } = await sb
        .from("timesheets")
        .insert({
          user_id: user.id,
          worker_id: form.worker_id,
          work_date: form.work_date,
          check_in_time: form.check_in_time || null,
          check_out_time: form.check_out_time || null,
          break_minutes: form.break_minutes,
          total_worked_minutes: totalMinutes,
          notes: form.notes || null,
          created_by: user.id,
          status: "draft",
        })
        .select()
        .single();
      if (tsErr) throw tsErr;

      // Create allocations + cost entries
      for (const alloc of form.allocations) {
        const hourlyCost =
          alloc.cost_type === "overtime"
            ? worker.overtime_hourly_cost || worker.default_hourly_cost
            : worker.default_hourly_cost;
        const costAmount = (alloc.worked_minutes / 60) * hourlyCost;

        const { data: ta, error: taErr } = await sb
          .from("timesheet_allocations")
          .insert({
            user_id: user.id,
            timesheet_id: ts.id,
            worker_id: form.worker_id,
            obra_id: alloc.obra_id,
            rdo_id: alloc.rdo_id || null,
            work_date: form.work_date,
            start_time: alloc.start_time || null,
            end_time: alloc.end_time || null,
            worked_minutes: alloc.worked_minutes,
            hourly_cost_snapshot: hourlyCost,
            cost_amount: Math.round(costAmount * 100) / 100,
            cost_type: alloc.cost_type,
            description: alloc.description || null,
          })
          .select()
          .single();
        if (taErr) throw taErr;

        // Create labor cost entry
        const { error: lcErr } = await sb
          .from("project_labor_cost_entries")
          .insert({
            user_id: user.id,
            obra_id: alloc.obra_id,
            worker_id: form.worker_id,
            timesheet_allocation_id: ta.id,
            entry_date: form.work_date,
            hours_worked: Math.round((alloc.worked_minutes / 60) * 100) / 100,
            hourly_cost: hourlyCost,
            amount: Math.round(costAmount * 100) / 100,
            status: "pending",
            origin_type: "timesheet",
          });
        if (lcErr) throw lcErr;
      }

      return ts;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timesheets"] });
      qc.invalidateQueries({ queryKey: ["timesheet_allocations"] });
      qc.invalidateQueries({ queryKey: ["labor_costs"] });
      toast.success("Livro de ponto registado com sucesso");
    },
    onError: (err: any) =>
      toast.error("Erro ao registar: " + (err.message || "")),
  });
}

// ── Approve / Lock ───────────────────────────────────────

export function useApproveTimesheet() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: "approve" | "lock";
    }) => {
      const updates: any = {
        status: action === "approve" ? "approved" : "locked",
      };
      if (action === "approve") {
        updates.approved_by = user?.id;
        updates.approved_at = new Date().toISOString();
      }
      const { error } = await sb.from("timesheets").update(updates).eq("id", id);
      if (error) throw error;

      // Post costs when approving
      if (action === "approve") {
        await sb
          .from("project_labor_cost_entries")
          .update({ status: "posted" })
          .eq("status", "pending")
          .in(
            "timesheet_allocation_id",
            (
              await sb
                .from("timesheet_allocations")
                .select("id")
                .eq("timesheet_id", id)
            ).data?.map((a: any) => a.id) || []
          );
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timesheets"] });
      qc.invalidateQueries({ queryKey: ["labor_costs"] });
      toast.success("Estado atualizado");
    },
    onError: () => toast.error("Erro ao atualizar estado"),
  });
}

// ── Delete Timesheet ─────────────────────────────────────

export function useDeleteTimesheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Reverse cost entries first
      const { data: allocs } = await sb
        .from("timesheet_allocations")
        .select("id")
        .eq("timesheet_id", id);
      if (allocs?.length) {
        await sb
          .from("project_labor_cost_entries")
          .update({ status: "reversed" })
          .in(
            "timesheet_allocation_id",
            allocs.map((a: any) => a.id)
          );
      }
      const { error } = await sb.from("timesheets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timesheets"] });
      qc.invalidateQueries({ queryKey: ["timesheet_allocations"] });
      qc.invalidateQueries({ queryKey: ["labor_costs"] });
      toast.success("Registo eliminado");
    },
    onError: () => toast.error("Erro ao eliminar registo"),
  });
}

// ── Labor Costs ──────────────────────────────────────────

export function useLaborCosts(obraId?: string) {
  const { user } = useAuth();
  return useQuery<ProjectLaborCostEntry[]>({
    queryKey: ["labor_costs", obraId],
    queryFn: async () => {
      let q = sb
        .from("project_labor_cost_entries")
        .select("*")
        .neq("status", "reversed")
        .order("entry_date", { ascending: false });
      if (obraId) q = q.eq("obra_id", obraId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// ── Labor Summary for RDO ────────────────────────────────

export function useDayLaborSummary(date?: string, obraId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["day_labor_summary", date, obraId],
    queryFn: async () => {
      if (!date) return null;
      let q = sb
        .from("timesheet_allocations")
        .select("worker_id, worked_minutes, cost_amount")
        .eq("work_date", date);
      if (obraId) q = q.eq("obra_id", obraId);
      const { data, error } = await q;
      if (error) throw error;
      const allocs = data || [];
      const uniqueWorkers = new Set(allocs.map((a: any) => a.worker_id));
      const totalMinutes = allocs.reduce(
        (s: number, a: any) => s + (a.worked_minutes || 0),
        0
      );
      const totalCost = allocs.reduce(
        (s: number, a: any) => s + (a.cost_amount || 0),
        0
      );
      return {
        workers: uniqueWorkers.size,
        totalHours: Math.round((totalMinutes / 60) * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
      };
    },
    enabled: !!user && !!date,
  });
}
