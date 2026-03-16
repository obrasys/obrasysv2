import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

const MAX_CHARS_PER_CHUNK = 120000; // ~120K chars per chunk for Gemini's large context

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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

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

    let textoParaAnalise = conteudo_texto || "";

    // Se for BC3/XML, fazer parsing direto
    if (ficheiro_tipo === "application/xml" || ficheiro_tipo === "text/xml") {
      const resultadoBC3 = await parseBC3(textoParaAnalise);
      if (resultadoBC3) {
        await salvarResultado(supabaseClient, caderno_id, resultadoBC3);
        return new Response(
          JSON.stringify({ success: true, resultado: resultadoBC3 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if text is empty or too short
    if (!textoParaAnalise || textoParaAnalise.length < 20) {
      return new Response(
        JSON.stringify({ error: "Conteúdo do ficheiro vazio ou insuficiente para análise." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const textLength = textoParaAnalise.length;
    console.log(`Texto para análise: ${textLength} caracteres`);

    // If document fits in one chunk, analyze directly
    // If larger, split into chunks and merge results
    let allSecoes: SecaoAnalise[] = [];

    if (textLength <= MAX_CHARS_PER_CHUNK) {
      const resultado = await analyzeChunk(textoParaAnalise, LOVABLE_API_KEY, 1, 1);
      allSecoes = resultado.secoes;
    } else {
      // Split text into chunks by lines to avoid cutting mid-item
      const chunks = splitTextIntoChunks(textoParaAnalise, MAX_CHARS_PER_CHUNK);
      console.log(`Documento grande: dividido em ${chunks.length} partes`);

      for (let i = 0; i < chunks.length; i++) {
        console.log(`A analisar parte ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
        try {
          const resultado = await analyzeChunk(chunks[i], LOVABLE_API_KEY, i + 1, chunks.length);
          // Merge sections: if same section code exists, merge items
          for (const secao of resultado.secoes) {
            const existing = allSecoes.find(s => s.codigo === secao.codigo && s.nome === secao.nome);
            if (existing) {
              existing.itens.push(...secao.itens);
            } else {
              allSecoes.push(secao);
            }
          }
        } catch (err) {
          console.error(`Erro na parte ${i + 1}:`, err);
          // Continue with other chunks
        }
      }
    }

    if (allSecoes.length === 0) {
      return new Response(
        JSON.stringify({ error: "Não foi possível extrair itens do documento. Verifique se o formato é suportado." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resultado = { secoes: allSecoes };
    await salvarResultado(supabaseClient, caderno_id, resultado);

    const totalItens = allSecoes.reduce((sum, s) => sum + s.itens.length, 0);
    console.log(`Análise concluída: ${allSecoes.length} secções, ${totalItens} itens`);

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

function splitTextIntoChunks(text: string, maxChars: number): string[] {
  const lines = text.split("\n");
  const chunks: string[] = [];
  let currentChunk = "";

  for (const line of lines) {
    if (currentChunk.length + line.length + 1 > maxChars && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = "";
    }
    currentChunk += (currentChunk ? "\n" : "") + line;
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk);
  }
  return chunks;
}

async function analyzeChunk(
  text: string,
  apiKey: string,
  chunkIndex: number,
  totalChunks: number
): Promise<{ secoes: SecaoAnalise[] }> {
  const chunkContext = totalChunks > 1 
    ? `\n\nNOTA: Este é o bloco ${chunkIndex} de ${totalChunks} do documento completo. Extrai TODOS os itens que encontrares neste bloco, mesmo que pertençam a secções já identificadas noutros blocos.` 
    : "";

  const systemPrompt = `És um especialista em cadernos de encargos de construção civil para Portugal e Espanha.

A tua tarefa é analisar o texto de um caderno de encargos e extrair TODA a informação estruturada. É CRÍTICO que extraias TODOS os itens sem exceção.

REGRAS IMPORTANTES:
1. NUNCA inventes quantidades - se não encontrares, deixa null
2. Identifica secções/capítulos hierárquicos
3. Extrai TODOS os itens de trabalho encontrados - não omitas nenhum
4. Para cada item de trabalho, extrai:
   - Descrição completa
   - Unidade (m2, m3, un, ml, kg, vg, etc.)
   - Quantidade (apenas se explicitamente indicada)
   - Texto original
5. Classifica cada item por:
   - Tipo de trabalho (demolição, estrutura, alvenaria, revestimento, etc.)
   - Método construtivo (manual, mecânico, pré-fabricado, etc.)
   - Material principal
6. Se o texto vier em formato tabular (com colunas separadas por |), cada linha da tabela é potencialmente um item de trabalho
7. NÃO agrupes itens - cada linha/artigo individual deve ser um item separado

Responde APENAS com a chamada da função extract_caderno_structure.`;

  const userPrompt = `Analisa o seguinte caderno de encargos e extrai a estrutura completa com TODOS os itens:${chunkContext}

${text}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_caderno_structure",
            description: "Extrair estrutura completa do caderno de encargos com TODOS os itens",
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
      throw new Error("Limite de pedidos excedido. Tente novamente mais tarde.");
    }
    if (response.status === 402) {
      throw new Error("Créditos insuficientes. Adicione créditos ao workspace.");
    }
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  const aiResponse = await response.json();
  
  const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    return JSON.parse(toolCall.function.arguments);
  }
  
  const content = aiResponse.choices?.[0]?.message?.content;
  if (content) {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  }
  
  throw new Error("Não foi possível extrair estrutura da resposta da IA");
}

// Parser básico para BC3
async function parseBC3(xmlContent: string): Promise<{ secoes: SecaoAnalise[] } | null> {
  try {
    const secoes: SecaoAnalise[] = [];
    const lines = xmlContent.split("\n");
    
    let currentSecao: SecaoAnalise | null = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith("~C|")) {
        const parts = trimmed.split("|");
        if (parts.length >= 3) {
          if (currentSecao) secoes.push(currentSecao);
          currentSecao = {
            codigo: parts[1] || String(secoes.length + 1),
            nome: parts[2] || "Sem nome",
            nivel: 1,
            itens: [],
          };
        }
      }
      
      if (trimmed.startsWith("~D|") && currentSecao) {
        const parts = trimmed.split("|");
        if (parts.length >= 4) {
          currentSecao.itens.push({
            descricao: parts[2] || "",
            unidade: parts[3] || null,
            quantidade: parts[4] ? parseFloat(parts[4]) : null,
            texto_original: trimmed,
            classificacao: {},
          });
        }
      }
    }
    
    if (currentSecao) secoes.push(currentSecao);
    if (secoes.length === 0) return null;
    
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

    // Insert items in batches for efficiency
    const itemsBatch = secao.itens.map((item, j) => ({
      secao_id: secaoData.id,
      descricao_original: item.descricao,
      unidade_detectada: item.unidade,
      quantidade_detectada: item.quantidade,
      texto_original: item.texto_original,
      ordem: j,
      status: "pendente",
      classificacao: item.classificacao || {},
    }));

    if (itemsBatch.length > 0) {
      const { error: itemError, data: insertedItems } = await supabase
        .from("caderno_itens")
        .insert(itemsBatch)
        .select("id");

      if (itemError) {
        console.error("Erro ao criar itens em lote:", itemError);
        // Fallback: insert one by one
        for (const item of itemsBatch) {
          const { error: singleError } = await supabase
            .from("caderno_itens")
            .insert(item);
          if (!singleError) totalItens++;
        }
      } else {
        totalItens += insertedItems?.length || 0;
      }
    }
  }

  await supabase
    .from("cadernos_encargos")
    .update({
      status: "analisado",
      total_itens: totalItens,
    })
    .eq("id", cadernoId);
}
