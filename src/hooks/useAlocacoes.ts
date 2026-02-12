import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { AlocacaoObra, AlocacaoObraFormData } from '@/types/alocacoes';

export function useAlocacoesByObra(obraId?: string) {
  const { user } = useAuth();
  const [alocacoes, setAlocacoes] = useState<AlocacaoObra[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlocacoes = async () => {
    if (!user || !obraId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('alocacoes_obra')
      .select(`*, membro:equipa_membros(id, nome, cargo)`)
      .eq('obra_id', obraId)
      .order('data_inicio', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar alocações');
      console.error(error);
    } else {
      setAlocacoes(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAlocacoes(); }, [user, obraId]);

  return { alocacoes, loading, refetch: fetchAlocacoes };
}

export function useAlocacoesByMembro(membroId?: string) {
  const { user } = useAuth();
  const [alocacoes, setAlocacoes] = useState<AlocacaoObra[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlocacoes = async () => {
    if (!user || !membroId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('alocacoes_obra')
      .select(`*, obra:obras(id, nome)`)
      .eq('membro_id', membroId)
      .order('data_inicio', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar histórico de alocações');
      console.error(error);
    } else {
      setAlocacoes(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAlocacoes(); }, [user, membroId]);

  return { alocacoes, loading, refetch: fetchAlocacoes };
}

export function useAlocacoes() {
  const { user } = useAuth();

  const createAlocacao = async (formData: AlocacaoObraFormData) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('alocacoes_obra')
      .insert({
        user_id: user.id,
        membro_id: formData.membro_id,
        obra_id: formData.obra_id,
        data_inicio: formData.data_inicio,
        data_fim: formData.data_fim || null,
        funcao: formData.funcao || null,
        custo_hora: formData.custo_hora || null,
        custo_dia: formData.custo_dia || null,
        ativo: formData.ativo ?? true,
        observacoes: formData.observacoes || null,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar alocação');
      console.error(error);
      return null;
    }

    // Atualizar obra_atual_id do membro
    await supabase
      .from('equipa_membros')
      .update({ obra_atual_id: formData.obra_id })
      .eq('id', formData.membro_id);

    toast.success('Membro alocado à obra com sucesso');
    return data;
  };

  const updateAlocacao = async (id: string, formData: Partial<AlocacaoObraFormData>) => {
    const { error } = await supabase
      .from('alocacoes_obra')
      .update({
        ...(formData.data_inicio && { data_inicio: formData.data_inicio }),
        ...(formData.data_fim !== undefined && { data_fim: formData.data_fim || null }),
        ...(formData.funcao !== undefined && { funcao: formData.funcao || null }),
        ...(formData.custo_hora !== undefined && { custo_hora: formData.custo_hora || null }),
        ...(formData.custo_dia !== undefined && { custo_dia: formData.custo_dia || null }),
        ...(formData.ativo !== undefined && { ativo: formData.ativo }),
        ...(formData.observacoes !== undefined && { observacoes: formData.observacoes || null }),
      })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar alocação');
      console.error(error);
      return false;
    }
    toast.success('Alocação atualizada');
    return true;
  };

  const deleteAlocacao = async (id: string) => {
    const { error } = await supabase.from('alocacoes_obra').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao eliminar alocação');
      console.error(error);
      return false;
    }
    toast.success('Alocação eliminada');
    return true;
  };

  const transferirMembro = async (membroId: string, novaObraId: string, funcao?: string, custoHora?: number, custoDia?: number) => {
    if (!user) return false;

    // Encerrar alocações ativas anteriores
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from('alocacoes_obra')
      .update({ ativo: false, data_fim: today })
      .eq('membro_id', membroId)
      .eq('ativo', true);

    // Criar nova alocação
    const result = await createAlocacao({
      membro_id: membroId,
      obra_id: novaObraId,
      data_inicio: today,
      funcao,
      custo_hora: custoHora,
      custo_dia: custoDia,
    });

    if (result) {
      toast.success('Membro transferido com sucesso');
    }
    return !!result;
  };

  return { createAlocacao, updateAlocacao, deleteAlocacao, transferirMembro };
}
