import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SecaoAnalise {
  codigo: string;
  nome: string;
  nivel: number;
  parent_codigo?: string;
  itens: ItemAnalise[];
}

interface ItemAnalise {
  descricao: string;
  unidade: string | null;
  quantidade: number | null;
  texto_original: string;
  classificacao: {
    tipo_trabalho?: string;
    metodo_construtivo?: string;
    material_principal?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { caderno_id, ficheiro_url, ficheiro_tipo, conteudo_texto } = await req.json();

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

    const userId = claimsData.claims.sub;
    console.log("Authenticated user:", userId);

    // Verify user owns the caderno (RLS will enforce this)
    const { data: cadernoCheck, error: cadernoCheckError } = await supabaseClient
      .from("cadernos_encargos")
      .select("id, user_id")
      .eq("id", caderno_id)
      .single();

    if (cadernoCheckError || !cadernoCheck) {
      console.error("Caderno not found or access denied:", cadernoCheckError);
      return new Response(
        JSON.stringify({ error: "Caderno não encontrado ou acesso negado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Atualizar status para "a_analisar"
    await supabaseClient
      .from("cadernos_encargos")
      .update({ status: "a_analisar" })
      .eq("id", caderno_id);

    // Determinar o texto a analisar
    let textoParaAnalise = conteudo_texto;

    // Se for BC3/XML, fazer parsing direto
    if (ficheiro_tipo === "application/xml" || ficheiro_tipo === "text/xml") {
      // BC3 é estruturado - podemos fazer parsing direto
      const resultadoBC3 = await parseBC3(textoParaAnalise);
      if (resultadoBC3) {
        await salvarResultado(supabaseClient, caderno_id, resultadoBC3);
        return new Response(
          JSON.stringify({ success: true, resultado: resultadoBC3 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Para outros formatos, usar IA
    const systemPrompt = `És um especialista em cadernos de encargos de construção civil para Portugal e Espanha.

A tua tarefa é analisar o texto de um caderno de encargos e extrair informação estruturada.

REGRAS IMPORTANTES:
1. NUNCA inventes quantidades - se não encontrares, deixa null
2. Identifica secções/capítulos hierárquicos
3. Para cada item de trabalho, extrai:
   - Descrição completa
   - Unidade (m2, m3, un, ml, kg, vg, etc.)
   - Quantidade (apenas se explicitamente indicada)
   - Texto original
4. Classifica cada item por:
   - Tipo de trabalho (demolição, estrutura, alvenaria, revestimento, etc.)
   - Método construtivo (manual, mecânico, pré-fabricado, etc.)
   - Material principal

Responde APENAS com a chamada da função extract_caderno_structure.`;

    const userPrompt = `Analisa o seguinte caderno de encargos e extrai a estrutura completa:

${textoParaAnalise?.substring(0, 50000) || "Texto não disponível"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_caderno_structure",
              description: "Extrair estrutura completa do caderno de encargos",
              parameters: {
                type: "object",
                properties: {
                  secoes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        codigo: { type: "string", description: "Código da secção (ex: 1, 1.1, 2)" },
                        nome: { type: "string", description: "Nome da secção" },
                        nivel: { type: "integer", description: "Nível hierárquico (1, 2, 3...)" },
                        parent_codigo: { type: "string", description: "Código da secção pai" },
                        itens: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              descricao: { type: "string" },
                              unidade: { type: "string", nullable: true },
                              quantidade: { type: "number", nullable: true },
                              texto_original: { type: "string" },
                              classificacao: {
                                type: "object",
                                properties: {
                                  tipo_trabalho: { type: "string" },
                                  metodo_construtivo: { type: "string" },
                                  material_principal: { type: "string" },
                                },
                              },
                            },
                            required: ["descricao", "texto_original"],
                          },
                        },
                      },
                      required: ["codigo", "nome", "nivel", "itens"],
                    },
                  },
                },
                required: ["secoes"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_caderno_structure" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de pedidos excedido. Tente novamente mais tarde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    
    // Extrair resultado do tool call
    let resultado: { secoes: SecaoAnalise[] };
    
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      resultado = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: tentar extrair do content
      const content = aiResponse.choices?.[0]?.message?.content;
      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          resultado = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Não foi possível extrair estrutura da resposta da IA");
        }
      } else {
        throw new Error("Resposta da IA vazia");
      }
    }

    // Salvar resultado na base de dados (using authenticated client)
    await salvarResultado(supabaseClient, caderno_id, resultado);

    return new Response(
      JSON.stringify({ success: true, resultado }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro na análise do caderno:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Parser básico para BC3
async function parseBC3(xmlContent: string): Promise<{ secoes: SecaoAnalise[] } | null> {
  try {
    // BC3 usa tags específicas como ~C (capítulos), ~D (decomposições), ~M (medições)
    // Este é um parser simplificado - um parser completo seria mais complexo
    
    const secoes: SecaoAnalise[] = [];
    const lines = xmlContent.split("\n");
    
    let currentSecao: SecaoAnalise | null = null;
    let ordem = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Capítulo (~C)
      if (trimmed.startsWith("~C|")) {
        const parts = trimmed.split("|");
        if (parts.length >= 3) {
          if (currentSecao) {
            secoes.push(currentSecao);
          }
          currentSecao = {
            codigo: parts[1] || String(secoes.length + 1),
            nome: parts[2] || "Sem nome",
            nivel: 1,
            itens: [],
          };
          ordem = 0;
        }
      }
      
      // Descrição (~D)
      if (trimmed.startsWith("~D|") && currentSecao) {
        const parts = trimmed.split("|");
        if (parts.length >= 4) {
          const item: ItemAnalise = {
            descricao: parts[2] || "",
            unidade: parts[3] || null,
            quantidade: parts[4] ? parseFloat(parts[4]) : null,
            texto_original: trimmed,
            classificacao: {},
          };
          currentSecao.itens.push(item);
        }
      }
    }
    
    if (currentSecao) {
      secoes.push(currentSecao);
    }
    
    if (secoes.length === 0) {
      return null;
    }
    
    return { secoes };
  } catch {
    return null;
  }
}

async function salvarResultado(
  supabase: any,
  cadernoId: string,
  resultado: { secoes: SecaoAnalise[] }
) {
  let totalItens = 0;
  const secaoIdMap: Record<string, string> = {};

  // Criar secções
  for (let i = 0; i < resultado.secoes.length; i++) {
    const secao = resultado.secoes[i];
    
    const parentId = secao.parent_codigo ? secaoIdMap[secao.parent_codigo] : null;
    
    const { data: secaoData, error: secaoError } = await supabase
      .from("caderno_secoes")
      .insert({
        caderno_id: cadernoId,
        parent_id: parentId,
        codigo: secao.codigo,
        nome: secao.nome,
        nivel: secao.nivel,
        ordem: i,
      })
      .select("id")
      .single();

    if (secaoError) {
      console.error("Erro ao criar secção:", secaoError);
      continue;
    }

    secaoIdMap[secao.codigo] = secaoData.id;

    // Criar itens da secção
    for (let j = 0; j < secao.itens.length; j++) {
      const item = secao.itens[j];
      
      const { error: itemError } = await supabase
        .from("caderno_itens")
        .insert({
          secao_id: secaoData.id,
          descricao_original: item.descricao,
          unidade_detectada: item.unidade,
          quantidade_detectada: item.quantidade,
          texto_original: item.texto_original,
          ordem: j,
          status: "pendente",
          classificacao: item.classificacao || {},
        });

      if (itemError) {
        console.error("Erro ao criar item:", itemError);
      } else {
        totalItens++;
      }
    }
  }

  // Atualizar caderno com totais e status
  await supabase
    .from("cadernos_encargos")
    .update({
      status: "analisado",
      total_itens: totalItens,
    })
    .eq("id", cadernoId);
}
