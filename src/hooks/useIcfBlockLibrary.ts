import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ICFBlockLibraryItem } from '@/types/icf-homeblock';

export function useIcfBlockLibrary(category?: string) {
  return useQuery({
    queryKey: ['icf-block-library', category ?? 'all'],
    queryFn: async () => {
      let q = supabase.from('icf_block_library' as any).select('*').order('category').order('name');
      if (category) q = q.eq('category', category);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ICFBlockLibraryItem[];
    },
  });
}

export function useIcfBlockByCode(code?: string | null) {
  return useQuery({
    queryKey: ['icf-block-library', 'code', code],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('icf_block_library' as any)
        .select('*')
        .eq('code', code!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as ICFBlockLibraryItem | null;
    },
    enabled: !!code,
  });
}

export function useCreateIcfBlock() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: Partial<ICFBlockLibraryItem>) => {
      const { data, error } = await supabase
        .from('icf_block_library' as any)
        .insert(values as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['icf-block-library'] });
      toast({ title: 'Peça adicionada à biblioteca' });
    },
    onError: (e: any) =>
      toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
