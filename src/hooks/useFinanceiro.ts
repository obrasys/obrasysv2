import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { ContaFinanceira, ContaFinanceiraFormData, FinanceiroObra, Fornecedor, FornecedorFormData } from '@/types/financeiro';

export function useFinanceiro(obraId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch contas financeiras
  const { data: contas, isLoading: loadingContas, error: errorContas } = useQuery({
    queryKey: ['contas-financeiras', obraId],
    queryFn: async () => {
      let query = supabase
        .from('contas_financeiras')
        .select(`
          *,
          obra:obras(id, nome),
          fornecedor:fornecedores(id, nome),
          cliente:clientes(id, nome),
          colaborador:profiles(id, nome)
        `)
        .order('data_vencimento', { ascending: true });

      if (obraId) {
        query = query.eq('obra_id', obraId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ContaFinanceira[];
    },
    enabled: !!user,
  });

  // Fetch resumo financeiro por obra
  const { data: financeiroObras, isLoading: loadingFinanceiro } = useQuery({
    queryKey: ['financeiro-obras', obraId],
    queryFn: async () => {
      let query = supabase
        .from('financeiro_obras')
        .select(`
          *,
          obra:obras(id, nome)
        `);

      if (obraId) {
        query = query.eq('obra_id', obraId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FinanceiroObra[];
    },
    enabled: !!user,
  });

  // Fetch fornecedores
  const { data: fornecedores, isLoading: loadingFornecedores } = useQuery({
    queryKey: ['fornecedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data as Fornecedor[];
    },
    enabled: !!user,
  });

  // Dashboard financeiro
  const dashboard = useQuery({
    queryKey: ['financeiro-dashboard', obraId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      let query = supabase
        .from('contas_financeiras')
        .select('*');

      if (obraId) {
        query = query.eq('obra_id', obraId);
      }

      const { data: todasContas, error } = await query;
      if (error) throw error;

      // Buscar custos de pessoal (alocações)
      let alocQuery = supabase
        .from('alocacoes_obra')
        .select('custo_dia, custo_hora, data_inicio, data_fim, ativo');

      if (obraId) {
        alocQuery = alocQuery.eq('obra_id', obraId);
      }

      const { data: alocacoes } = await alocQuery;

      // Calcular custos de pessoal baseados em custo_dia * dias trabalhados
      const custosPessoal = (alocacoes || []).reduce((sum, a) => {
        if (a.custo_dia) {
          const inicio = new Date(a.data_inicio);
          const fim = a.data_fim ? new Date(a.data_fim) : new Date();
          const dias = Math.max(0, Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
          return sum + a.custo_dia * dias;
        }
        return sum;
      }, 0);

      // Buscar custos reais do Livro de Ponto (project_labor_cost_entries)
      let laborQuery = (supabase as any)
        .from('project_labor_cost_entries')
        .select('amount')
        .neq('status', 'reversed');

      if (obraId) {
        laborQuery = laborQuery.eq('obra_id', obraId);
      }

      const { data: laborEntries } = await laborQuery;
      const custosLivroPonto = (laborEntries || []).reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

      const contasPagar = todasContas?.filter(c => c.tipo === 'pagar') || [];
      const contasReceber = todasContas?.filter(c => c.tipo === 'receber') || [];

      const totalPagar = contasPagar.reduce((sum, c) => sum + Number(c.valor), 0);
      const totalReceber = contasReceber.reduce((sum, c) => sum + Number(c.valor), 0);
      
      const pagoPagar = contasPagar.filter(c => c.pago).reduce((sum, c) => sum + Number(c.valor), 0);
      const pagoReceber = contasReceber.filter(c => c.pago).reduce((sum, c) => sum + Number(c.valor), 0);

      const vencidas = todasContas?.filter(c => 
        !c.pago && c.data_vencimento < today
      ) || [];

      const aVencer7Dias = todasContas?.filter(c => {
        if (c.pago) return false;
        const vencimento = new Date(c.data_vencimento);
        const em7Dias = new Date();
        em7Dias.setDate(em7Dias.getDate() + 7);
        return vencimento >= new Date(today) && vencimento <= em7Dias;
      }) || [];

      const maoDeObraContas = contasPagar.filter(c => c.origem === 'mao_de_obra').reduce((sum, c) => sum + Number(c.valor), 0);
      const totalMaoDeObra = maoDeObraContas + custosPessoal + custosLivroPonto;

      return {
        totalPagar: totalPagar + custosPessoal + custosLivroPonto,
        totalReceber,
        pagoPagar,
        pagoReceber,
        saldo: totalReceber - totalPagar - custosPessoal - custosLivroPonto,
        saldoRealizado: pagoReceber - pagoPagar,
        vencidas: vencidas.length,
        valorVencido: vencidas.reduce((sum, c) => sum + Number(c.valor), 0),
        aVencer7Dias: aVencer7Dias.length,
        valorAVencer: aVencer7Dias.reduce((sum, c) => sum + Number(c.valor), 0),
        contasPorOrigem: {
          mao_de_obra: totalMaoDeObra,
          material: contasPagar.filter(c => c.origem === 'material').reduce((sum, c) => sum + Number(c.valor), 0),
          outros: contasPagar.filter(c => c.origem === 'outros').reduce((sum, c) => sum + Number(c.valor), 0),
        },
      };
    },
    enabled: !!user,
  });

  // Criar conta financeira
  const createConta = useMutation({
    mutationFn: async (data: ContaFinanceiraFormData) => {
      const payload: Record<string, unknown> = { ...data, user_id: user?.id };
      // Normalizar campos de data: strings vazias -> null/today para evitar
      // erro "invalid input syntax for type date".
      if (typeof payload.data_vencimento !== 'string' || !(payload.data_vencimento as string).trim()) {
        payload.data_vencimento = new Date().toISOString().split('T')[0];
      }
      if (typeof payload.data_pagamento === 'string' && !(payload.data_pagamento as string).trim()) {
        payload.data_pagamento = null;
      }
      const { data: result, error } = await supabase
        .from('contas_financeiras')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-financeiras'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-dashboard'] });
      toast({ title: 'Conta criada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar conta', description: error.message, variant: 'destructive' });
    },
  });

  // Atualizar conta financeira
  const updateConta = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ContaFinanceiraFormData> }) => {
      const { data: result, error } = await supabase
        .from('contas_financeiras')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-financeiras'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-dashboard'] });
      toast({ title: 'Conta atualizada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar conta', description: error.message, variant: 'destructive' });
    },
  });

  // Marcar como pago
  const marcarPago = useMutation({
    mutationFn: async ({ id, pago }: { id: string; pago: boolean }) => {
      const { data: result, error } = await supabase
        .from('contas_financeiras')
        .update({ 
          pago, 
          data_pagamento: pago ? new Date().toISOString().split('T')[0] : null 
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contas-financeiras'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budget-payment-plans'] });
      queryClient.invalidateQueries({ queryKey: ['budget-receivables'] });
      queryClient.invalidateQueries({ queryKey: ['client-payments'] });
      queryClient.invalidateQueries({ queryKey: ['client-awards'] });
      toast({ title: variables.pago ? 'Marcado como pago!' : 'Marcado como pendente!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar status', description: error.message, variant: 'destructive' });
    },
  });

  // Deletar conta financeira
  const deleteConta = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contas_financeiras')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-financeiras'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-dashboard'] });
      toast({ title: 'Conta excluída com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir conta', description: error.message, variant: 'destructive' });
    },
  });

  // Upload de comprovante
  const uploadComprovante = useMutation({
    mutationFn: async ({ contaId, file }: { contaId: string; file: File }) => {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}/${contaId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('comprovantes')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;

      // Store the file path instead of URL - signed URLs will be generated on demand
      const { error: updateError } = await supabase
        .from('contas_financeiras')
        .update({ comprovante_url: filePath })
        .eq('id', contaId);

      if (updateError) throw updateError;

      return filePath;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-financeiras'] });
      toast({ title: 'Comprovante enviado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao enviar comprovante', description: error.message, variant: 'destructive' });
    },
  });

  return {
    contas,
    financeiroObras,
    fornecedores,
    dashboard: dashboard.data,
    isLoading: loadingContas || loadingFinanceiro || loadingFornecedores,
    loadingDashboard: dashboard.isLoading,
    error: errorContas,
    createConta,
    updateConta,
    marcarPago,
    deleteConta,
    uploadComprovante,
  };
}

export function useFornecedores() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: fornecedores, isLoading, error } = useQuery({
    queryKey: ['fornecedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data as Fornecedor[];
    },
    enabled: !!user,
  });

  const createFornecedor = useMutation({
    mutationFn: async (data: FornecedorFormData) => {
      const { data: result, error } = await supabase
        .from('fornecedores')
        .insert([{ ...data, user_id: user?.id }])
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      toast({ title: 'Fornecedor criado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar fornecedor', description: error.message, variant: 'destructive' });
    },
  });

  const updateFornecedor = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FornecedorFormData> }) => {
      const { data: result, error } = await supabase
        .from('fornecedores')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      toast({ title: 'Fornecedor atualizado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar fornecedor', description: error.message, variant: 'destructive' });
    },
  });

  const deleteFornecedor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fornecedores')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      toast({ title: 'Fornecedor excluído com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir fornecedor', description: error.message, variant: 'destructive' });
    },
  });

  return {
    fornecedores,
    isLoading,
    error,
    createFornecedor,
    updateFornecedor,
    deleteFornecedor,
  };
}
