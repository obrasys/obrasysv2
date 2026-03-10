import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Cliente, ClienteFormData, NivelAcesso } from '@/types/clientes';

export function useClientes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all clients
  const { data: clientes, isLoading, error } = useQuery({
    queryKey: ['clientes', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nome');

      if (error) throw error;
      return data as Cliente[];
    },
    enabled: !!user,
  });

  // Fetch active clients only
  const { data: clientesAtivos } = useQuery({
    queryKey: ['clientes', 'ativos', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      return data as Cliente[];
    },
    enabled: !!user,
  });

  // Statistics
  const { data: stats } = useQuery({
    queryKey: ['clientes', 'stats', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data: allClientes, error } = await supabase
        .from('clientes')
        .select('id, ativo, nivel_acesso')
        .eq('user_id', user.id);

      if (error) throw error;

      const total = allClientes?.length || 0;
      const ativos = allClientes?.filter(c => c.ativo).length || 0;
      const porNivel = {
        basico: allClientes?.filter(c => c.nivel_acesso === 'basico').length || 0,
        intermediario: allClientes?.filter(c => c.nivel_acesso === 'intermediario').length || 0,
        completo: allClientes?.filter(c => c.nivel_acesso === 'completo').length || 0,
      };

      return { total, ativos, inativos: total - ativos, porNivel };
    },
    enabled: !!user,
  });

  // Create client
  const createCliente = useMutation({
    mutationFn: async (data: ClienteFormData) => {
      if (!user) throw new Error('Utilizador não autenticado');

      const { data: cliente, error } = await supabase
        .from('clientes')
        .insert({
          ...data,
          user_id: user.id,
          criado_por: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return cliente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast({
        title: 'Cliente criado',
        description: 'O cliente foi criado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar cliente',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update client
  const updateCliente = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ClienteFormData> }) => {
      const { data: cliente, error } = await supabase
        .from('clientes')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return cliente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast({
        title: 'Cliente atualizado',
        description: 'Os dados do cliente foram atualizados.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar cliente',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete client
  const deleteCliente = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast({
        title: 'Cliente eliminado',
        description: 'O cliente foi eliminado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao eliminar cliente',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Toggle active status
  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('clientes')
        .update({ ativo })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast({
        title: variables.ativo ? 'Cliente ativado' : 'Cliente desativado',
        description: `O cliente foi ${variables.ativo ? 'ativado' : 'desativado'}.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao alterar estado',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    clientes,
    clientesAtivos,
    stats,
    isLoading,
    error,
    createCliente,
    updateCliente,
    deleteCliente,
    toggleAtivo,
  };
}

export function useCliente(id: string | undefined) {
  const { user } = useAuth();

  // Fetch single client with counts
  const { data: cliente, isLoading, error } = useQuery({
    queryKey: ['cliente', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Get obras count
      const { count: obrasCount } = await supabase
        .from('obras')
        .select('*', { count: 'exact', head: true })
        .eq('cliente_id', id);

      // Get orcamentos count
      const { count: orcamentosCount } = await supabase
        .from('orcamentos')
        .select('*', { count: 'exact', head: true })
        .eq('cliente_id', id);

      return {
        ...data,
        obras_count: obrasCount || 0,
        orcamentos_count: orcamentosCount || 0,
      } as Cliente;
    },
    enabled: !!id && !!user,
  });

  // Fetch client's obras
  const { data: obras } = useQuery({
    queryKey: ['cliente', id, 'obras'],
    queryFn: async () => {
      if (!id) return [];

      const { data, error } = await supabase
        .from('obras')
        .select('id, nome, status, progresso, valor_previsto, data_inicio, data_fim')
        .eq('cliente_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  // Fetch client's orcamentos
  const { data: orcamentos } = useQuery({
    queryKey: ['cliente', id, 'orcamentos'],
    queryFn: async () => {
      if (!id) return [];

      const { data, error } = await supabase
        .from('orcamentos')
        .select('id, titulo, status, valor_total, created_at')
        .eq('cliente_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  return {
    cliente,
    obras,
    orcamentos,
    isLoading,
    error,
  };
}
