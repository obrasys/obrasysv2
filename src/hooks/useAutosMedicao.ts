import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { 
  AutoMedicao, 
  AutoMedicaoItem, 
  AutoMedicaoAnexo, 
  AutoMedicaoAssinatura,
  AutoMedicaoFormData,
  AutoMedicaoItemFormData 
} from '@/types/autos-medicao';

export function useAutosMedicao(obraId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all autos de medição
  const { data: autos, isLoading, error } = useQuery({
    queryKey: ['autos-medicao', obraId],
    queryFn: async () => {
      let query = supabase
        .from('autos_medicao')
        .select(`
          *,
          obra:obras(id, nome, endereco, cliente_id),
          orcamento:orcamentos(id, titulo, valor_total),
          subempreiteiro:subempreiteiros(id, nome, nif)
        `)
        .order('numero_auto', { ascending: false });

      if (obraId) {
        query = query.eq('obra_id', obraId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as AutoMedicao[];
    },
    enabled: !!user,
  });

  // Fetch single auto with all relations
  const fetchAutoById = async (id: string): Promise<AutoMedicao | null> => {
    const { data, error } = await supabase
      .from('autos_medicao')
      .select(`
        *,
        obra:obras(id, nome, endereco, cliente_id),
        orcamento:orcamentos(id, titulo, valor_total),
        subempreiteiro:subempreiteiros(id, nome, nif)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    
    // Fetch related items
    const { data: itens } = await supabase
      .from('autos_medicao_itens')
      .select('*')
      .eq('auto_id', id)
      .order('ordem', { ascending: true });

    // Fetch anexos
    const { data: anexos } = await supabase
      .from('autos_medicao_anexos')
      .select('*')
      .eq('auto_id', id);

    // Fetch assinaturas
    const { data: assinaturas } = await supabase
      .from('autos_medicao_assinaturas')
      .select('*')
      .eq('auto_id', id);

    return {
      ...data,
      itens: itens || [],
      anexos: anexos || [],
      assinaturas: assinaturas || [],
    } as unknown as AutoMedicao;
  };

  // Get next auto number for obra
  const getNextAutoNumber = async (obraId: string): Promise<number> => {
    const { data } = await supabase
      .from('autos_medicao')
      .select('numero_auto')
      .eq('obra_id', obraId)
      .order('numero_auto', { ascending: false })
      .limit(1);

    return (data?.[0]?.numero_auto || 0) + 1;
  };

  // Create auto de medição
  const createMutation = useMutation({
    mutationFn: async (formData: AutoMedicaoFormData) => {
      if (!user) throw new Error('Utilizador não autenticado');

      const numeroAuto = await getNextAutoNumber(formData.obra_id);

      // Convert empty strings to null for optional UUID fields
      const sanitizedData = {
        ...formData,
        orcamento_id: formData.orcamento_id || null,
        subempreiteiro_id: formData.subempreiteiro_id || null,
        tipo_contrato: formData.tipo_contrato || null,
        fase_obra: formData.fase_obra || null,
        idioma: formData.idioma || 'pt',
      };

      const { data, error } = await supabase
        .from('autos_medicao')
        .insert({
          ...sanitizedData,
          user_id: user.id,
          numero_auto: numeroAuto,
          estado: 'rascunho',
          valor_previsto: 0,
          valor_medido_atual: 0,
          valor_medido_acumulado: 0,
          valor_anterior_acumulado: 0,
          percentagem_global: 0,
          valor_iva: 0,
          valor_total_com_iva: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autos-medicao'] });
      toast.success('Auto de medição criado com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao criar auto:', error);
      toast.error('Erro ao criar auto de medição');
    },
  });

  // Update auto de medição
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AutoMedicaoFormData> }) => {
      // Convert empty strings to null for optional UUID fields
      const sanitizedData = {
        ...data,
        orcamento_id: data.orcamento_id || null,
        subempreiteiro_id: data.subempreiteiro_id || null,
        tipo_contrato: data.tipo_contrato || null,
        fase_obra: data.fase_obra || null,
      };

      const { error } = await supabase
        .from('autos_medicao')
        .update(sanitizedData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autos-medicao'] });
      toast.success('Auto de medição atualizado');
    },
    onError: (error) => {
      console.error('Erro ao atualizar auto:', error);
      toast.error('Erro ao atualizar auto de medição');
    },
  });

  // Delete auto de medição
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('autos_medicao')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autos-medicao'] });
      toast.success('Auto de medição eliminado');
    },
    onError: (error) => {
      console.error('Erro ao eliminar auto:', error);
      toast.error('Erro ao eliminar auto de medição');
    },
  });

  // Update estado
  const updateEstadoMutation = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: string }) => {
      const updates: Record<string, unknown> = { estado };
      
      if (estado === 'validado') {
        updates.validado_em = new Date().toISOString();
        updates.validado_por = user?.id;
      }

      const { error } = await supabase
        .from('autos_medicao')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autos-medicao'] });
      toast.success('Estado atualizado com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao atualizar estado:', error);
      toast.error('Erro ao atualizar estado');
    },
  });

  // Add item to auto
  const addItemMutation = useMutation({
    mutationFn: async ({ autoId, item }: { autoId: string; item: AutoMedicaoItemFormData }) => {
      // Get current items count for ordem
      const { data: existingItems } = await supabase
        .from('autos_medicao_itens')
        .select('ordem')
        .eq('auto_id', autoId)
        .order('ordem', { ascending: false })
        .limit(1);

      const nextOrdem = (existingItems?.[0]?.ordem || 0) + 1;

      // Calculate values
      const quantidadeAcumulada = (item.quantidade_atual || 0);
      const valorAtual = (item.quantidade_atual || 0) * (item.preco_unitario || 0);
      const valorPrevisto = (item.quantidade_prevista || 0) * (item.preco_unitario || 0);
      const desvioPercentual = item.quantidade_prevista 
        ? ((quantidadeAcumulada - item.quantidade_prevista) / item.quantidade_prevista) * 100 
        : 0;
      const dentroTolerancia = Math.abs(desvioPercentual) <= (item.tolerancia_maxima || 5);

      const { data, error } = await supabase
        .from('autos_medicao_itens')
        .insert({
          auto_id: autoId,
          ...item,
          ordem: nextOrdem,
          quantidade_anterior: 0,
          quantidade_acumulada: quantidadeAcumulada,
          valor_previsto: valorPrevisto,
          valor_anterior: 0,
          valor_atual: valorAtual,
          valor_acumulado: valorAtual,
          desvio_percentual: desvioPercentual,
          dentro_tolerancia: dentroTolerancia,
        })
        .select()
        .maybeSingle();

      if (error) throw error;

      // Recalculate auto totals
      await recalculateAutoTotals(autoId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autos-medicao'] });
      queryClient.invalidateQueries({ queryKey: ['auto-medicao'] });
      toast.success('Item adicionado');
    },
    onError: (error) => {
      console.error('Erro ao adicionar item:', error);
      toast.error('Erro ao adicionar item');
    },
  });

  // Update item
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AutoMedicaoItemFormData> }) => {
      // Get current item to get auto_id and calculate new values
      const { data: currentItem, error: fetchErr } = await supabase
        .from('autos_medicao_itens')
        .select('*, auto_id')
        .eq('id', id)
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      if (!currentItem) throw new Error('Item não encontrado ou sem permissão para editar');

      const quantidadeAtual = data.quantidade_atual ?? currentItem.quantidade_atual ?? 0;
      const quantidadeAnterior = currentItem.quantidade_anterior ?? 0;
      const quantidadePrevista = data.quantidade_prevista ?? currentItem.quantidade_prevista ?? 0;
      const precoUnitario = data.preco_unitario ?? currentItem.preco_unitario ?? 0;
      const toleranciaMaxima = data.tolerancia_maxima ?? currentItem.tolerancia_maxima ?? 5;

      const quantidadeAcumulada = quantidadeAnterior + quantidadeAtual;
      const valorAtual = quantidadeAtual * precoUnitario;
      const valorAcumulado = quantidadeAcumulada * precoUnitario;
      const valorPrevisto = quantidadePrevista * precoUnitario;
      const desvioPercentual = quantidadePrevista 
        ? ((quantidadeAcumulada - quantidadePrevista) / quantidadePrevista) * 100 
        : 0;
      const dentroTolerancia = Math.abs(desvioPercentual) <= toleranciaMaxima;

      const { error } = await supabase
        .from('autos_medicao_itens')
        .update({
          ...data,
          quantidade_acumulada: quantidadeAcumulada,
          valor_previsto: valorPrevisto,
          valor_atual: valorAtual,
          valor_acumulado: valorAcumulado,
          desvio_percentual: desvioPercentual,
          dentro_tolerancia: dentroTolerancia,
        })
        .eq('id', id);

      if (error) throw error;

      // Recalculate auto totals
      await recalculateAutoTotals(currentItem.auto_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autos-medicao'] });
      queryClient.invalidateQueries({ queryKey: ['auto-medicao'] });
      toast.success('Item atualizado');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar item:', error);
      toast.error(error?.message || 'Erro ao atualizar item');
    },
  });

  // Delete item
  const deleteItemMutation = useMutation({
    mutationFn: async ({ id, autoId }: { id: string; autoId: string }) => {
      const { error } = await supabase
        .from('autos_medicao_itens')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Recalculate auto totals
      await recalculateAutoTotals(autoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autos-medicao'] });
      queryClient.invalidateQueries({ queryKey: ['auto-medicao'] });
      toast.success('Item eliminado');
    },
    onError: (error) => {
      console.error('Erro ao eliminar item:', error);
      toast.error('Erro ao eliminar item');
    },
  });

  // Recalculate auto totals
  const recalculateAutoTotals = async (autoId: string) => {
    const { data: itens } = await supabase
      .from('autos_medicao_itens')
      .select('valor_previsto, valor_atual, valor_acumulado, valor_anterior')
      .eq('auto_id', autoId);

    if (!itens) return;

    const valorPrevisto = itens.reduce((acc, item) => acc + (item.valor_previsto || 0), 0);
    const valorMedidoAtual = itens.reduce((acc, item) => acc + (item.valor_atual || 0), 0);
    const valorAnteriorAcumulado = itens.reduce((acc, item) => acc + (item.valor_anterior || 0), 0);
    const valorMedidoAcumulado = itens.reduce((acc, item) => acc + (item.valor_acumulado || 0), 0);
    const percentagemGlobal = valorPrevisto > 0 ? (valorMedidoAcumulado / valorPrevisto) * 100 : 0;

    // Get taxa IVA
    const { data: auto } = await supabase
      .from('autos_medicao')
      .select('taxa_iva')
      .eq('id', autoId)
      .maybeSingle();

    const taxaIva = auto?.taxa_iva || 23;
    const valorIva = valorMedidoAtual * (taxaIva / 100);
    const valorTotalComIva = valorMedidoAtual + valorIva;

    await supabase
      .from('autos_medicao')
      .update({
        valor_previsto: valorPrevisto,
        valor_medido_atual: valorMedidoAtual,
        valor_anterior_acumulado: valorAnteriorAcumulado,
        valor_medido_acumulado: valorMedidoAcumulado,
        percentagem_global: percentagemGlobal,
        valor_iva: valorIva,
        valor_total_com_iva: valorTotalComIva,
      })
      .eq('id', autoId);
  };

  // Add assinatura
  const addAssinaturaMutation = useMutation({
    mutationFn: async (assinatura: Omit<AutoMedicaoAssinatura, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('autos_medicao_assinaturas')
        .insert(assinatura)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-medicao'] });
      toast.success('Assinatura adicionada');
    },
    onError: (error) => {
      console.error('Erro ao adicionar assinatura:', error);
      toast.error('Erro ao adicionar assinatura');
    },
  });

  return {
    autos,
    isLoading,
    error,
    fetchAutoById,
    getNextAutoNumber,
    createAuto: createMutation.mutate,
    updateAuto: updateMutation.mutate,
    deleteAuto: deleteMutation.mutate,
    updateEstado: updateEstadoMutation.mutate,
    addItem: addItemMutation.mutate,
    updateItem: updateItemMutation.mutate,
    deleteItem: deleteItemMutation.mutate,
    addAssinatura: addAssinaturaMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Hook for single auto
export function useAutoMedicao(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['auto-medicao', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('autos_medicao')
        .select(`
          *,
          obra:obras(id, nome, endereco, cliente_id),
          orcamento:orcamentos(id, titulo, valor_total),
          subempreiteiro:subempreiteiros(id, nome, nif)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Fetch related items
      const { data: itens } = await supabase
        .from('autos_medicao_itens')
        .select('*')
        .eq('auto_id', id)
        .order('ordem', { ascending: true });

      // Fetch anexos
      const { data: anexos } = await supabase
        .from('autos_medicao_anexos')
        .select('*')
        .eq('auto_id', id);

      // Fetch assinaturas
      const { data: assinaturas } = await supabase
        .from('autos_medicao_assinaturas')
        .select('*')
        .eq('auto_id', id);

      return {
        ...data,
        itens: itens || [],
        anexos: anexos || [],
        assinaturas: assinaturas || [],
      } as unknown as AutoMedicao;
    },
    enabled: !!user && !!id,
  });
}
