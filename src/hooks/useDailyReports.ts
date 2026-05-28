import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type {
  DailyReport, DailyReportFormData, DailyReportActivity,
  DailyReportConstraint, DailyReportProduction,
  DailyReportLaborResource, DailyReportEquipmentResource,
  DailyReportMaterial, DailyReportQuality, DailyReportSafety,
} from '@/types/daily-reports';

export function useDailyReports(obraId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ['daily-reports', obraId],
    queryFn: async () => {
      if (!obraId) return [];
      const { data, error } = await supabase
        .from('daily_reports')
        .select('*, obra:obras(id, nome, cliente)')
        .eq('obra_id', obraId)
        .order('report_date', { ascending: false });
      if (error) throw error;
      return data as DailyReport[];
    },
    enabled: !!user && !!obraId,
  });

  const createReport = useMutation({
    mutationFn: async (formData: DailyReportFormData) => {
      if (!user) throw new Error('Não autenticado');
      const weekday = new Date(formData.report_date).toLocaleDateString('pt-PT', { weekday: 'long' });
      const { data, error } = await supabase
        .from('daily_reports')
        .insert({
          ...formData,
          user_id: user.id,
          filled_by_user_id: user.id,
          weekday,
          opened_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-reports', obraId] });
      toast({ title: 'RDO criada', description: 'Relatório diário criado com sucesso.' });
    },
    onError: (e: Error) => {
      const msg = e.message.includes('duplicate key') ? 'Já existe uma RDO para esta obra nesta data.' : e.message;
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    },
  });

  const updateReport = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DailyReportFormData> }) => {
      const { error } = await supabase.from('daily_reports').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-reports', obraId] });
      toast({ title: 'RDO atualizada' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const submitReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('daily_reports').update({ status: 'submitted' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-reports', obraId] });
      toast({ title: 'RDO submetida', description: 'Enviada para aprovação.' });
    },
  });

  const approveReport = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase.from('daily_reports').update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        closed_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;

      // Trigger async processing - recalculate progress, propagate dependencies, generate snapshots
      try {
        await supabase.functions.invoke('process-daily-report', {
          body: { daily_report_id: id },
        });
      } catch (procErr) {
        console.warn('process-daily-report invocation failed (non-blocking):', procErr);
      }

      // Also generate financial alerts for the obra
      try {
        const { data: report } = await supabase.from('daily_reports').select('obra_id').eq('id', id).single();
        if (report?.obra_id) {
          await supabase.functions.invoke('generate-financial-alerts', {
            body: { obra_id: report.obra_id },
          });
        }
      } catch (alertErr) {
        console.warn('generate-financial-alerts invocation failed (non-blocking):', alertErr);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-reports', obraId] });
      qc.invalidateQueries({ queryKey: ['schedule-tasks'] });
      qc.invalidateQueries({ queryKey: ['project-progress-snapshots'] });
      qc.invalidateQueries({ queryKey: ['financial-alerts'] });
      qc.invalidateQueries({ queryKey: ['productivity-history'] });
      qc.invalidateQueries({ queryKey: ['task-reforecasts'] });
      toast({ title: 'RDO aprovada', description: 'Progresso recalculado e cronograma atualizado.' });
    },
  });

  const deleteReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('daily_reports').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-reports', obraId] });
      toast({ title: 'RDO eliminada' });
    },
  });

  return { reports, isLoading, createReport, updateReport, submitReport, approveReport, deleteReport };
}

export function useDailyReport(id?: string) {
  const { user } = useAuth();

  const { data: report, isLoading } = useQuery({
    queryKey: ['daily-report', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('daily_reports')
        .select('*, obra:obras(id, nome, cliente)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as DailyReport;
    },
    enabled: !!user && !!id,
  });

  return { report, isLoading };
}

export function useDailyReportActivities(reportId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: activities, isLoading } = useQuery({
    queryKey: ['daily-report-activities', reportId],
    queryFn: async () => {
      if (!reportId) return [];
      const { data, error } = await supabase
        .from('daily_report_activities')
        .select('*')
        .eq('daily_report_id', reportId)
        .order('created_at');
      if (error) throw error;
      return data as DailyReportActivity[];
    },
    enabled: !!user && !!reportId,
  });

  const addActivity = useMutation({
    mutationFn: async (data: Partial<DailyReportActivity> & { daily_report_id: string; obra_id: string }) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase.from('daily_report_activities').insert({
        ...data,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily-report-activities', reportId] }),
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateActivity = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DailyReportActivity> }) => {
      const { error } = await supabase.from('daily_report_activities').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily-report-activities', reportId] }),
  });

  const removeActivity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('daily_report_activities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily-report-activities', reportId] }),
  });

  return { activities, isLoading, addActivity, updateActivity, removeActivity };
}

export function useDailyReportConstraints(reportId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: constraints, isLoading } = useQuery({
    queryKey: ['daily-report-constraints', reportId],
    queryFn: async () => {
      if (!reportId) return [];
      const { data, error } = await supabase
        .from('daily_report_constraints')
        .select('*')
        .eq('daily_report_id', reportId)
        .order('created_at');
      if (error) throw error;
      return data as DailyReportConstraint[];
    },
    enabled: !!user && !!reportId,
  });

  const addConstraint = useMutation({
    mutationFn: async (data: Partial<DailyReportConstraint> & { daily_report_id: string; obra_id: string; constraint_type: string; objective_description: string }) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase.from('daily_report_constraints').insert({ ...data, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily-report-constraints', reportId] }),
  });

  const updateConstraint = useMutation({
    mutationFn: async ({ id, ...data }: Partial<DailyReportConstraint> & { id: string }) => {
      const { error } = await supabase.from('daily_report_constraints').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily-report-constraints', reportId] }),
  });

  const removeConstraint = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('daily_report_constraints').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily-report-constraints', reportId] }),
  });

  return { constraints, isLoading, addConstraint, updateConstraint, removeConstraint };
}

export function useDailyReportResources(reportId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: labor } = useQuery({
    queryKey: ['daily-report-labor', reportId],
    queryFn: async () => {
      if (!reportId) return [];
      const { data, error } = await supabase.from('daily_report_labor_resources').select('*').eq('daily_report_id', reportId);
      if (error) throw error;
      return data as DailyReportLaborResource[];
    },
    enabled: !!user && !!reportId,
  });

  const { data: equipment } = useQuery({
    queryKey: ['daily-report-equipment', reportId],
    queryFn: async () => {
      if (!reportId) return [];
      const { data, error } = await supabase.from('daily_report_equipment_resources').select('*').eq('daily_report_id', reportId);
      if (error) throw error;
      return data as DailyReportEquipmentResource[];
    },
    enabled: !!user && !!reportId,
  });

  const { data: materials } = useQuery({
    queryKey: ['daily-report-materials', reportId],
    queryFn: async () => {
      if (!reportId) return [];
      const { data, error } = await supabase.from('daily_report_materials').select('*').eq('daily_report_id', reportId);
      if (error) throw error;
      return data as DailyReportMaterial[];
    },
    enabled: !!user && !!reportId,
  });

  const addLabor = useMutation({
    mutationFn: async (data: Partial<DailyReportLaborResource> & { daily_report_id: string; obra_id: string; role_name: string }) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase.from('daily_report_labor_resources').insert({ ...data, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['daily-report-labor', reportId] }); toast({ title: 'Mão de obra registada' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const removeLabor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('daily_report_labor_resources').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily-report-labor', reportId] }),
  });

  const addEquipment = useMutation({
    mutationFn: async (data: Partial<DailyReportEquipmentResource> & { daily_report_id: string; obra_id: string; equipment_name: string }) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase.from('daily_report_equipment_resources').insert({ ...data, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['daily-report-equipment', reportId] }); toast({ title: 'Equipamento registado' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const removeEquipment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('daily_report_equipment_resources').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily-report-equipment', reportId] }),
  });

  const addMaterial = useMutation({
    mutationFn: async (data: Partial<DailyReportMaterial> & { daily_report_id: string; obra_id: string; material_name: string }) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase.from('daily_report_materials').insert({ ...data, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['daily-report-materials', reportId] }); toast({ title: 'Material registado' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const removeMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('daily_report_materials').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily-report-materials', reportId] }),
  });

  return { labor, equipment, materials, addLabor, removeLabor, addEquipment, removeEquipment, addMaterial, removeMaterial };
}

export function useDailyReportQualitySafety(reportId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: quality } = useQuery({
    queryKey: ['daily-report-quality', reportId],
    queryFn: async () => {
      if (!reportId) return null;
      const { data, error } = await supabase.from('daily_report_quality').select('*').eq('daily_report_id', reportId).maybeSingle();
      if (error) throw error;
      return data as DailyReportQuality | null;
    },
    enabled: !!user && !!reportId,
  });

  const { data: safety } = useQuery({
    queryKey: ['daily-report-safety', reportId],
    queryFn: async () => {
      if (!reportId) return null;
      const { data, error } = await supabase.from('daily_report_safety').select('*').eq('daily_report_id', reportId).maybeSingle();
      if (error) throw error;
      return data as DailyReportSafety | null;
    },
    enabled: !!user && !!reportId,
  });

  const saveQuality = useMutation({
    mutationFn: async (data: Partial<DailyReportQuality> & { daily_report_id: string; obra_id: string }) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase.from('daily_report_quality').upsert({ ...data, user_id: user.id }, { onConflict: 'id' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily-report-quality', reportId] }),
  });

  const saveSafety = useMutation({
    mutationFn: async (data: Partial<DailyReportSafety> & { daily_report_id: string; obra_id: string }) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase.from('daily_report_safety').upsert({ ...data, user_id: user.id }, { onConflict: 'id' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily-report-safety', reportId] }),
  });

  return { quality, safety, saveQuality, saveSafety };
}

export function useDailyReportProductions(reportId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: productions, isLoading } = useQuery({
    queryKey: ['daily-report-productions', reportId],
    queryFn: async () => {
      if (!reportId) return [];
      const { data, error } = await supabase
        .from('daily_report_productions')
        .select('*, schedule_task:project_schedule_tasks(id, name, wbs_code)')
        .eq('daily_report_id', reportId)
        .order('created_at');
      if (error) throw error;
      return data as (DailyReportProduction & { schedule_task?: { id: string; name: string; wbs_code: string } })[];
    },
    enabled: !!user && !!reportId,
  });

  const addProduction = useMutation({
    mutationFn: async (data: Partial<DailyReportProduction> & { daily_report_id: string; obra_id: string; service_name: string }) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase.from('daily_report_productions').insert({ ...data, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-report-productions', reportId] });
      toast({ title: 'Produção registada' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateProduction = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DailyReportProduction> }) => {
      const { error } = await supabase.from('daily_report_productions').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily-report-productions', reportId] }),
  });

  const removeProduction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('daily_report_productions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-report-productions', reportId] });
      toast({ title: 'Produção removida' });
    },
  });

  return { productions, isLoading, addProduction, updateProduction, removeProduction };
}
