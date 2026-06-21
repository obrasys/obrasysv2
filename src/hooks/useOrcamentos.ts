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
        .is('budget_version_number', null)
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
    mutationFn: async (formData: OrcamentoFormData & { seed_canonical_chapters?: boolean }) => {
      if (!user?.id) throw new Error('Utilizador não autenticado');

      // Gerar código do orçamento
      const { data: codigoResult, error: codigoError } = await supabase
        .rpc('generate_orcamento_codigo', { p_user_id: user.id });

      if (codigoError) throw codigoError;

      const { seed_canonical_chapters, ...rest } = formData;

      const { data, error } = await supabase
        .from('orcamentos')
        .insert({
          user_id: user.id,
          titulo: rest.titulo,
          codigo: codigoResult,
          obra_id: rest.obra_id || null,
          cliente_id: rest.cliente_id || null,
          margem_lucro: rest.margem_lucro,
          custos_indiretos: rest.custos_indiretos as unknown as Json,
          project_metadata: (rest.project_metadata ?? {}) as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;

      // Aplicar matriz fixa de capítulos APENAS para Construção Nova.
      // Remodelação fica em branco para o utilizador escolher os capítulos.
      if (seed_canonical_chapters) {
        try {
          await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ error: unknown }>)(
            'aplicar_matriz_capitulos',
            { p_orcamento_id: data.id }
          );
        } catch (e) {
          console.warn('[matriz] falha ao aplicar matriz de capítulos:', e);
        }
      }

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
      if (formData.project_metadata) {
        updateData.project_metadata = formData.project_metadata as unknown as Json;
      }
      
      const { data, error } = await supabase
        .from('orcamentos')
        .update(updateData)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Orçamento não encontrado');
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

  // Alterar status (cria obra automaticamente se status = 'adjudicado')
  const updateStatus = useMutation({
    mutationFn: async ({ id, status, data_envio, valor_adjudicado }: { id: string; status: string; data_envio?: string; valor_adjudicado?: number }) => {
      if (!user?.id) throw new Error('Utilizador não autenticado');

      const updateData: Record<string, unknown> = { status };
      if (data_envio) updateData.data_envio = data_envio;
      if (valor_adjudicado != null) updateData.valor_adjudicado = valor_adjudicado;

      // Buscar orçamento para verificar se já tem obra
      const { data: orcamento, error: fetchError } = await supabase
        .from('orcamentos')
        .select('*, obra:obras(id)')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!orcamento) throw new Error('Orçamento não encontrado');

      // Se status é 'adjudicado' e não tem obra, criar automaticamente
      if (status === 'adjudicado' && !orcamento.obra_id) {
        // Criar nova obra com dados do orçamento
        const { data: novaObra, error: obraError } = await supabase
          .from('obras')
          .insert({
            user_id: user.id,
            nome: orcamento.titulo,
            status: 'planeamento',
            valor_previsto: orcamento.valor_total || 0,
          })
          .select()
          .single();

        if (obraError) throw obraError;

        // Linkar a obra ao orçamento
        updateData.obra_id = novaObra.id;
      }

      const { data, error } = await supabase
        .from('orcamentos')
        .update(updateData)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Orçamento não encontrado');

      // If adjudicado, trigger client portal access creation
      if (status === 'adjudicado') {
        try {
          const { data: session } = await supabase.auth.getSession();
          await supabase.functions.invoke('create-client-portal-access', {
            body: { orcamento_id: id, obra_id: data.obra_id },
            headers: session?.session?.access_token
              ? { Authorization: `Bearer ${session.session.access_token}` }
              : undefined,
          });
        } catch (portalError) {
          console.error('Error creating client portal access:', portalError);
        }
      }

      return { ...data, obraCriada: status === 'adjudicado' && !orcamento.obra_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      if (data.obraCriada) {
        toast({
          title: 'Obra criada automaticamente',
          description: 'O orçamento foi adjudicado e uma nova obra foi criada. O cliente receberá acesso ao portal.',
        });
      }
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
            preco_base: art.preco_base || art.preco_unitario,
            margem_lucro_artigo: art.margem_lucro_artigo || 0,
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

  // Criar revisão de orçamento
  const createRevisao = useMutation({
    mutationFn: async (orcamentoId: string) => {
      if (!user?.id) throw new Error('Utilizador não autenticado');
      const { data, error } = await supabase.rpc('create_budget_revision', {
        p_orcamento_id: orcamentoId,
      });

      if (error) throw error;
      if (!data) throw new Error('Não foi possível criar a revisão');

      return {
        ...(data as Record<string, unknown>),
        custos_indiretos: parseCustosIndiretos((data as { custos_indiretos?: Json | null }).custos_indiretos ?? null),
      } as Orcamento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      queryClient.invalidateQueries({ queryKey: ['budget-versions'] });
      queryClient.invalidateQueries({ queryKey: ['closing-sheets'] });
      toast({
        title: 'Sucesso',
        description: 'Revisão criada com novo Budget Objetivo e Folha de Fecho',
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
    createRevisao,
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
          cliente:clientes(id, nome, email, telefone, telemovel, empresa, nif, endereco, codigo_postal, cidade),
          capitulos:capitulos_orcamento(
            *,
            artigos:artigos_orcamento(*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Buscar zonas e áreas (Essencial v2) para resolver nomes
      const [{ data: zonesData }, { data: areasData }] = await Promise.all([
        supabase.from('budget_zones').select('id, name').eq('orcamento_id', id),
        supabase.from('budget_areas').select('id, name').eq('orcamento_id', id),
      ]);
      const zoneMap = new Map<string, string>((zonesData || []).map((z: any) => [z.id, z.name]));
      const areaMap = new Map<string, string>((areasData || []).map((a: any) => [a.id, a.name]));

      // Ordenar capítulos e artigos
      const capitulos = (data.capitulos || [])
        .sort((a: Capitulo, b: Capitulo) => a.ordem - b.ordem)
        .map((cap: Capitulo & { artigos?: ArtigoOrcamento[] }) => ({
          ...cap,
          artigos: (cap.artigos || [])
            .sort((a: ArtigoOrcamento, b: ArtigoOrcamento) => a.ordem - b.ordem)
            .map((a: any) => ({
              ...a,
              zone_name: a.zone_id ? zoneMap.get(a.zone_id) ?? null : null,
              area_name: a.area_id ? areaMap.get(a.area_id) ?? null : null,
            })),
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
          preco_base: formData.preco_base || formData.preco_unitario,
          margem_lucro_artigo: formData.margem_lucro_artigo || 0,
          preco_unitario: formData.preco_unitario,
          ordem: nextOrdem,
          custo_mo: formData.custo_mo ?? 0,
          custo_mat: formData.custo_mat ?? 0,
          custo_sub: formData.custo_sub ?? 0,
          custo_srv: formData.custo_srv ?? 0,
          custo_alu: formData.custo_alu ?? 0,
          custo_div: formData.custo_div ?? 0,
        })
        .select()
        .single();


      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamento', id] });
    },
    onError: (error: any) => {
      toast({
        title: 'Não foi possível criar o artigo',
        description: error?.message || 'Erro desconhecido.',
        variant: 'destructive',
      });
    },
  });

  // Atualizar artigo
  const updateArtigo = useMutation({
    mutationFn: async ({ artigoId, ...formData }: Partial<ArtigoFormData> & { artigoId: string }) => {
      const updateData: Record<string, unknown> = { ...formData };
      
      // Se tem preco_base, calcular o preco_unitario com margem
      if (formData.preco_base !== undefined) {
        const margem = formData.margem_lucro_artigo || 0;
        updateData.preco_unitario = margem > 0 && margem < 100
          ? formData.preco_base / (1 - margem / 100)
          : formData.preco_base;
      }
      
      const { data, error } = await supabase
        .from('artigos_orcamento')
        .update(updateData)
        .eq('id', artigoId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamento', id] });
    },
    onError: (error: any) => {
      toast({
        title: 'Não foi possível atualizar o artigo',
        description: error?.message || 'Erro desconhecido.',
        variant: 'destructive',
      });
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
    onError: (error: any) => {
      toast({
        title: 'Não foi possível eliminar o artigo',
        description: error?.message || 'Erro desconhecido.',
        variant: 'destructive',
      });
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
    onError: (error: any) => {
      toast({
        title: 'Não foi possível adicionar os artigos',
        description: error?.message || 'Erro desconhecido ao adicionar artigos.',
        variant: 'destructive',
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
