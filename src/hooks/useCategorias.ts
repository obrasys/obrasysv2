import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CategoriaFinanceira, CategoriaFormData } from '@/types/categorias';
import type { OrigemConta } from '@/types/financeiro';

export function useCategorias() {
  const queryClient = useQueryClient();

  const { data: categorias, isLoading, error } = useQuery({
    queryKey: ['categorias-financeiras'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias_financeiras')
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (error) throw error;
      return data as CategoriaFinanceira[];
    },
  });

  const categoriasPorOrigem = (origem: OrigemConta) => {
    return categorias?.filter((cat) => cat.origem === origem) || [];
  };

  const createCategoria = useMutation({
    mutationFn: async (data: CategoriaFormData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      const { data: newCategoria, error } = await supabase
        .from('categorias_financeiras')
        .insert({
          ...data,
          user_id: user.user.id,
          cor: data.cor || '#6b7280',
        })
        .select()
        .single();

      if (error) throw error;
      return newCategoria;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-financeiras'] });
      toast.success('Categoria criada com sucesso');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Já existe uma categoria com este nome para esta origem');
      } else {
        toast.error('Erro ao criar categoria');
      }
    },
  });

  const updateCategoria = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CategoriaFormData> & { ativo?: boolean } }) => {
      const { error } = await supabase
        .from('categorias_financeiras')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-financeiras'] });
      toast.success('Categoria atualizada com sucesso');
    },
    onError: () => {
      toast.error('Erro ao atualizar categoria');
    },
  });

  const deleteCategoria = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categorias_financeiras')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-financeiras'] });
      toast.success('Categoria excluída com sucesso');
    },
    onError: () => {
      toast.error('Erro ao excluir categoria');
    },
  });

  return {
    categorias,
    categoriasPorOrigem,
    isLoading,
    error,
    createCategoria,
    updateCategoria,
    deleteCategoria,
  };
}
