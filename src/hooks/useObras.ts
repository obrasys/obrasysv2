import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Obra, ObraFormData, ObraProgressTracking, ObraProgressFormData, ObraStatus } from '@/types/obras';

export function useObras() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: obras, isLoading } = useQuery({
    queryKey: ['obras', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('obras')
        .select(`
          *,
          orcamentos:orcamentos(id, titulo, valor_total, status)
        `)
        .eq('arquivada', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Obra[];
    },
    enabled: !!user?.id,
  });

  const { data: obrasArquivadas, isLoading: isLoadingArquivadas } = useQuery({
    queryKey: ['obras-arquivadas', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('obras')
        .select('*')
        .eq('arquivada', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as Obra[];
    },
    enabled: !!user?.id,
  });

  const createObra = useMutation({
    mutationFn: async (formData: ObraFormData) => {
      if (!user?.id) throw new Error('Utilizador não autenticado');

      const { data, error } = await supabase
        .from('obras')
        .insert({
          user_id: user.id,
          nome: formData.nome,
          cliente: formData.cliente || null,
          cliente_id: formData.cliente_id || null,
          endereco: formData.endereco || null,
          status: formData.status || 'planeamento',
          data_inicio: formData.data_inicio || null,
          data_fim: formData.data_fim || null,
          valor_previsto: formData.valor_previsto || 0,
          gestor_id: formData.gestor_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      toast({
        title: 'Sucesso',
        description: 'Obra criada com sucesso',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateObra = useMutation({
    mutationFn: async ({ id, ...formData }: ObraFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('obras')
        .update({
          nome: formData.nome,
          cliente: formData.cliente || null,
          cliente_id: formData.cliente_id || null,
          endereco: formData.endereco || null,
          status: formData.status,
          data_inicio: formData.data_inicio || null,
          data_fim: formData.data_fim || null,
          valor_previsto: formData.valor_previsto || 0,
          gestor_id: formData.gestor_id || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      queryClient.invalidateQueries({ queryKey: ['obra'] });
      toast({
        title: 'Sucesso',
        description: 'Obra atualizada com sucesso',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const archiveObra = useMutation({
    mutationFn: async ({ id, arquivada }: { id: string; arquivada: boolean }) => {
      const { error } = await supabase
        .from('obras')
        .update({ arquivada })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      queryClient.invalidateQueries({ queryKey: ['obras-arquivadas'] });
      toast({
        title: 'Sucesso',
        description: variables.arquivada ? 'Obra arquivada com sucesso' : 'Obra restaurada com sucesso',
      });
    },
  });

  const deleteObra = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('obras')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      queryClient.invalidateQueries({ queryKey: ['obras-arquivadas'] });
      toast({
        title: 'Sucesso',
        description: 'Obra eliminada com sucesso',
      });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ObraStatus }) => {
      const { error } = await supabase
        .from('obras')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      queryClient.invalidateQueries({ queryKey: ['obra'] });
      toast({
        title: 'Sucesso',
        description: 'Estado da obra atualizado',
      });
    },
  });

  return {
    obras,
    obrasArquivadas,
    isLoading,
    isLoadingArquivadas,
    createObra,
    updateObra,
    archiveObra,
    deleteObra,
    updateStatus,
  };
}

export function useObra(id: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: obra, isLoading, refetch } = useQuery({
    queryKey: ['obra', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('obras')
        .select(`
          *,
          orcamentos:orcamentos(id, titulo, valor_total, status)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Obra;
    },
    enabled: !!id && !!user?.id,
  });

  const { data: progressTracking, isLoading: isLoadingProgress } = useQuery({
    queryKey: ['obra-progress', id],
    queryFn: async () => {
      if (!id) return [];

      const { data, error } = await supabase
        .from('obra_progress_tracking')
        .select('*')
        .eq('obra_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ObraProgressTracking[];
    },
    enabled: !!id && !!user?.id,
  });

  const createProgressItem = useMutation({
    mutationFn: async (formData: ObraProgressFormData) => {
      if (!id) throw new Error('ID da obra não encontrado');

      const percentagem = formData.quantidade_prevista > 0
        ? Math.min((formData.quantidade_executada / formData.quantidade_prevista) * 100, 100)
        : 0;

      const { data, error } = await supabase
        .from('obra_progress_tracking')
        .insert({
          obra_id: id,
          descricao: formData.descricao,
          quantidade_prevista: formData.quantidade_prevista,
          quantidade_executada: formData.quantidade_executada,
          percentagem,
          unidade: formData.unidade,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obra-progress', id] });
      queryClient.invalidateQueries({ queryKey: ['obra', id] });
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      toast({
        title: 'Sucesso',
        description: 'Item de progresso adicionado',
      });
    },
  });

  const updateProgressItem = useMutation({
    mutationFn: async ({ progressId, ...formData }: ObraProgressFormData & { progressId: string }) => {
      const percentagem = formData.quantidade_prevista > 0
        ? Math.min((formData.quantidade_executada / formData.quantidade_prevista) * 100, 100)
        : 0;

      const { data, error } = await supabase
        .from('obra_progress_tracking')
        .update({
          descricao: formData.descricao,
          quantidade_prevista: formData.quantidade_prevista,
          quantidade_executada: formData.quantidade_executada,
          percentagem,
          unidade: formData.unidade,
        })
        .eq('id', progressId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obra-progress', id] });
      queryClient.invalidateQueries({ queryKey: ['obra', id] });
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      toast({
        title: 'Sucesso',
        description: 'Progresso atualizado',
      });
    },
  });

  const deleteProgressItem = useMutation({
    mutationFn: async (progressId: string) => {
      const { error } = await supabase
        .from('obra_progress_tracking')
        .delete()
        .eq('id', progressId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obra-progress', id] });
      queryClient.invalidateQueries({ queryKey: ['obra', id] });
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      toast({
        title: 'Sucesso',
        description: 'Item de progresso removido',
      });
    },
  });

  return {
    obra,
    progressTracking,
    isLoading,
    isLoadingProgress,
    refetch,
    createProgressItem,
    updateProgressItem,
    deleteProgressItem,
  };
}
