import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface IcfCalculationConstants {
  aco_kg_por_m3_paredes: number;
  painel_area_m2: number;
  fator_topos: number;
  fator_cantos_c3: number;
  fator_cantos_c4: number;
  espacadores_por_painel: number;
  abobadilhas_por_m2: number;
  trelicas_ml_por_m2: number;
  altura_media_sapata_m: number;
  vaos_por_padieira: number;
}

export const ICF_DEFAULT_CONSTANTS: IcfCalculationConstants = {
  aco_kg_por_m3_paredes: 35,
  painel_area_m2: 0.36,
  fator_topos: 0.15,
  fator_cantos_c3: 0.20,
  fator_cantos_c4: 0.10,
  espacadores_por_painel: 6,
  abobadilhas_por_m2: 0.5,
  trelicas_ml_por_m2: 1.6,
  altura_media_sapata_m: 0.45,
  vaos_por_padieira: 3,
};

export function useIcfCalculationConstants() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['icf-calc-constants', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<IcfCalculationConstants> => {
      const { data, error } = await (supabase as any)
        .from('icf_calculation_constants')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return ICF_DEFAULT_CONSTANTS;
      return {
        aco_kg_por_m3_paredes: Number(data.aco_kg_por_m3_paredes),
        painel_area_m2: Number(data.painel_area_m2),
        fator_topos: Number(data.fator_topos),
        fator_cantos_c3: Number(data.fator_cantos_c3),
        fator_cantos_c4: Number(data.fator_cantos_c4),
        espacadores_por_painel: Number(data.espacadores_por_painel),
        abobadilhas_por_m2: Number(data.abobadilhas_por_m2),
        trelicas_ml_por_m2: Number(data.trelicas_ml_por_m2),
        altura_media_sapata_m: Number(data.altura_media_sapata_m),
        vaos_por_padieira: Number(data.vaos_por_padieira),
      };
    },
  });
}

export function useSaveIcfCalculationConstants() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: IcfCalculationConstants) => {
      if (!user?.id) throw new Error('Não autenticado');
      const { error } = await (supabase as any)
        .from('icf_calculation_constants')
        .upsert({ user_id: user.id, ...values }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['icf-calc-constants'] });
      toast({ title: 'Constantes ICF guardadas', description: 'As próximas gerações usarão estes valores.' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
