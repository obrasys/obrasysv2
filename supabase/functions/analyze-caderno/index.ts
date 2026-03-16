import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
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

const MAX_CHARS_PER_CHUNK = 100000; // ~100K chars per chunk

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

    let allSecoes: SecaoAnalise[] = [];

    if (textLength <= MAX_CHARS_PER_CHUNK) {
      const resultado = await analyzeChunk(textoParaAnalise, LOVABLE_API_KEY, 1, 1);
      allSecoes = resultado.secoes;
    } else {
      // Split text into chunks, trying to split at section boundaries
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

  // Try to split at section boundaries (lines starting with major section markers)
  const isSectionBoundary = (line: string): boolean => {
    // Match patterns like "||A|1|", "||A|12|", section headers
    return /^\[\d+\]\s*\|*\s*\|*\s*A\s*\|\s*\d+\s*\|/.test(line) ||
           /^\[\d+\]\s*.*\|(ESTALEIRO|PREPARAÇÕES|TETOS|PAREDES|ACABAMENTOS|PAVIMENTOS|CANTARIAS|CARPINTARIAS|SERRALHARIAS|ILUMINAÇÃO|REDE DE|SEGURANÇA|DETEÇÃO|ITED|AVAC|DIVERSOS|IMAGEM|SPRINKLERS|RIA)/i.test(line);
  };

  for (const line of lines) {
    if (currentChunk.length + line.length + 1 > maxChars && currentChunk.length > 0) {
      // Try to find a section boundary nearby to split
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
    ? `\n\nNOTA IMPORTANTE: Este é o bloco ${chunkIndex} de ${totalChunks} do documento completo. Extrai TODOS os itens deste bloco sem exceção.` 
    : "";

  const systemPrompt = `És um especialista em cadernos de encargos e mapas de quantidades de construção civil para Portugal e Espanha.

A tua tarefa é analisar o texto de um mapa de quantidades / caderno de encargos e extrair TODA a informação estruturada. É ABSOLUTAMENTE CRÍTICO que extraias TODOS os itens sem exceção.

O DOCUMENTO TEM ESTA ESTRUTURA TÍPICA:
- Colunas: SPU | Especialidade | Item | Designação | Unidade | Quantidade | Preço Unitário | Valor
- Secções principais são identificadas por números (1, 2, 3...) e nomes em MAIÚSCULAS
- Sub-itens dentro de cada secção têm numeração hierárquica (1.1, 1.2, 2.1, etc.)
- Linhas com dados podem ter formato: [nº linha] valor1 | valor2 | valor3 ...

REGRAS CRÍTICAS:
1. NUNCA inventes quantidades - se não encontrares, deixa null
2. Extrai ABSOLUTAMENTE TODOS os itens de trabalho - NÃO OMITAS NENHUM
3. As SECÇÕES DE ESPECIALIDADES (Rede Eléctrica, AVAC, Gás, Segurança, Deteção de Incêndios, Sprinklers, RIA) contêm muitos sub-itens com numeração INLINE no texto da designação. Exemplo:
   - "1.1.1 -RZ1-K (AS) 3G1,5 fornecimento..." → item com código 1.1.1
   - "2.3.1 - Tomada monofásica..." → item com código 2.3.1
   - "3.5.1.1 - Caminho de cabos 600x60" → item com código 3.5.1.1
   CADA UM destes é um item SEPARADO que DEVE ser extraído.
4. Itens de AVAC são numerados sequencialmente (1, 2, 3... até 56) e cada um pode ter SUB-ITENS com modelos específicos
5. Secções de Sprinklers e RIA têm tubagens com diferentes diâmetros - CADA diâmetro é um item separado
6. Sub-itens em secções de Gás (válvulas, contadores, etc.) devem ser TODOS extraídos individualmente
7. Quando uma designação lista múltiplos equipamentos/modelos em linhas separadas, CADA equipamento/modelo é um item
8. Linhas que contêm apenas "0.00 €" ou estão completamente vazias NÃO são itens
9. Notas explicativas (parágrafos longos sem unidade/quantidade) NÃO são itens de trabalho
10. Para cada item extraído, inclui:
    - descricao: descrição completa do trabalho
    - unidade: m2, m3, un, ml, kg, vg, conj, s/u, etc.
    - quantidade: valor numérico (null se não indicado)
    - texto_original: texto exato como aparece no documento
11. Classifica cada item por tipo_trabalho, metodo_construtivo, material_principal

ATENÇÃO ESPECIAL - Padrões que indicam itens frequentemente omitidos:
- Linhas com unidade "un", "m", "ml", "conj", "vg" seguidas de quantidade
- Linhas com diâmetros (DN 25, Ø 6.4 mm, 100 mm, etc.)
- Linhas com modelos de equipamento (tipo XYZ ou equivalente)
- Linhas com referências (REF:, P 00 16, etc.)

Responde APENAS com a chamada da função extract_caderno_structure.`;

  const userPrompt = `Analisa o seguinte mapa de quantidades / caderno de encargos e extrai a estrutura completa com ABSOLUTAMENTE TODOS os itens de trabalho:${chunkContext}

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
            description: "Extrair estrutura completa do caderno de encargos com TODOS os itens sem exceção",
            parameters: {
              type: "object",
              properties: {
                secoes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      codigo: { type: "string", description: "Código da secção (ex: 1, 1.1, 2, A.12)" },
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
    const parsed = JSON.parse(toolCall.function.arguments);
    const totalItems = parsed.secoes?.reduce((s: number, sec: any) => s + (sec.itens?.length || 0), 0) || 0;
    console.log(`Chunk ${chunkIndex}: extracted ${parsed.secoes?.length || 0} sections, ${totalItems} items`);
    return parsed;
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

    // Insert items in batches of 50 for efficiency
    const BATCH_SIZE = 50;
    for (let batchStart = 0; batchStart < secao.itens.length; batchStart += BATCH_SIZE) {
      const batch = secao.itens.slice(batchStart, batchStart + BATCH_SIZE);
      const itemsBatch = batch.map((item, j) => ({
        secao_id: secaoData.id,
        descricao_original: item.descricao,
        unidade_detectada: item.unidade,
        quantidade_detectada: item.quantidade,
        texto_original: item.texto_original,
        ordem: batchStart + j,
        status: "pendente",
        classificacao: item.classificacao || {},
      }));

      const { error: itemError, data: insertedItems } = await supabase
        .from("caderno_itens")
        .insert(itemsBatch)
        .select("id");

      if (itemError) {
        console.error(`Erro ao criar itens em lote (batch ${batchStart}):`, itemError);
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

  console.log(`Total items saved to DB: ${totalItens}`);

  await supabase
    .from("cadernos_encargos")
    .update({
      status: "analisado",
      total_itens: totalItens,
    })
    .eq("id", cadernoId);
}