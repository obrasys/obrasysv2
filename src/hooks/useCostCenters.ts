import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CostCenter, CostCenterType } from '@/types/cost-center';

export function useCostCenters(filter?: { type?: CostCenterType; activeOnly?: boolean }) {
  return useQuery({
    queryKey: ['cost-centers', filter],
    queryFn: async () => {
      let q = supabase.from('cost_centers').select('*').order('code', { ascending: true });
      if (filter?.type) q = q.eq('type', filter.type);
      if (filter?.activeOnly) q = q.eq('active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CostCenter[];
    },
  });
}

export function useCreateCostCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      code: string;
      name: string;
      type: CostCenterType;
      parent_id?: string | null;
      location?: string | null;
      fiscal_year?: number | null;
      notes?: string | null;
    }) => {
      const { data: orgId, error: orgErr } = await supabase.rpc('get_user_org_id');
      if (orgErr) throw orgErr;
      if (!orgId) throw new Error('Sem organização associada ao utilizador');
      const { data, error } = await supabase
        .from('cost_centers')
        .insert({ ...input, organization_id: orgId })
        .select()
        .single();
      if (error) throw error;
      return data as CostCenter;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cost-centers'] }),
  });
}

export function useUpdateCostCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CostCenter> }) => {
      const { data, error } = await supabase
        .from('cost_centers')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as CostCenter;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cost-centers'] }),
  });
}
