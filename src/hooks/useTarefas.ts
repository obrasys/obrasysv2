import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Tarefa, TarefaFormData, TarefaCronograma, CronogramaFormData } from '@/types/tarefas';

export function useTarefas(obraId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch tarefas
  const { data: tarefas, isLoading: isLoadingTarefas } = useQuery({
    queryKey: ['tarefas', obraId],
    queryFn: async () => {
      let query = supabase
        .from('tarefas')
        .select(`
          *,
          obra:obras(id, nome),
          responsavel:profiles!tarefas_responsavel_id_fkey(id, nome)
        `)
        .eq('user_id', user?.id)
        .order('data_agendada', { ascending: true, nullsFirst: false })
        .order('prioridade', { ascending: false })
        .order('created_at', { ascending: false });

      if (obraId) {
        query = query.eq('obra_id', obraId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Tarefa[];
    },
    enabled: !!user,
  });

  // Fetch cronograma
  const { data: cronograma, isLoading: isLoadingCronograma } = useQuery({
    queryKey: ['cronograma', obraId],
    queryFn: async () => {
      let query = supabase
        .from('tarefas_cronograma')
        .select(`
          *,
          obra:obras(id, nome)
        `)
        .eq('user_id', user?.id)
        .order('data_inicio', { ascending: true });

      if (obraId) {
        query = query.eq('obra_id', obraId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TarefaCronograma[];
    },
    enabled: !!user,
  });

  // Create tarefa
  const createTarefa = useMutation({
    mutationFn: async (formData: TarefaFormData) => {
      const { data, error } = await supabase
        .from('tarefas')
        .insert({
          obra_id: formData.obra_id,
          titulo: formData.titulo,
          descricao: formData.descricao || null,
          status: formData.status,
          prioridade: formData.prioridade,
          categoria: formData.categoria || null,
          data_agendada: formData.data_agendada || null,
          responsavel_id: formData.responsavel_id || null,
          user_id: user?.id,
          dependencias: formData.dependencias || [],
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      toast.success('Tarefa criada com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar tarefa: ' + error.message);
    },
  });

  // Update tarefa
  const updateTarefa = useMutation({
    mutationFn: async ({ id, ...formData }: TarefaFormData & { id: string }) => {
      const updateData: Record<string, unknown> = {
        obra_id: formData.obra_id,
        titulo: formData.titulo,
        descricao: formData.descricao || null,
        status: formData.status,
        prioridade: formData.prioridade,
        categoria: formData.categoria || null,
        data_agendada: formData.data_agendada || null,
        responsavel_id: formData.responsavel_id || null,
      };
      
      // If completing task, set data_conclusao
      if (formData.status === 'concluida') {
        updateData.data_conclusao = new Date().toISOString().split('T')[0];
      }

      const { data, error } = await supabase
        .from('tarefas')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      toast.success('Tarefa atualizada com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar tarefa: ' + error.message);
    },
  });

  // Delete tarefa
  const deleteTarefa = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tarefas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      toast.success('Tarefa eliminada com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao eliminar tarefa: ' + error.message);
    },
  });

  // Create cronograma item
  const createCronograma = useMutation({
    mutationFn: async (formData: CronogramaFormData) => {
      const { data, error } = await supabase
        .from('tarefas_cronograma')
        .insert({
          ...formData,
          user_id: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cronograma'] });
      toast.success('Item do cronograma criado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar item: ' + error.message);
    },
  });

  // Update cronograma item
  const updateCronograma = useMutation({
    mutationFn: async ({ id, ...formData }: CronogramaFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('tarefas_cronograma')
        .update(formData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cronograma'] });
      toast.success('Item do cronograma atualizado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar item: ' + error.message);
    },
  });

  // Delete cronograma item
  const deleteCronograma = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tarefas_cronograma').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cronograma'] });
      toast.success('Item do cronograma eliminado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao eliminar item: ' + error.message);
    },
  });

  // Stats
  const stats = {
    total: tarefas?.length || 0,
    pendentes: tarefas?.filter(t => t.status === 'pendente').length || 0,
    emProgresso: tarefas?.filter(t => t.status === 'em_progresso').length || 0,
    concluidas: tarefas?.filter(t => t.status === 'concluida').length || 0,
    atrasadas: tarefas?.filter(t => {
      if (!t.data_agendada || t.status === 'concluida' || t.status === 'cancelada') return false;
      return new Date(t.data_agendada) < new Date();
    }).length || 0,
    urgentes: tarefas?.filter(t => t.prioridade === 'urgente' && t.status !== 'concluida').length || 0,
  };

  return {
    tarefas,
    cronograma,
    stats,
    isLoading: isLoadingTarefas || isLoadingCronograma,
    createTarefa,
    updateTarefa,
    deleteTarefa,
    createCronograma,
    updateCronograma,
    deleteCronograma,
  };
}
