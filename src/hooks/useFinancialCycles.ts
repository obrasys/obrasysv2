import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  AftercareRecord,
  FinancialCycleStatus,
  FinancialSourceLink,
  FinancialSourceModule,
  FinancialWorkCycle,
  FinancialWorkDocument,
  FinancialWorkLine,
  GuaranteeRetention,
} from '@/types/financial-cycles';
import type { FinancialPhase } from '@/types/orcamento-rai';

const sb = supabase as any;

// ===================== Cycles =====================

export function useFinancialCycles(obraId: string | undefined) {
  return useQuery({
    queryKey: ['financial-cycles', obraId],
    enabled: !!obraId,
    queryFn: async (): Promise<FinancialWorkCycle[]> => {
      const { data, error } = await sb
        .from('financial_work_cycles')
        .select('*')
        .eq('obra_id', obraId)
        .order('phase', { ascending: true })
        .order('version', { ascending: false });
      if (error) throw error;
      return (data ?? []) as FinancialWorkCycle[];
    },
  });
}

export function useUpsertFinancialCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      obra_id: string;
      organization_id: string;
      phase: FinancialPhase;
      status?: FinancialCycleStatus;
      version?: number;
      kpis?: Partial<Pick<FinancialWorkCycle,
        'total_vendas' | 'total_custos' | 'margem_valor' | 'margem_pct' |
        'rai' | 'desvio_budget' | 'impacto_mce' | 'custos_spv'>>;
      snapshot?: Record<string, unknown>;
      notes?: string;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Não autenticado');
      const row = {
        obra_id: payload.obra_id,
        organization_id: payload.organization_id,
        user_id: auth.user.id,
        phase: payload.phase,
        status: payload.status ?? 'draft',
        version: payload.version ?? 1,
        ...(payload.kpis ?? {}),
        snapshot: payload.snapshot ?? null,
        notes: payload.notes ?? null,
      };
      const { data, error } = await sb
        .from('financial_work_cycles')
        .upsert(row, { onConflict: 'obra_id,phase,version' })
        .select()
        .single();
      if (error) throw error;
      return data as FinancialWorkCycle;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['financial-cycles', vars.obra_id] });
      qc.invalidateQueries({ queryKey: ['orcamento-rai-obra', vars.obra_id] });
    },
  });
}

export function useLockFinancialCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cycleId: string) => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await sb
        .from('financial_work_cycles')
        .update({ status: 'locked', locked_at: new Date().toISOString(), locked_by: auth.user?.id ?? null })
        .eq('id', cycleId)
        .select()
        .single();
      if (error) throw error;
      return data as FinancialWorkCycle;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['financial-cycles', data.obra_id] });
      qc.invalidateQueries({ queryKey: ['orcamento-rai-obra', data.obra_id] });
    },
  });
}

// ===================== Source links (anti-duplicação) =====================

export function useFinancialSourceLinks(cycleId: string | undefined) {
  return useQuery({
    queryKey: ['financial-source-links', cycleId],
    enabled: !!cycleId,
    queryFn: async (): Promise<FinancialSourceLink[]> => {
      const { data, error } = await sb
        .from('financial_source_links')
        .select('*')
        .eq('cycle_id', cycleId)
        .order('consolidated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as FinancialSourceLink[];
    },
  });
}

export function useLinkSourceToCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      organization_id: string;
      obra_id: string;
      cycle_id: string;
      phase: FinancialPhase;
      source_module: FinancialSourceModule;
      source_id: string;
      source_label?: string;
      amount?: number;
      weight?: number;
    }) => {
      const { data, error } = await sb
        .from('financial_source_links')
        .upsert(
          {
            organization_id: payload.organization_id,
            obra_id: payload.obra_id,
            cycle_id: payload.cycle_id,
            phase: payload.phase,
            source_module: payload.source_module,
            source_id: payload.source_id,
            source_label: payload.source_label ?? null,
            amount: payload.amount ?? 0,
            weight: payload.weight ?? 1,
          },
          { onConflict: 'obra_id,phase,source_module,source_id' },
        )
        .select()
        .single();
      if (error) throw error;
      return data as FinancialSourceLink;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['financial-source-links', vars.cycle_id] });
    },
  });
}

// ===================== Documentos =====================

export function useFinancialWorkDocuments(cycleId: string | undefined) {
  return useQuery({
    queryKey: ['financial-work-documents', cycleId],
    enabled: !!cycleId,
    queryFn: async (): Promise<FinancialWorkDocument[]> => {
      const { data, error } = await sb
        .from('financial_work_documents')
        .select('*')
        .eq('cycle_id', cycleId)
        .order('doc_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as FinancialWorkDocument[];
    },
  });
}

// ===================== Linhas agregadas =====================

export function useFinancialWorkLines(cycleId: string | undefined) {
  return useQuery({
    queryKey: ['financial-work-lines', cycleId],
    enabled: !!cycleId,
    queryFn: async (): Promise<FinancialWorkLine[]> => {
      const { data, error } = await sb
        .from('financial_work_lines')
        .select('*')
        .eq('cycle_id', cycleId)
        .order('chapter_code', { ascending: true });
      if (error) throw error;
      return (data ?? []) as FinancialWorkLine[];
    },
  });
}

// ===================== Retenções de garantia =====================

export function useGuaranteeRetentions(obraId: string | undefined) {
  return useQuery({
    queryKey: ['guarantee-retentions', obraId],
    enabled: !!obraId,
    queryFn: async (): Promise<GuaranteeRetention[]> => {
      const { data, error } = await sb
        .from('guarantee_retentions')
        .select('*')
        .eq('obra_id', obraId)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as GuaranteeRetention[];
    },
  });
}

// ===================== Pós-venda / SPV =====================

export function useAftercareRecords(obraId: string | undefined) {
  return useQuery({
    queryKey: ['aftercare-records', obraId],
    enabled: !!obraId,
    queryFn: async (): Promise<AftercareRecord[]> => {
      const { data, error } = await sb
        .from('aftercare_records')
        .select('*')
        .eq('obra_id', obraId)
        .order('reported_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AftercareRecord[];
    },
  });
}
