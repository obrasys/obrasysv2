import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { 
  Orcamento, 
  OrcamentoFormData, 
  Capitulo, 
  CapituloFormData,
  ArtigoOrcamento,
  ArtigoFormData,
  CustosIndiretos
} from '@/types/orcamentos';
import type { Json } from '@/integrations/supabase/types';

// Helper to parse custos_indiretos
const parseCustosIndiretos = (data: Json | null): CustosIndiretos => {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return {
      estaleiro: Number((data as Record<string, unknown>).estaleiro) || 0,
      seguros: Number((data as Record<string, unknown>).seguros) || 0,
      licenciamento: Number((data as Record<string, unknown>).licenciamento) || 0,
    };
  }
  return { estaleiro: 0, seguros: 0, licenciamento: 0 };
};

// Hook principal para orçamentos
export function useOrcamentos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Listar orçamentos
  const {
    data: orcamentos,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['orcamentos', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('orcamentos')
        .select(`
          *,
          obra:obras(id, nome, cliente)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        custos_indiretos: parseCustosIndiretos(item.custos_indiretos)
      })) as Orcamento[];
    },
    enabled: !!user?.id,
  });

  // Criar orçamento
  const createOrcamento = useMutation({
    mutationFn: async (formData: OrcamentoFormData) => {
      if (!user?.id) throw new Error('Utilizador não autenticado');

      const { data, error } = await supabase
        .from('orcamentos')
        .insert({
          user_id: user.id,
          titulo: formData.titulo,
          obra_id: formData.obra_id || null,
          margem_lucro: formData.margem_lucro,
          custos_indiretos: formData.custos_indiretos as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      toast({
        title: 'Sucesso',
        description: 'Orçamento criado com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Atualizar orçamento
  const updateOrcamento = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<OrcamentoFormData> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...formData };
      if (formData.custos_indiretos) {
        updateData.custos_indiretos = formData.custos_indiretos as unknown as Json;
      }
      
      const { data, error } = await supabase
        .from('orcamentos')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      toast({
        title: 'Sucesso',
        description: 'Orçamento atualizado com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Eliminar orçamento
  const deleteOrcamento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('orcamentos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      toast({
        title: 'Sucesso',
        description: 'Orçamento eliminado com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Alterar status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status, data_envio }: { id: string; status: string; data_envio?: string }) => {
      const updateData: Record<string, unknown> = { status };
      if (data_envio) updateData.data_envio = data_envio;

      const { data, error } = await supabase
        .from('orcamentos')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
    },
  });

  // Duplicar orçamento
  const duplicateOrcamento = useMutation({
    mutationFn: async (orcamentoId: string) => {
      if (!user?.id) throw new Error('Utilizador não autenticado');

      // Buscar orçamento original com capítulos e artigos
      const { data: original, error: fetchError } = await supabase
        .from('orcamentos')
        .select(`
          *,
          capitulos:capitulos_orcamento(
            *,
            artigos:artigos_orcamento(*)
          )
        `)
        .eq('id', orcamentoId)
        .single();

      if (fetchError) throw fetchError;

      // Criar novo orçamento
      const { data: novoOrcamento, error: createError } = await supabase
        .from('orcamentos')
        .insert({
          user_id: user.id,
          titulo: `${original.titulo} (cópia)`,
          obra_id: null,
          margem_lucro: original.margem_lucro,
          custos_indiretos: original.custos_indiretos as Json,
          status: 'rascunho',
        })
        .select()
        .single();

      if (createError) throw createError;

      // Duplicar capítulos e artigos
      const capitulos = original.capitulos || [];
      for (const cap of capitulos) {
        const { data: novoCapitulo, error: capError } = await supabase
          .from('capitulos_orcamento')
          .insert({
            orcamento_id: novoOrcamento.id,
            numero: cap.numero,
            titulo: cap.titulo,
            descricao: cap.descricao,
            ordem: cap.ordem,
          })
          .select()
          .single();

        if (capError) throw capError;

        const artigos = cap.artigos || [];
        if (artigos.length > 0) {
          const artigosInsert = artigos.map((art: ArtigoOrcamento) => ({
            capitulo_id: novoCapitulo.id,
            codigo: art.codigo,
            descricao: art.descricao,
            unidade: art.unidade,
            quantidade: art.quantidade,
            preco_unitario: art.preco_unitario,
            ordem: art.ordem,
          }));

          const { error: artError } = await supabase
            .from('artigos_orcamento')
            .insert(artigosInsert);

          if (artError) throw artError;
        }
      }

      return novoOrcamento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      toast({
        title: 'Sucesso',
        description: 'Orçamento duplicado com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    orcamentos,
    isLoading,
    error,
    refetch,
    createOrcamento,
    updateOrcamento,
    deleteOrcamento,
    updateStatus,
    duplicateOrcamento,
  };
}

// Hook para um orçamento específico
export function useOrcamento(id: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: orcamento,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['orcamento', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('orcamentos')
        .select(`
          *,
          obra:obras(id, nome, cliente),
          capitulos:capitulos_orcamento(
            *,
            artigos:artigos_orcamento(*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Ordenar capítulos e artigos
      const capitulos = (data.capitulos || [])
        .sort((a: Capitulo, b: Capitulo) => a.ordem - b.ordem)
        .map((cap: Capitulo & { artigos?: ArtigoOrcamento[] }) => ({
          ...cap,
          artigos: (cap.artigos || []).sort((a: ArtigoOrcamento, b: ArtigoOrcamento) => a.ordem - b.ordem),
        }));

      return {
        ...data,
        capitulos,
        custos_indiretos: parseCustosIndiretos(data.custos_indiretos),
      } as Orcamento;
    },
    enabled: !!id,
  });

  // Criar capítulo
  const createCapitulo = useMutation({
    mutationFn: async (formData: CapituloFormData) => {
      if (!id) throw new Error('ID do orçamento não definido');

      const { data, error } = await supabase
        .from('capitulos_orcamento')
        .insert({
          orcamento_id: id,
          numero: formData.numero,
          titulo: formData.titulo,
          descricao: formData.descricao || null,
          ordem: formData.numero,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamento', id] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Atualizar capítulo
  const updateCapitulo = useMutation({
    mutationFn: async ({ capituloId, ...formData }: Partial<CapituloFormData> & { capituloId: string }) => {
      const { data, error } = await supabase
        .from('capitulos_orcamento')
        .update(formData)
        .eq('id', capituloId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamento', id] });
    },
  });

  // Eliminar capítulo
  const deleteCapitulo = useMutation({
    mutationFn: async (capituloId: string) => {
      const { error } = await supabase
        .from('capitulos_orcamento')
        .delete()
        .eq('id', capituloId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamento', id] });
    },
  });

  // Criar artigo
  const createArtigo = useMutation({
    mutationFn: async ({ capituloId, ...formData }: ArtigoFormData & { capituloId: string }) => {
      // Obter próxima ordem
      const { data: existing } = await supabase
        .from('artigos_orcamento')
        .select('ordem')
        .eq('capitulo_id', capituloId)
        .order('ordem', { ascending: false })
        .limit(1);

      const nextOrdem = existing && existing.length > 0 ? existing[0].ordem + 1 : 1;

      const { data, error } = await supabase
        .from('artigos_orcamento')
        .insert({
          capitulo_id: capituloId,
          codigo: formData.codigo || null,
          descricao: formData.descricao,
          unidade: formData.unidade,
          quantidade: formData.quantidade,
          preco_unitario: formData.preco_unitario,
          ordem: nextOrdem,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamento', id] });
    },
  });

  // Atualizar artigo
  const updateArtigo = useMutation({
    mutationFn: async ({ artigoId, ...formData }: Partial<ArtigoFormData> & { artigoId: string }) => {
      const { data, error } = await supabase
        .from('artigos_orcamento')
        .update(formData)
        .eq('id', artigoId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamento', id] });
    },
  });

  // Eliminar artigo
  const deleteArtigo = useMutation({
    mutationFn: async (artigoId: string) => {
      const { error } = await supabase
        .from('artigos_orcamento')
        .delete()
        .eq('id', artigoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamento', id] });
    },
  });

  // Adicionar múltiplos artigos (do catálogo)
  const addArtigosFromCatalog = useMutation({
    mutationFn: async ({ capituloId, artigos }: { capituloId: string; artigos: ArtigoFormData[] }) => {
      // Obter próxima ordem
      const { data: existing } = await supabase
        .from('artigos_orcamento')
        .select('ordem')
        .eq('capitulo_id', capituloId)
        .order('ordem', { ascending: false })
        .limit(1);

      let nextOrdem = existing && existing.length > 0 ? existing[0].ordem + 1 : 1;

      const artigosInsert = artigos.map((art) => ({
        capitulo_id: capituloId,
        codigo: art.codigo || null,
        descricao: art.descricao,
        unidade: art.unidade,
        quantidade: art.quantidade,
        preco_unitario: art.preco_unitario,
        ordem: nextOrdem++,
      }));

      const { error } = await supabase
        .from('artigos_orcamento')
        .insert(artigosInsert);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamento', id] });
      toast({
        title: 'Sucesso',
        description: 'Artigos adicionados com sucesso',
      });
    },
  });

  return {
    orcamento,
    isLoading,
    error,
    refetch,
    createCapitulo,
    updateCapitulo,
    deleteCapitulo,
    createArtigo,
    updateArtigo,
    deleteArtigo,
    addArtigosFromCatalog,
  };
}

// Hook para catálogo de artigos
export function useCatalogo() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Artigos padrão do sistema
  const { data: defaultArticles, isLoading: loadingDefault } = useQuery({
    queryKey: ['default-articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('default_articles')
        .select('*')
        .order('categoria', { ascending: true })
        .order('codigo', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Artigos de trabalho do utilizador
  const { data: artigosTrabalho, isLoading: loadingTrabalho } = useQuery({
    queryKey: ['artigos-trabalho', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('artigos_trabalho')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('categoria', { ascending: true })
        .order('codigo', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Base de preços personalizada
  const { data: basePrecos, isLoading: loadingBase } = useQuery({
    queryKey: ['base-precos', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('base_precos_personalizada')
        .select('*')
        .eq('user_id', user.id)
        .order('categoria', { ascending: true })
        .order('codigo', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Criar artigo de trabalho
  const createArtigoTrabalho = useMutation({
    mutationFn: async (formData: Omit<ArtigoFormData, 'quantidade'> & { categoria: string }) => {
      if (!user?.id) throw new Error('Utilizador não autenticado');

      const { data, error } = await supabase
        .from('artigos_trabalho')
        .insert({
          user_id: user.id,
          codigo: formData.codigo || '',
          descricao: formData.descricao,
          unidade: formData.unidade,
          preco_unitario: formData.preco_unitario,
          categoria: formData.categoria,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artigos-trabalho'] });
      toast({
        title: 'Sucesso',
        description: 'Artigo adicionado ao catálogo',
      });
    },
  });

  // Pesquisar artigos
  const searchArticles = useCallback(
    async (query: string, categoria?: string) => {
      const allArticles = [
        ...(defaultArticles || []),
        ...(artigosTrabalho || []),
        ...(basePrecos || []),
      ];

      let filtered = allArticles;

      if (query) {
        const lowerQuery = query.toLowerCase();
        filtered = filtered.filter(
          (art) =>
            art.descricao.toLowerCase().includes(lowerQuery) ||
            art.codigo.toLowerCase().includes(lowerQuery)
        );
      }

      if (categoria) {
        filtered = filtered.filter((art) => art.categoria === categoria);
      }

      return filtered;
    },
    [defaultArticles, artigosTrabalho, basePrecos]
  );

  return {
    defaultArticles,
    artigosTrabalho,
    basePrecos,
    isLoading: loadingDefault || loadingTrabalho || loadingBase,
    createArtigoTrabalho,
    searchArticles,
  };
}

// Hook para obras
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
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const createObra = useMutation({
    mutationFn: async (formData: { nome: string; cliente?: string; endereco?: string }) => {
      if (!user?.id) throw new Error('Utilizador não autenticado');

      const { data, error } = await supabase
        .from('obras')
        .insert({
          user_id: user.id,
          nome: formData.nome,
          cliente: formData.cliente || null,
          endereco: formData.endereco || null,
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
  });

  return {
    obras,
    isLoading,
    createObra,
  };
}
