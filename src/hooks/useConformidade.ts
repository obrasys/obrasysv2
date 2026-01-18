import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type {
  Aprovacao,
  LivroObra,
  Documento,
  ChecklistConformidade,
  LivroObraFormData,
  DocumentoFormData,
  ChecklistFormData,
  ChecklistItem,
  AprovacaoStatus,
  LivroObraStatus,
} from '@/types/conformidade';

export function useConformidade() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all aprovacoes
  const { data: aprovacoes = [], isLoading: loadingAprovacoes } = useQuery({
    queryKey: ['aprovacoes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aprovacoes')
        .select(`
          *,
          solicitante:profiles!aprovacoes_solicitante_id_fkey(id, nome),
          aprovador:profiles!aprovacoes_aprovador_id_fkey(id, nome)
        `)
        .order('data_solicitacao', { ascending: false });

      if (error) throw error;
      return data as Aprovacao[];
    },
    enabled: !!user,
  });

  // Fetch all livros de obra
  const { data: livrosObra = [], isLoading: loadingLivrosObra } = useQuery({
    queryKey: ['livros_obra', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('livro_obra')
        .select(`
          *,
          obra:obras(id, nome, cliente),
          gestor:profiles!livro_obra_gestor_id_fkey(id, nome),
          fiscal:profiles!livro_obra_fiscal_id_fkey(id, nome)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LivroObra[];
    },
    enabled: !!user,
  });

  // Fetch all documentos
  const { data: documentos = [], isLoading: loadingDocumentos } = useQuery({
    queryKey: ['documentos', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documentos')
        .select(`
          *,
          obra:obras(id, nome),
          uploader:profiles!documentos_uploaded_by_fkey(id, nome)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Documento[];
    },
    enabled: !!user,
  });

  // Fetch all checklists
  const { data: checklists = [], isLoading: loadingChecklists } = useQuery({
    queryKey: ['checklists', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_conformidade')
        .select(`
          *,
          obra:obras(id, nome),
          responsavel:profiles!checklist_conformidade_responsavel_id_fkey(id, nome)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        itens: (item.itens as unknown as ChecklistItem[]) || [],
      })) as ChecklistConformidade[];
    },
    enabled: !!user,
  });

  // Create livro de obra
  const createLivroObra = useMutation({
    mutationFn: async (data: LivroObraFormData) => {
      const { error } = await supabase.from('livro_obra').insert({
        ...data,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livros_obra'] });
      toast.success('Livro de obra criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar livro de obra: ' + error.message);
    },
  });

  // Update livro de obra
  const updateLivroObra = useMutation({
    mutationFn: async ({ id, ...data }: LivroObraFormData & { id: string }) => {
      const { error } = await supabase
        .from('livro_obra')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livros_obra'] });
      toast.success('Livro de obra atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  // Submit livro de obra to fiscal
  const submitLivroObra = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('livro_obra')
        .update({
          status: 'submetido' as LivroObraStatus,
          data_submissao: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livros_obra'] });
      toast.success('Livro de obra submetido ao fiscal!');
    },
    onError: (error) => {
      toast.error('Erro ao submeter: ' + error.message);
    },
  });

  // Delete livro de obra
  const deleteLivroObra = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('livro_obra').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livros_obra'] });
      toast.success('Livro de obra eliminado!');
    },
    onError: (error) => {
      toast.error('Erro ao eliminar: ' + error.message);
    },
  });

  // Create documento
  const createDocumento = useMutation({
    mutationFn: async (data: DocumentoFormData) => {
      const { error } = await supabase.from('documentos').insert({
        ...data,
        user_id: user!.id,
        uploaded_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      toast.success('Documento adicionado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao adicionar documento: ' + error.message);
    },
  });

  // Update documento
  const updateDocumento = useMutation({
    mutationFn: async ({ id, ...data }: Partial<DocumentoFormData> & { id: string }) => {
      const { error } = await supabase
        .from('documentos')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      toast.success('Documento atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  // Delete documento
  const deleteDocumento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('documentos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      toast.success('Documento eliminado!');
    },
    onError: (error) => {
      toast.error('Erro ao eliminar: ' + error.message);
    },
  });

  // Create checklist
  const createChecklist = useMutation({
    mutationFn: async (data: ChecklistFormData) => {
      const { error } = await supabase.from('checklist_conformidade').insert({
        obra_id: data.obra_id,
        titulo: data.titulo,
        descricao: data.descricao,
        itens: data.itens as unknown as any,
        responsavel_id: data.responsavel_id,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      toast.success('Checklist criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar checklist: ' + error.message);
    },
  });

  // Update checklist
  const updateChecklist = useMutation({
    mutationFn: async ({ id, itens, ...rest }: Partial<ChecklistFormData> & { id: string; status?: string }) => {
      const updateData: Record<string, unknown> = { ...rest };
      if (itens) updateData.itens = itens as unknown as any;
      const { error } = await supabase
        .from('checklist_conformidade')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      toast.success('Checklist atualizada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  // Delete checklist
  const deleteChecklist = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('checklist_conformidade').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      toast.success('Checklist eliminada!');
    },
    onError: (error) => {
      toast.error('Erro ao eliminar: ' + error.message);
    },
  });

  // Create aprovacao
  const createAprovacao = useMutation({
    mutationFn: async (data: { tipo: string; referencia_id: string; comentarios?: string }) => {
      const { error } = await supabase.from('aprovacoes').insert({
        ...data,
        user_id: user!.id,
        solicitante_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aprovacoes'] });
      toast.success('Solicitação de aprovação criada!');
    },
    onError: (error) => {
      toast.error('Erro ao criar solicitação: ' + error.message);
    },
  });

  // Update aprovacao status
  const updateAprovacaoStatus = useMutation({
    mutationFn: async ({ id, status, comentarios }: { id: string; status: AprovacaoStatus; comentarios?: string }) => {
      const { error } = await supabase
        .from('aprovacoes')
        .update({
          status,
          comentarios,
          aprovador_id: user!.id,
          data_aprovacao: status !== 'pendente' ? new Date().toISOString() : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aprovacoes'] });
      toast.success('Status da aprovação atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });

  // Stats
  const stats = {
    totalAprovacoes: aprovacoes.length,
    aprovacoesPendentes: aprovacoes.filter(a => a.status === 'pendente').length,
    totalLivrosObra: livrosObra.length,
    livrosSubmetidos: livrosObra.filter(l => l.status === 'submetido').length,
    totalDocumentos: documentos.length,
    documentosAprovados: documentos.filter(d => d.aprovado).length,
    totalChecklists: checklists.length,
    checklistsConcluidas: checklists.filter(c => c.status === 'concluido').length,
  };

  return {
    // Data
    aprovacoes,
    livrosObra,
    documentos,
    checklists,
    stats,
    // Loading states
    loading: loadingAprovacoes || loadingLivrosObra || loadingDocumentos || loadingChecklists,
    // Livro de Obra mutations
    createLivroObra,
    updateLivroObra,
    submitLivroObra,
    deleteLivroObra,
    // Documento mutations
    createDocumento,
    updateDocumento,
    deleteDocumento,
    // Checklist mutations
    createChecklist,
    updateChecklist,
    deleteChecklist,
    // Aprovacao mutations
    createAprovacao,
    updateAprovacaoStatus,
  };
}
