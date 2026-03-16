import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { caderno_id, region_id } = await req.json();

    if (!caderno_id) {
      return new Response(
        JSON.stringify({ error: "caderno_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create Supabase client with user's auth token to respect RLS
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate JWT token using getClaims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Token validation error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Token inválido ou expirado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;
    console.log("Authenticated user:", userId);

    // Verify user owns the caderno (RLS will enforce this)
    const { data: cadernoData, error: cadernoError } = await supabaseClient
      .from("cadernos_encargos")
      .select("id, user_id")
      .eq("id", caderno_id)
      .single();

    if (cadernoError || !cadernoData) {
      console.error("Caderno not found or access denied:", cadernoError);
      return new Response(
        JSON.stringify({ error: "Caderno não encontrado ou acesso negado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar todos os itens do caderno (RLS applies through caderno ownership)
    const { data: itens, error: itensError } = await supabaseClient
      .from("caderno_itens")
      .select(`
        id,
        descricao_original,
        unidade_detectada,
        classificacao,
        secao:caderno_secoes!inner(
          caderno_id
        )
      `)
      .eq("secao.caderno_id", caderno_id)
      .eq("status", "pendente");

    if (itensError) {
      throw new Error(`Erro ao buscar itens: ${itensError.message}`);
    }

    if (!itens || itens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, matched: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar artigos default (public data - no RLS needed)
    const { data: artigos } = await supabaseClient
      .from("default_articles")
      .select("id, codigo, descricao, unidade, preco_unitario, categoria");

    // Buscar materiais (requires auth)
    const { data: materialsData } = await supabaseClient
      .from("materials")
      .select("id, codigo, nome, unidade_base, category:material_categories(nome)");

    // Buscar preços de referência se region_id fornecido
    let priceRefs: Record<string, { preco_p10: number; preco_p50: number; preco_p90: number }> = {};
    if (region_id) {
      const { data: prices } = await supabaseClient
        .from("material_price_reference")
        .select("material_id, preco_p10, preco_p50, preco_p90")
        .eq("region_id", region_id);

      if (prices) {
        priceRefs = prices.reduce((acc, p) => {
          acc[p.material_id] = { preco_p10: p.preco_p10, preco_p50: p.preco_p50, preco_p90: p.preco_p90 };
          return acc;
        }, {} as Record<string, { preco_p10: number; preco_p50: number; preco_p90: number }>);
      }
    }

    let matchedCount = 0;
    let valorEstimado = 0;
    let historicoMatchesCount = 0;

    // Processar cada item
    for (const item of itens) {
      const descricao = item.descricao_original.toLowerCase();
      const unidade = item.unidade_detectada?.toLowerCase();
      const classificacao = item.classificacao as Record<string, string> || {};

      let melhorMatch: {
        tipo: "artigo" | "material" | "historico";
        id: string;
        codigo: string;
        descricao: string;
        unidade: string;
        preco: number;
        confianca: number;
        metodoConstrutivo?: string;
      } | null = null;

      // PRIMEIRO: Tentar match pelo histórico de validações do utilizador (aprendizagem)
      const { data: historicoMatches } = await supabaseClient.rpc("buscar_historico_match", {
        p_user_id: userId,
        p_descricao: item.descricao_original,
        p_limite: 1,
      });

      if (historicoMatches && historicoMatches.length > 0) {
        const hist = historicoMatches[0];
        // Boost de confiança baseado em similaridade e vezes usado
        const confiancaHistorico = Math.min(100, Math.round(hist.similaridade * 100) + Math.min(20, hist.vezes_usado * 5));
        
        if (confiancaHistorico > 60) {
          if (hist.artigo_id && artigos) {
            const artigo = artigos.find(a => a.id === hist.artigo_id);
            if (artigo) {
              melhorMatch = {
                tipo: "historico",
                id: artigo.id,
                codigo: artigo.codigo,
                descricao: artigo.descricao,
                unidade: hist.unidade_correta || artigo.unidade,
                preco: artigo.preco_unitario,
                confianca: confiancaHistorico,
                metodoConstrutivo: hist.metodo_construtivo,
              };
            }
          } else if (hist.material_id && materialsData) {
            const material = materialsData.find(m => m.id === hist.material_id);
            if (material) {
              const preco = priceRefs[material.id]?.preco_p50 || 0;
              melhorMatch = {
                tipo: "historico",
                id: material.id,
                codigo: material.codigo,
                descricao: material.nome,
                unidade: hist.unidade_correta || material.unidade_base,
                preco,
                confianca: confiancaHistorico,
                metodoConstrutivo: hist.metodo_construtivo,
              };
            }
          }
        }
      }

      // SEGUNDO: Se não encontrou no histórico, tentar match com artigos default
      if (!melhorMatch && artigos) {
        for (const artigo of artigos) {
          const confianca = calcularConfianca(
            descricao,
            artigo.descricao.toLowerCase(),
            unidade,
            artigo.unidade?.toLowerCase(),
            classificacao.tipo_trabalho,
            artigo.categoria
          );

          if (confianca > 30 && (!melhorMatch || confianca > melhorMatch.confianca)) {
            melhorMatch = {
              tipo: "artigo",
              id: artigo.id,
              codigo: artigo.codigo,
              descricao: artigo.descricao,
              unidade: artigo.unidade,
              preco: artigo.preco_unitario,
              confianca,
            };
          }
        }
      }

      // TERCEIRO: Se não houver bom match com artigos, tentar materiais
      if ((!melhorMatch || melhorMatch.confianca < 60) && materialsData) {
        for (const material of materialsData) {
          const categoryName = Array.isArray(material.category) 
            ? material.category[0]?.nome 
            : (material.category as any)?.nome;
          
          const confianca = calcularConfianca(
            descricao,
            material.nome.toLowerCase(),
            unidade,
            material.unidade_base?.toLowerCase(),
            classificacao.material_principal,
            categoryName
          );

          if (confianca > 30 && (!melhorMatch || confianca > melhorMatch.confianca)) {
            const preco = priceRefs[material.id]?.preco_p50 || 0;
            melhorMatch = {
              tipo: "material",
              id: material.id,
              codigo: material.codigo,
              descricao: material.nome,
              unidade: material.unidade_base,
              preco,
              confianca,
            };
          }
        }
      }

      // Contar matches do histórico
      if (melhorMatch?.tipo === "historico") {
        historicoMatchesCount++;
      }

      // Se encontrou match, criar entrada (RLS applies)
      if (melhorMatch) {
        const { error: matchError } = await supabaseClient
          .from("caderno_item_match")
          .insert({
            caderno_item_id: item.id,
            material_id: melhorMatch.tipo === "material" || (melhorMatch.tipo === "historico" && !artigos?.find(a => a.id === melhorMatch!.id)) 
              ? melhorMatch.id : null,
            artigo_base_id: melhorMatch.tipo === "artigo" || (melhorMatch.tipo === "historico" && artigos?.find(a => a.id === melhorMatch!.id)) 
              ? melhorMatch.id : null,
            metodo_construtivo: melhorMatch.metodoConstrutivo || classificacao.metodo_construtivo || null,
            unidade_sugerida: melhorMatch.unidade,
            preco_estimado: melhorMatch.preco,
            nivel_confianca: Math.round(melhorMatch.confianca),
            validado: false,
          });

        if (!matchError) {
          matchedCount++;
          valorEstimado += melhorMatch.preco;
        }
      } else {
        // Criar match vazio para itens sem correspondência
        await supabaseClient
          .from("caderno_item_match")
          .insert({
            caderno_item_id: item.id,
            nivel_confianca: 0,
            validado: false,
          });
      }
    }

    // Atualizar valor estimado do caderno (RLS applies)
    await supabaseClient
      .from("cadernos_encargos")
      .update({ valor_estimado: valorEstimado })
      .eq("id", caderno_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        matched: matchedCount, 
        valor_estimado: valorEstimado,
        matches_historico: historicoMatchesCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro no matching:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Função para calcular confiança do match
function calcularConfianca(
  descItem: string,
  descBase: string,
  unidadeItem: string | null | undefined,
  unidadeBase: string | null | undefined,
  tipoItem: string | undefined,
  categoriaBase: string | null | undefined
): number {
  let score = 0;

  // Similaridade de texto (0-50 pontos)
  const palavrasItem = descItem.split(/\s+/).filter(p => p.length > 2);
  const palavrasBase = descBase.split(/\s+/).filter(p => p.length > 2);
  
  let matches = 0;
  for (const palavra of palavrasItem) {
    if (palavrasBase.some(p => p.includes(palavra) || palavra.includes(p))) {
      matches++;
    }
  }
  
  const similaridadeTexto = palavrasItem.length > 0 
    ? (matches / palavrasItem.length) * 50 
    : 0;
  score += similaridadeTexto;

  // Correspondência de unidade (0-25 pontos)
  if (unidadeItem && unidadeBase) {
    const unidadesEquivalentes: Record<string, string[]> = {
      m2: ["m²", "m2", "metro quadrado"],
      m3: ["m³", "m3", "metro cúbico"],
      ml: ["m", "ml", "metro linear", "metro"],
      un: ["un", "unidade", "unidades", "ud", "pç"],
      kg: ["kg", "quilograma", "quilogramas"],
      vg: ["vg", "verba global", "verba"],
    };

    const unidadeItemNorm = unidadeItem.toLowerCase();
    const unidadeBaseNorm = unidadeBase.toLowerCase();

    if (unidadeItemNorm === unidadeBaseNorm) {
      score += 25;
    } else {
      for (const grupo of Object.values(unidadesEquivalentes)) {
        if (grupo.includes(unidadeItemNorm) && grupo.includes(unidadeBaseNorm)) {
          score += 20;
          break;
        }
      }
    }
  }

  // Correspondência de categoria/tipo (0-25 pontos)
  if (tipoItem && categoriaBase) {
    const tipoNorm = tipoItem.toLowerCase();
    const categoriaNorm = categoriaBase.toLowerCase();

    if (categoriaNorm.includes(tipoNorm) || tipoNorm.includes(categoriaNorm)) {
      score += 25;
    } else {
      // Verificar palavras-chave relacionadas
      const keywords = tipoNorm.split(/\s+/);
      for (const kw of keywords) {
        if (categoriaNorm.includes(kw)) {
          score += 10;
          break;
        }
      }
    }
  }

  return Math.min(100, score);
}
