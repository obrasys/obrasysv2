import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type {
  MceMap, MceSupplier, MceItem, MceSupplierItemPrice,
  MceCategory, MceStatus, MceProposalStatus,
} from '@/types/mce';

const QK = {
  list: (obraId: string) => ['mce', 'list', obraId] as const,
  detail: (id: string) => ['mce', 'detail', id] as const,
};

export function useMCEList(obraId: string | undefined) {
  return useQuery({
    queryKey: QK.list(obraId ?? ''),
    enabled: !!obraId,
    queryFn: async (): Promise<MceMap[]> => {
      const { data, error } = await supabase
        .from('mce_maps')
        .select('*')
        .eq('obra_id', obraId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MceMap[];
    },
  });
}

export interface MceDetail {
  map: MceMap;
  suppliers: MceSupplier[];
  items: MceItem[];
  prices: MceSupplierItemPrice[];
}

export function useMCEDetail(id: string | undefined) {
  return useQuery({
    queryKey: QK.detail(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<MceDetail> => {
      const [mapR, supR, itemsR, pricesR] = await Promise.all([
        supabase.from('mce_maps').select('*').eq('id', id!).single(),
        supabase.from('mce_suppliers').select('*').eq('mce_id', id!).order('position'),
        supabase.from('mce_items').select('*').eq('mce_id', id!).order('sort_order'),
        supabase.from('mce_supplier_item_prices').select('*').eq('mce_id', id!),
      ]);
      if (mapR.error) throw mapR.error;
      if (supR.error) throw supR.error;
      if (itemsR.error) throw itemsR.error;
      if (pricesR.error) throw pricesR.error;
      return {
        map: mapR.data as MceMap,
        suppliers: (supR.data ?? []) as MceSupplier[],
        items: (itemsR.data ?? []) as MceItem[],
        prices: (pricesR.data ?? []) as MceSupplierItemPrice[],
      };
    },
  });
}

export function useCreateMCE() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { obra_id: string; title?: string; category?: MceCategory }) => {
      if (!user) throw new Error('Sem sessão');
      // get org
      const { data: org } = await supabase
        .from('organization_members').select('organization_id')
        .eq('user_id', user.id).limit(1).maybeSingle();
      if (!org) throw new Error('Sem organização');

      // get obra for prefill
      const { data: obra } = await supabase
        .from('obras').select('id, nome, endereco').eq('id', input.obra_id).maybeSingle();

      const { data, error } = await supabase
        .from('mce_maps')
        .insert({
          obra_id: input.obra_id,
          user_id: user.id,
          organization_id: org.organization_id,
          title: input.title ?? 'Novo MCE',
          category: input.category ?? null,
          work_name: obra?.nome ?? null,
          work_location: obra?.endereco ?? null,
          created_by: user.id,
        })
        .select('id')
        .single();
      if (error) throw error;

      // seed 3 suppliers Empresa X / Y / Z
      const seedSup = ['Empresa X', 'Empresa Y', 'Empresa Z'].map((name, i) => ({
        mce_id: data.id,
        position: i,
        supplier_name_snapshot: name,
      }));
      await supabase.from('mce_suppliers').insert(seedSup);

      return data.id as string;
    },
    onSuccess: (_id, vars) => {
      qc.invalidateQueries({ queryKey: QK.list(vars.obra_id) });
      toast({ title: 'MCE criado' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateMCEMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<MceMap> }) => {
      const { error } = await supabase.from('mce_maps').update(patch).eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => qc.invalidateQueries({ queryKey: QK.detail(id) }),
  });
}

export function useUpdateMCESupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mce_id, patch }: { id: string; mce_id: string; patch: Partial<MceSupplier> }) => {
      // If marking as selected, unselect others first
      if (patch.is_selected === true) {
        await supabase.from('mce_suppliers').update({ is_selected: false }).eq('mce_id', mce_id);
      }
      const { error } = await supabase.from('mce_suppliers').update(patch).eq('id', id);
      if (error) throw error;
      return mce_id;
    },
    onSuccess: (mceId) => qc.invalidateQueries({ queryKey: QK.detail(mceId) }),
  });
}

export function useAddMCESupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ mce_id, position }: { mce_id: string; position: number }) => {
      const { error } = await supabase.from('mce_suppliers').insert({
        mce_id, position, supplier_name_snapshot: `Empresa ${String.fromCharCode(88 + position)}`,
      });
      if (error) throw error;
      return mce_id;
    },
    onSuccess: (mceId) => qc.invalidateQueries({ queryKey: QK.detail(mceId) }),
  });
}

export function useRemoveMCESupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mce_id }: { id: string; mce_id: string }) => {
      const { error } = await supabase.from('mce_suppliers').delete().eq('id', id);
      if (error) throw error;
      return mce_id;
    },
    onSuccess: (mceId) => qc.invalidateQueries({ queryKey: QK.detail(mceId) }),
  });
}

export function useAddMCEItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ mce_id, sort_order }: { mce_id: string; sort_order: number }) => {
      const { error } = await supabase.from('mce_items').insert({ mce_id, sort_order });
      if (error) throw error;
      return mce_id;
    },
    onSuccess: (mceId) => qc.invalidateQueries({ queryKey: QK.detail(mceId) }),
  });
}

export function useUpdateMCEItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mce_id, patch }: { id: string; mce_id: string; patch: Partial<MceItem> }) => {
      const { error } = await supabase.from('mce_items').update(patch).eq('id', id);
      if (error) throw error;
      return mce_id;
    },
    onSuccess: (mceId) => qc.invalidateQueries({ queryKey: QK.detail(mceId) }),
  });
}

export function useRemoveMCEItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mce_id }: { id: string; mce_id: string }) => {
      const { error } = await supabase.from('mce_items').delete().eq('id', id);
      if (error) throw error;
      return mce_id;
    },
    onSuccess: (mceId) => qc.invalidateQueries({ queryKey: QK.detail(mceId) }),
  });
}

export function useUpsertMCEPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      mce_id: string; mce_item_id: string; mce_supplier_id: string; unit_price: number;
    }) => {
      const { error } = await supabase
        .from('mce_supplier_item_prices')
        .upsert(
          {
            mce_id: input.mce_id,
            mce_item_id: input.mce_item_id,
            mce_supplier_id: input.mce_supplier_id,
            unit_price: input.unit_price,
          },
          { onConflict: 'mce_item_id,mce_supplier_id' },
        );
      if (error) throw error;
      return input.mce_id;
    },
    onSuccess: (mceId) => qc.invalidateQueries({ queryKey: QK.detail(mceId) }),
  });
}

export function useDeleteMCE() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, obra_id }: { id: string; obra_id: string }) => {
      const { error } = await supabase.from('mce_maps').delete().eq('id', id);
      if (error) throw error;
      return obra_id;
    },
    onSuccess: (obraId) => {
      qc.invalidateQueries({ queryKey: QK.list(obraId) });
      toast({ title: 'MCE eliminado' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
