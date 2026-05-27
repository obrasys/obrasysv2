import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  ICFWallPanel,
  ICFWallCompositionResult,
  ICFAccessoryEstimate,
} from '@/types/icf-homeblock';

export function useIcfWallPanels(obraId?: string) {
  return useQuery({
    queryKey: ['icf-wall-panels', obraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('icf_wall_panels' as any)
        .select('*')
        .eq('obra_id', obraId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ICFWallPanel[];
    },
    enabled: !!obraId,
  });
}

export function useCreateIcfWallPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: Partial<ICFWallPanel>) => {
      const payload: any = { ...values };
      if (payload.openings && typeof payload.openings !== 'string') {
        // ok – Supabase aceita jsonb
      }
      const { data, error } = await supabase
        .from('icf_wall_panels' as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['icf-wall-panels', v.obra_id] });
      toast({ title: 'Pano adicionado' });
    },
    onError: (e: any) =>
      toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateIcfWallPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<ICFWallPanel> & { id: string }) => {
      const { error } = await supabase
        .from('icf_wall_panels' as any)
        .update(values as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['icf-wall-panels'] }),
    onError: (e: any) =>
      toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteIcfWallPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('icf_wall_panels' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['icf-wall-panels'] });
      toast({ title: 'Pano eliminado' });
    },
    onError: (e: any) =>
      toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useSaveCompositionResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, result }: { id: string; result: ICFWallCompositionResult }) => {
      const { error } = await supabase
        .from('icf_wall_panels' as any)
        .update({
          composition_result: result as any,
          net_area_m2: result.net_area_m2,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['icf-wall-panels'] }),
  });
}
