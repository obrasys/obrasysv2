import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type {
  Subempreiteiro,
  SubempreiteiroFormData,
  Equipamento,
  EquipamentoFormData,
  EquipaMembro,
  EquipaMembroFormData,
  EstadoEquipamento,
  TipoContrato,
} from '@/types/recursos';

// ===================== SUBEMPREITEIROS =====================
export function useSubempreiteiros() {
  const { user } = useAuth();
  const [subempreiteiros, setSubempreiteiros] = useState<Subempreiteiro[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubempreiteiros = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('subempreiteiros')
      .select('*')
      .eq('user_id', user.id)
      .order('nome');

    if (error) {
      toast.error('Erro ao carregar subempreiteiros');
      console.error(error);
    } else {
      setSubempreiteiros(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubempreiteiros();
  }, [user]);

  const createSubempreiteiro = async (formData: SubempreiteiroFormData) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('subempreiteiros')
      .insert({
        user_id: user.id,
        nome: formData.nome,
        nif: formData.nif || null,
        email: formData.email || null,
        telefone: formData.telefone || null,
        especialidade: formData.especialidade || null,
        endereco: formData.endereco || null,
        ativo: formData.ativo ?? true,
        observacoes: formData.observacoes || null,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar subempreiteiro');
      console.error(error);
      return null;
    }
    toast.success('Subempreiteiro criado com sucesso');
    fetchSubempreiteiros();
    return data;
  };

  const updateSubempreiteiro = async (id: string, formData: SubempreiteiroFormData) => {
    const { error } = await supabase
      .from('subempreiteiros')
      .update({
        nome: formData.nome,
        nif: formData.nif || null,
        email: formData.email || null,
        telefone: formData.telefone || null,
        especialidade: formData.especialidade || null,
        endereco: formData.endereco || null,
        ativo: formData.ativo ?? true,
        observacoes: formData.observacoes || null,
      })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar subempreiteiro');
      console.error(error);
      return false;
    }
    toast.success('Subempreiteiro atualizado');
    fetchSubempreiteiros();
    return true;
  };

  const deleteSubempreiteiro = async (id: string) => {
    const { error } = await supabase.from('subempreiteiros').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao eliminar subempreiteiro');
      console.error(error);
      return false;
    }
    toast.success('Subempreiteiro eliminado');
    fetchSubempreiteiros();
    return true;
  };

  return {
    subempreiteiros,
    loading,
    createSubempreiteiro,
    updateSubempreiteiro,
    deleteSubempreiteiro,
    refetch: fetchSubempreiteiros,
  };
}

// ===================== EQUIPAMENTOS =====================
export function useEquipamentos() {
  const { user } = useAuth();
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEquipamentos = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('equipamentos')
      .select(`
        *,
        obra:obras(nome)
      `)
      .eq('user_id', user.id)
      .order('nome');

    if (error) {
      toast.error('Erro ao carregar equipamentos');
      console.error(error);
    } else {
      setEquipamentos((data || []).map(item => ({
        ...item,
        estado: item.estado as EstadoEquipamento,
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEquipamentos();
  }, [user]);

  const createEquipamento = async (formData: EquipamentoFormData) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('equipamentos')
      .insert({
        user_id: user.id,
        nome: formData.nome,
        codigo: formData.codigo || null,
        categoria: formData.categoria || null,
        marca: formData.marca || null,
        modelo: formData.modelo || null,
        numero_serie: formData.numero_serie || null,
        data_aquisicao: formData.data_aquisicao || null,
        valor_aquisicao: formData.valor_aquisicao || null,
        estado: formData.estado || 'disponivel',
        localizacao: formData.localizacao || null,
        obra_id: formData.obra_id || null,
        observacoes: formData.observacoes || null,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar equipamento');
      console.error(error);
      return null;
    }
    toast.success('Equipamento criado com sucesso');
    fetchEquipamentos();
    return data;
  };

  const updateEquipamento = async (id: string, formData: EquipamentoFormData) => {
    const { error } = await supabase
      .from('equipamentos')
      .update({
        nome: formData.nome,
        codigo: formData.codigo || null,
        categoria: formData.categoria || null,
        marca: formData.marca || null,
        modelo: formData.modelo || null,
        numero_serie: formData.numero_serie || null,
        data_aquisicao: formData.data_aquisicao || null,
        valor_aquisicao: formData.valor_aquisicao || null,
        estado: formData.estado || 'disponivel',
        localizacao: formData.localizacao || null,
        obra_id: formData.obra_id || null,
        observacoes: formData.observacoes || null,
      })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar equipamento');
      console.error(error);
      return false;
    }
    toast.success('Equipamento atualizado');
    fetchEquipamentos();
    return true;
  };

  const deleteEquipamento = async (id: string) => {
    const { error } = await supabase.from('equipamentos').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao eliminar equipamento');
      console.error(error);
      return false;
    }
    toast.success('Equipamento eliminado');
    fetchEquipamentos();
    return true;
  };

  return {
    equipamentos,
    loading,
    createEquipamento,
    updateEquipamento,
    deleteEquipamento,
    refetch: fetchEquipamentos,
  };
}

// ===================== EQUIPA =====================
export function useEquipaMembros() {
  const { user } = useAuth();
  const [membros, setMembros] = useState<EquipaMembro[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembros = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('equipa_membros')
      .select(`
        *,
        subempreiteiro:subempreiteiros(nome),
        obra_atual:obras!equipa_membros_obra_atual_id_fkey(nome)
      `)
      .eq('user_id', user.id)
      .order('nome');

    if (error) {
      toast.error('Erro ao carregar membros da equipa');
      console.error(error);
    } else {
      setMembros((data || []).map(item => ({
        ...item,
        tipo_contrato: item.tipo_contrato as TipoContrato | null,
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMembros();
  }, [user]);

  const createMembro = async (formData: EquipaMembroFormData) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('equipa_membros')
      .insert({
        user_id: user.id,
        nome: formData.nome,
        cargo: formData.cargo || null,
        email: formData.email || null,
        telefone: formData.telefone || null,
        nif: formData.nif || null,
        data_admissao: formData.data_admissao || null,
        salario_base: formData.salario_base || null,
        tipo_contrato: formData.tipo_contrato || null,
        subempreiteiro_id: formData.subempreiteiro_id || null,
        ativo: formData.ativo ?? true,
        observacoes: formData.observacoes || null,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar membro');
      console.error(error);
      return null;
    }
    toast.success('Membro criado com sucesso');
    fetchMembros();
    return data;
  };

  const updateMembro = async (id: string, formData: EquipaMembroFormData) => {
    const { error } = await supabase
      .from('equipa_membros')
      .update({
        nome: formData.nome,
        cargo: formData.cargo || null,
        email: formData.email || null,
        telefone: formData.telefone || null,
        nif: formData.nif || null,
        data_admissao: formData.data_admissao || null,
        salario_base: formData.salario_base || null,
        tipo_contrato: formData.tipo_contrato || null,
        subempreiteiro_id: formData.subempreiteiro_id || null,
        ativo: formData.ativo ?? true,
        observacoes: formData.observacoes || null,
      })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar membro');
      console.error(error);
      return false;
    }
    toast.success('Membro atualizado');
    fetchMembros();
    return true;
  };

  const deleteMembro = async (id: string) => {
    const { error } = await supabase.from('equipa_membros').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao eliminar membro');
      console.error(error);
      return false;
    }
    toast.success('Membro eliminado');
    fetchMembros();
    return true;
  };

  return {
    membros,
    loading,
    createMembro,
    updateMembro,
    deleteMembro,
    refetch: fetchMembros,
  };
}
