import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { RelatorioDiario, RDOFormData, TrabalhoQuantificado } from '@/types/rdos';
import { parseTrabalhos } from '@/types/rdos';

// Helper to transform DB row to RelatorioDiario
function transformRDO(row: any): RelatorioDiario {
  return {
    ...row,
    trabalhos_quantificados: parseTrabalhos(row.trabalhos_quantificados),
    fotos: row.fotos || [],
  };
}

export function useRDOs(obraId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all RDOs (optionally filtered by obra)
  const { data: rdos, isLoading, error } = useQuery({
    queryKey: ['rdos', user?.id, obraId],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('relatorios_diarios')
        .select(`
          *,
          obra:obras(id, nome, cliente)
        `)
        .order('data', { ascending: false });

      if (obraId) {
        query = query.eq('obra_id', obraId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(transformRDO);
    },
    enabled: !!user,
  });

  // Fetch recent RDOs for dashboard
  const { data: recentRDOs } = useQuery({
    queryKey: ['rdos', 'recent', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('relatorios_diarios')
        .select(`
          *,
          obra:obras(id, nome, cliente)
        `)
        .order('data', { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []).map(transformRDO);
    },
    enabled: !!user,
  });

  // Fetch obras with their latest RDO for dashboard
  const { data: obrasComRDO } = useQuery({
    queryKey: ['obras', 'with-rdo', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get active obras
      const { data: obras, error: obrasError } = await supabase
        .from('obras')
        .select('id, nome, cliente, status, progresso')
        .eq('user_id', user.id)
        .eq('arquivada', false)
        .in('status', ['em_curso', 'planeamento']);

      if (obrasError) throw obrasError;

      // Get latest RDO for each obra
      const obrasWithRDO = await Promise.all(
        (obras || []).map(async (obra) => {
          const { data: latestRDO } = await supabase
            .from('relatorios_diarios')
            .select('id, data, status, trabalhos_executados')
            .eq('obra_id', obra.id)
            .order('data', { ascending: false })
            .limit(1)
            .single();

          return {
            ...obra,
            ultimoRDO: latestRDO || null,
          };
        })
      );

      return obrasWithRDO;
    },
    enabled: !!user,
  });

  // Create RDO
  const createRDO = useMutation({
    mutationFn: async (data: RDOFormData) => {
      if (!user) throw new Error('Utilizador não autenticado');

      const { data: rdo, error } = await supabase
        .from('relatorios_diarios')
        .insert({
          obra_id: data.obra_id,
          data: data.data,
          trabalhos_executados: data.trabalhos_executados,
          ocorrencias: data.ocorrencias,
          observacoes: data.observacoes,
          condicoes_meteorologicas: data.condicoes_meteorologicas,
          mao_de_obra_presente: data.mao_de_obra_presente,
          status: data.status || 'rascunho',
          user_id: user.id,
          criado_por: user.id,
          trabalhos_quantificados: JSON.parse(JSON.stringify(data.trabalhos_quantificados || [])),
          fotos: data.fotos || [],
        })
        .select()
        .single();

      if (error) throw error;
      return rdo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdos'] });
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      toast({
        title: 'RDO criado',
        description: 'O relatório diário foi criado com sucesso.',
      });
    },
    onError: (error: Error) => {
      const message = error.message.includes('duplicate key')
        ? 'Já existe um RDO para esta obra nesta data.'
        : error.message;
      toast({
        title: 'Erro ao criar RDO',
        description: message,
        variant: 'destructive',
      });
    },
  });

  // Update RDO
  const updateRDO = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RDOFormData> }) => {
      const updateData: Record<string, any> = { ...data };
      if (data.trabalhos_quantificados) {
        updateData.trabalhos_quantificados = JSON.parse(JSON.stringify(data.trabalhos_quantificados));
      }
      
      const { data: rdo, error } = await supabase
        .from('relatorios_diarios')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return rdo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdos'] });
      queryClient.invalidateQueries({ queryKey: ['rdo'] });
      toast({
        title: 'RDO atualizado',
        description: 'O relatório diário foi atualizado.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar RDO',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete RDO
  const deleteRDO = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('relatorios_diarios')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdos'] });
      toast({
        title: 'RDO eliminado',
        description: 'O relatório diário foi eliminado.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao eliminar RDO',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Submit RDO
  const submitRDO = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('relatorios_diarios')
        .update({ status: 'submetido' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdos'] });
      queryClient.invalidateQueries({ queryKey: ['rdo'] });
      toast({
        title: 'RDO submetido',
        description: 'O relatório foi submetido para aprovação.',
      });
    },
  });

  // Approve RDO
  const approveRDO = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Utilizador não autenticado');

      const { error } = await supabase
        .from('relatorios_diarios')
        .update({ 
          status: 'aprovado',
          aprovado_por: user.id,
          aprovado_em: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdos'] });
      queryClient.invalidateQueries({ queryKey: ['rdo'] });
      toast({
        title: 'RDO aprovado',
        description: 'O relatório foi aprovado.',
      });
    },
  });

  return {
    rdos,
    recentRDOs,
    obrasComRDO,
    isLoading,
    error,
    createRDO,
    updateRDO,
    deleteRDO,
    submitRDO,
    approveRDO,
  };
}

export function useRDO(id: string | undefined) {
  const { user } = useAuth();

  const { data: rdo, isLoading, error } = useQuery({
    queryKey: ['rdo', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('relatorios_diarios')
        .select(`
          *,
          obra:obras(id, nome, cliente)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return transformRDO(data);
    },
    enabled: !!id && !!user,
  });

  return { rdo, isLoading, error };
}
