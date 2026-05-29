import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const QK = {
  contract: (mceId: string) => ['mce', 'contract', mceId] as const,
  financial: (mceId: string) => ['mce', 'financial', mceId] as const,
  budgetUpdates: (mceId: string) => ['mce', 'budget-updates', mceId] as const,
};

export interface MceContractLink {
  id: string;
  mce_id: string;
  contract_type: 'simplified' | 'external' | 'adjudication';
  contract_number: string | null;
  supplier_id: string | null;
  supplier_name_snapshot: string | null;
  nif: string | null;
  value: number;
  signed_at: string | null;
  signed_by_name: string | null;
  file_url: string | null;
  file_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface MceFinancialControl {
  id: string;
  mce_id: string;
  awarded_value: number;
  executed_value: number;
  invoiced_value: number;
  paid_value: number;
  invoiced_pct: number;
  paid_pct: number;
  pending_value: number;
  last_update_notes: string | null;
  updated_at: string;
}

export interface MceBudgetObjetivoUpdate {
  id: string;
  mce_id: string;
  previous_value: number;
  new_value: number;
  deviation_value: number;
  deviation_pct: number;
  justification: string;
  applied_by_name: string | null;
  applied_at: string;
}

export function useMCEContract(mceId: string | undefined) {
  return useQuery({
    queryKey: QK.contract(mceId ?? ''),
    enabled: !!mceId,
    queryFn: async (): Promise<MceContractLink[]> => {
      const { data, error } = await supabase
        .from('mce_contract_links' as any)
        .select('*')
        .eq('mce_id', mceId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MceContractLink[];
    },
  });
}

export function useMCEFinancial(mceId: string | undefined) {
  return useQuery({
    queryKey: QK.financial(mceId ?? ''),
    enabled: !!mceId,
    queryFn: async (): Promise<MceFinancialControl | null> => {
      const { data, error } = await supabase
        .from('mce_financial_control' as any)
        .select('*')
        .eq('mce_id', mceId!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as MceFinancialControl) ?? null;
    },
  });
}

export function useMCEBudgetUpdates(mceId: string | undefined) {
  return useQuery({
    queryKey: QK.budgetUpdates(mceId ?? ''),
    enabled: !!mceId,
    queryFn: async (): Promise<MceBudgetObjetivoUpdate[]> => {
      const { data, error } = await supabase
        .from('mce_budget_objetivo_updates' as any)
        .select('*')
        .eq('mce_id', mceId!)
        .order('applied_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MceBudgetObjetivoUpdate[];
    },
  });
}

export function useAwardMCE() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      mce_id: string;
      awarded_value: number;
      contract_number?: string;
      signed_at?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc('award_mce' as any, {
        _mce_id: input.mce_id,
        _awarded_value: input.awarded_value,
        _contract_number: input.contract_number ?? null,
        _signed_at: input.signed_at ?? null,
        _notes: input.notes ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['mce', 'detail', vars.mce_id] });
      qc.invalidateQueries({ queryKey: QK.contract(vars.mce_id) });
      qc.invalidateQueries({ queryKey: QK.financial(vars.mce_id) });
      toast({ title: 'MCE adjudicado', description: 'Contrato e controlo financeiro criados.' });
    },
    onError: (e: Error) => toast({ title: 'Erro a adjudicar', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateMCEFinancial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      mce_id: string;
      executed_value?: number;
      invoiced_value?: number;
      paid_value?: number;
      last_update_notes?: string;
    }) => {
      const patch: Record<string, unknown> = {};
      if (input.executed_value != null) patch.executed_value = input.executed_value;
      if (input.invoiced_value != null) patch.invoiced_value = input.invoiced_value;
      if (input.paid_value != null) patch.paid_value = input.paid_value;
      if (input.last_update_notes != null) patch.last_update_notes = input.last_update_notes;
      const { error } = await supabase
        .from('mce_financial_control' as any)
        .update(patch)
        .eq('mce_id', input.mce_id);
      if (error) throw error;
      return input.mce_id;
    },
    onSuccess: (mceId) => {
      qc.invalidateQueries({ queryKey: QK.financial(mceId) });
      toast({ title: 'Financeiro atualizado' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useApplyMCEToBudgetObjetivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { mce_id: string; new_value: number; justification: string }) => {
      const { data, error } = await supabase.rpc('apply_mce_to_budget_objetivo' as any, {
        _mce_id: input.mce_id,
        _new_value: input.new_value,
        _justification: input.justification,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: QK.budgetUpdates(vars.mce_id) });
      toast({ title: 'Aplicado ao Budget Objetivo' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpsertMCEContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      mce_id: string;
      organization_id: string;
      contract_type?: 'simplified' | 'external';
      contract_number?: string;
      value?: number;
      signed_at?: string;
      signed_by_name?: string;
      file_url?: string;
      file_name?: string;
      notes?: string;
    }) => {
      const { error } = await supabase.from('mce_contract_links' as any).insert({
        mce_id: input.mce_id,
        organization_id: input.organization_id,
        contract_type: input.contract_type ?? 'simplified',
        contract_number: input.contract_number ?? null,
        value: input.value ?? 0,
        signed_at: input.signed_at ?? null,
        signed_by_name: input.signed_by_name ?? null,
        file_url: input.file_url ?? null,
        file_name: input.file_name ?? null,
        notes: input.notes ?? null,
      });
      if (error) throw error;
      return input.mce_id;
    },
    onSuccess: (mceId) => {
      qc.invalidateQueries({ queryKey: QK.contract(mceId) });
      toast({ title: 'Contrato registado' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useAxiaAnalyzeMCE() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mce_id: string) => {
      const { data, error } = await supabase.functions.invoke('mce-axia-analyze', {
        body: { mce_id },
      });
      if (error) throw error;
      return data as { alerts: Array<{ level: 'info' | 'warning' | 'critical'; message: string }>; summary: string };
    },
    onSuccess: (_d, mceId) => {
      qc.invalidateQueries({ queryKey: ['mce', 'detail', mceId] });
      toast({ title: 'Axia analisou o MCE' });
    },
    onError: (e: Error) => toast({ title: 'Axia indisponível', description: e.message, variant: 'destructive' }),
  });
}
