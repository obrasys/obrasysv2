import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface IcfBudgetPreset {
  id: string;
  user_id: string;
  nome: string;
  margem_lucro: number;
  iva_percent: number;
  custos_indiretos_percent: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useIcfBudgetPresets() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['icf-budget-presets', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('icf_budget_presets' as any)
        .select('*')
        .order('is_default', { ascending: false })
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as IcfBudgetPreset[];
    },
  });
}

export function useSaveIcfBudgetPreset() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      nome: string;
      margem_lucro: number;
      iva_percent: number;
      custos_indiretos_percent: number;
      is_default?: boolean;
    }) => {
      if (!user?.id) throw new Error('Não autenticado');

      // Se for default, desmarcar os outros
      if (input.is_default) {
        await supabase
          .from('icf_budget_presets' as any)
          .update({ is_default: false } as any)
          .eq('user_id', user.id);
      }

      const { data, error } = await supabase
        .from('icf_budget_presets' as any)
        .insert({ ...input, user_id: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['icf-budget-presets'] });
      toast({ title: 'Preset guardado', description: 'Disponível para reutilização.' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteIcfBudgetPreset() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('icf_budget_presets' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['icf-budget-presets'] });
      toast({ title: 'Preset eliminado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
