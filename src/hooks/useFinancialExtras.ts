import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { AftercareRecord, GuaranteeRetention } from '@/types/financial-cycles';

const sb = supabase as any;

// ===================== Retenções de garantia =====================

export function useCreateGuaranteeRetention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      obra_id: string;
      organization_id: string;
      supplier_id?: string;
      description?: string;
      retained_amount: number;
      due_date?: string;
      notes?: string;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Não autenticado');
      const { data, error } = await sb
        .from('guarantee_retentions')
        .insert({
          obra_id: input.obra_id,
          organization_id: input.organization_id,
          user_id: auth.user.id,
          supplier_id: input.supplier_id ?? null,
          description: input.description ?? null,
          retained_amount: input.retained_amount,
          released_amount: 0,
          due_date: input.due_date ?? null,
          status: 'retida',
          notes: input.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as GuaranteeRetention;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['guarantee-retentions', vars.obra_id] });
      qc.invalidateQueries({ queryKey: ['orcamento-rai-obra', vars.obra_id] });
      toast({ title: 'Retenção registada' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useReleaseGuaranteeRetention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; released_amount: number; obra_id: string }) => {
      const { data, error } = await sb
        .from('guarantee_retentions')
        .update({
          released_amount: input.released_amount,
          released_at: new Date().toISOString(),
          status: 'liberada_total',
        })
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data as GuaranteeRetention;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['guarantee-retentions', vars.obra_id] });
      toast({ title: 'Retenção libertada' });
    },
  });
}

// ===================== Pós-venda / SPV =====================

export function useCreateAftercareRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      obra_id: string;
      organization_id: string;
      description: string;
      category?: string;
      cost_value: number;
      supplier_id?: string;
      notes?: string;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Não autenticado');
      const { data, error } = await sb
        .from('aftercare_records')
        .insert({
          obra_id: input.obra_id,
          organization_id: input.organization_id,
          user_id: auth.user.id,
          description: input.description,
          category: input.category ?? null,
          cost_value: input.cost_value,
          supplier_id: input.supplier_id ?? null,
          notes: input.notes ?? null,
          status: 'aberto',
          reported_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data as AftercareRecord;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['aftercare-records', vars.obra_id] });
      qc.invalidateQueries({ queryKey: ['orcamento-rai-obra', vars.obra_id] });
      toast({ title: 'Pós-venda registado' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useResolveAftercareRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; obra_id: string }) => {
      const { error } = await sb
        .from('aftercare_records')
        .update({ status: 'resolvido', resolved_at: new Date().toISOString() })
        .eq('id', input.id);
      if (error) throw error;
      return input.id;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['aftercare-records', vars.obra_id] });
      toast({ title: 'Pós-venda resolvido' });
    },
  });
}
