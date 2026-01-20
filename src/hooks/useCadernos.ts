import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type {
  CadernoEncargos,
  CadernoSecao,
  CadernoItem,
  CadernoItemMatch,
  CadernoFormData,
  CadernoEstatisticas,
  PerfilPreco,
} from "@/types/cadernos";

// Hook para listar cadernos de uma obra
export function useCadernos(obraId?: string) {
  const { user } = useAuth();

  const { data: cadernos, isLoading, error, refetch } = useQuery({
    queryKey: ["cadernos", obraId],
    queryFn: async () => {
      if (!obraId) return [];
      
      const { data, error } = await supabase
        .from("cadernos_encargos")
        .select(`
          *,
          obra:obras(id, nome, cliente)
        `)
        .eq("obra_id", obraId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CadernoEncargos[];
    },
    enabled: !!user && !!obraId,
  });

  return { cadernos, isLoading, error, refetch };
}

// Hook para um caderno específico com todas as suas relações
export function useCaderno(cadernoId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: caderno, isLoading, error, refetch } = useQuery({
    queryKey: ["caderno", cadernoId],
    queryFn: async () => {
      if (!cadernoId) return null;

      const { data, error } = await supabase
        .from("cadernos_encargos")
        .select(`
          *,
          obra:obras(id, nome, cliente)
        `)
        .eq("id", cadernoId)
        .single();

      if (error) throw error;
      return data as CadernoEncargos;
    },
    enabled: !!user && !!cadernoId,
  });

  // Buscar secções do caderno
  const { data: secoes } = useQuery({
    queryKey: ["caderno_secoes", cadernoId],
    queryFn: async () => {
      if (!cadernoId) return [];

      const { data, error } = await supabase
        .from("caderno_secoes")
        .select("*")
        .eq("caderno_id", cadernoId)
        .order("ordem");

      if (error) throw error;
      return data as CadernoSecao[];
    },
    enabled: !!cadernoId,
  });

  // Buscar itens com matches
  const { data: itens } = useQuery({
    queryKey: ["caderno_itens", cadernoId],
    queryFn: async () => {
      if (!cadernoId || !secoes?.length) return [];

      const secaoIds = secoes.map(s => s.id);
      
      const { data, error } = await supabase
        .from("caderno_itens")
        .select(`
          *,
          match:caderno_item_match(
            *,
            material:materials(id, nome, codigo, unidade_base),
            artigo_base:default_articles(id, codigo, descricao, unidade, preco_unitario)
          )
        `)
        .in("secao_id", secaoIds)
        .order("ordem");

      if (error) throw error;
      
      // Transformar match de array para objeto único
      return data.map(item => ({
        ...item,
        match: item.match?.[0] || null,
      })) as CadernoItem[];
    },
    enabled: !!secoes?.length,
  });

  // Calcular estatísticas
  const estatisticas: CadernoEstatisticas | null = itens ? {
    total_itens: itens.length,
    itens_validados: itens.filter(i => i.status === "validado").length,
    itens_pendentes: itens.filter(i => i.status === "pendente").length,
    itens_ignorados: itens.filter(i => i.status === "ignorado").length,
    percentagem_validados: itens.length > 0 
      ? Math.round((itens.filter(i => i.status === "validado").length / itens.length) * 100) 
      : 0,
    valor_estimado: itens.reduce((sum, i) => sum + (i.match?.preco_estimado || 0), 0),
    confianca_media: itens.length > 0
      ? Math.round(itens.reduce((sum, i) => sum + (i.match?.nivel_confianca || 0), 0) / itens.length)
      : 0,
    match_alto: itens.filter(i => (i.match?.nivel_confianca || 0) >= 80).length,
    match_medio: itens.filter(i => (i.match?.nivel_confianca || 0) >= 50 && (i.match?.nivel_confianca || 0) < 80).length,
    match_baixo: itens.filter(i => (i.match?.nivel_confianca || 0) < 50).length,
  } : null;

  // Mutation para criar caderno
  const createCaderno = useMutation({
    mutationFn: async (data: CadernoFormData & { obra_id: string; ficheiro_url?: string; ficheiro_nome?: string; ficheiro_tipo?: string }) => {
      if (!user) throw new Error("Utilizador não autenticado");

      const { data: caderno, error } = await supabase
        .from("cadernos_encargos")
        .insert({
          user_id: user.id,
          obra_id: data.obra_id,
          nome: data.nome,
          origem: data.origem,
          ficheiro_url: data.ficheiro_url || null,
          ficheiro_nome: data.ficheiro_nome || null,
          ficheiro_tipo: data.ficheiro_tipo || null,
          status: "importado",
        })
        .select()
        .single();

      if (error) throw error;
      return caderno;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadernos"] });
      toast.success("Caderno criado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar caderno:", error);
      toast.error("Erro ao criar caderno");
    },
  });

  // Mutation para analisar caderno com IA
  const analisarCaderno = useMutation({
    mutationFn: async ({ cadernoId, conteudoTexto }: { cadernoId: string; conteudoTexto: string }) => {
      const { data, error } = await supabase.functions.invoke("analyze-caderno", {
        body: {
          caderno_id: cadernoId,
          conteudo_texto: conteudoTexto,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caderno", cadernoId] });
      queryClient.invalidateQueries({ queryKey: ["caderno_secoes", cadernoId] });
      queryClient.invalidateQueries({ queryKey: ["caderno_itens", cadernoId] });
      toast.success("Análise concluída!");
    },
    onError: (error: any) => {
      console.error("Erro na análise:", error);
      if (error.message?.includes("429")) {
        toast.error("Limite de pedidos excedido. Tente novamente mais tarde.");
      } else if (error.message?.includes("402")) {
        toast.error("Créditos insuficientes.");
      } else {
        toast.error("Erro na análise do caderno");
      }
    },
  });

  // Mutation para fazer matching com base de preços
  const matchPrecos = useMutation({
    mutationFn: async ({ cadernoId, regionId }: { cadernoId: string; regionId?: string }) => {
      const { data, error } = await supabase.functions.invoke("match-caderno-precos", {
        body: {
          caderno_id: cadernoId,
          region_id: regionId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caderno_itens", cadernoId] });
      toast.success("Matching concluído!");
    },
    onError: (error) => {
      console.error("Erro no matching:", error);
      toast.error("Erro no matching de preços");
    },
  });

  // Mutation para validar item (com registo no histórico para aprendizagem)
  const validarItem = useMutation({
    mutationFn: async ({ itemId, validado, matchData, foiCorrecao }: { 
      itemId: string; 
      validado: boolean; 
      matchData?: Partial<CadernoItemMatch>;
      foiCorrecao?: boolean;
    }) => {
      if (!user) throw new Error("Utilizador não autenticado");

      // Buscar dados do item para o histórico
      const { data: itemData } = await supabase
        .from("caderno_itens")
        .select(`
          descricao_original,
          unidade_detectada,
          classificacao,
          match:caderno_item_match(nivel_confianca, material_id, artigo_base_id, unidade_sugerida, metodo_construtivo)
        `)
        .eq("id", itemId)
        .single();

      // Atualizar status do item
      const novoStatus = validado ? "validado" : "pendente";
      await supabase
        .from("caderno_itens")
        .update({ status: novoStatus })
        .eq("id", itemId);

      // Atualizar match se existir dados
      if (matchData) {
        await supabase
          .from("caderno_item_match")
          .update({
            ...matchData,
            validado,
            validado_por: user.id,
            validado_em: new Date().toISOString(),
          })
          .eq("caderno_item_id", itemId);
      }

      // Registar no histórico para aprendizagem (apenas se validado)
      if (validado && itemData) {
        const matchOriginal = Array.isArray(itemData.match) ? itemData.match[0] : itemData.match;
        const classificacao = itemData.classificacao as Record<string, string> || {};
        
        // Normalizar descrição para busca futura
        const { data: normalizado } = await supabase.rpc("normalizar_descricao", {
          texto: itemData.descricao_original,
        });

        // Verificar se já existe entrada semelhante
        const { data: existente } = await supabase
          .from("caderno_validacao_historico")
          .select("id, vezes_usado")
          .eq("user_id", user.id)
          .eq("descricao_normalizada", normalizado || itemData.descricao_original.toLowerCase())
          .maybeSingle();

        if (existente) {
          // Incrementar contador de uso
          await supabase
            .from("caderno_validacao_historico")
            .update({ 
              vezes_usado: existente.vezes_usado + 1,
              material_id: matchData?.material_id || matchOriginal?.material_id,
              artigo_id: matchData?.artigo_base_id || matchOriginal?.artigo_base_id,
              unidade_correta: matchData?.unidade_sugerida || matchOriginal?.unidade_sugerida,
              metodo_construtivo: matchData?.metodo_construtivo || matchOriginal?.metodo_construtivo,
              foi_correcao: foiCorrecao || false,
            })
            .eq("id", existente.id);
        } else {
          // Criar nova entrada
          await supabase
            .from("caderno_validacao_historico")
            .insert({
              user_id: user.id,
              descricao_original: itemData.descricao_original,
              descricao_normalizada: normalizado || itemData.descricao_original.toLowerCase(),
              material_id: matchData?.material_id || matchOriginal?.material_id,
              artigo_id: matchData?.artigo_base_id || matchOriginal?.artigo_base_id,
              unidade_original: itemData.unidade_detectada,
              unidade_correta: matchData?.unidade_sugerida || matchOriginal?.unidade_sugerida,
              metodo_construtivo: matchData?.metodo_construtivo || matchOriginal?.metodo_construtivo || classificacao.metodo_construtivo,
              tipo_trabalho: classificacao.tipo_trabalho,
              foi_correcao: foiCorrecao || false,
              confianca_original: matchOriginal?.nivel_confianca || 0,
            });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caderno_itens", cadernoId] });
    },
    onError: (error) => {
      console.error("Erro ao validar item:", error);
      toast.error("Erro ao validar item");
    },
  });

  // Mutation para ignorar item
  const ignorarItem = useMutation({
    mutationFn: async (itemId: string) => {
      await supabase
        .from("caderno_itens")
        .update({ status: "ignorado" })
        .eq("id", itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caderno_itens", cadernoId] });
    },
  });

  // Mutation para validar todos os itens de uma secção
  const validarSecao = useMutation({
    mutationFn: async (secaoId: string) => {
      if (!user) throw new Error("Utilizador não autenticado");

      // Buscar itens pendentes da secção
      const { data: itensPendentes } = await supabase
        .from("caderno_itens")
        .select("id")
        .eq("secao_id", secaoId)
        .eq("status", "pendente");

      if (!itensPendentes?.length) return;

      // Atualizar status dos itens
      await supabase
        .from("caderno_itens")
        .update({ status: "validado" })
        .eq("secao_id", secaoId)
        .eq("status", "pendente");

      // Atualizar matches
      const itemIds = itensPendentes.map(i => i.id);
      await supabase
        .from("caderno_item_match")
        .update({
          validado: true,
          validado_por: user.id,
          validado_em: new Date().toISOString(),
        })
        .in("caderno_item_id", itemIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caderno_itens", cadernoId] });
      toast.success("Secção validada!");
    },
    onError: (error) => {
      console.error("Erro ao validar secção:", error);
      toast.error("Erro ao validar secção");
    },
  });

  // Mutation para atualizar perfil de preço
  const updatePerfilPreco = useMutation({
    mutationFn: async (perfilPreco: PerfilPreco) => {
      if (!cadernoId) throw new Error("Caderno não encontrado");

      await supabase
        .from("cadernos_encargos")
        .update({ perfil_preco: perfilPreco })
        .eq("id", cadernoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caderno", cadernoId] });
    },
  });

  // Mutation para atualizar status do caderno
  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      if (!cadernoId) throw new Error("Caderno não encontrado");

      await supabase
        .from("cadernos_encargos")
        .update({ status })
        .eq("id", cadernoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caderno", cadernoId] });
    },
  });

  // Mutation para deletar caderno
  const deleteCaderno = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cadernos_encargos")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadernos"] });
      toast.success("Caderno eliminado!");
    },
    onError: (error) => {
      console.error("Erro ao eliminar caderno:", error);
      toast.error("Erro ao eliminar caderno");
    },
  });

  return {
    caderno,
    secoes,
    itens,
    estatisticas,
    isLoading,
    error,
    refetch,
    createCaderno,
    analisarCaderno,
    matchPrecos,
    validarItem,
    ignorarItem,
    validarSecao,
    updatePerfilPreco,
    updateStatus,
    deleteCaderno,
  };
}

// Hook para upload de ficheiro
export function useCadernoUpload() {
  const { user } = useAuth();

  const uploadFicheiro = async (file: File): Promise<{ url: string; path: string }> => {
    if (!user) throw new Error("Utilizador não autenticado");

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("cadernos-encargos")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Return the file path - signed URLs will be generated on demand when needed
    return { url: filePath, path: filePath };
  };

  return { uploadFicheiro };
}
