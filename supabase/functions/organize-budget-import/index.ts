import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const client = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { rows, headers } = await req.json();

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum dado recebido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (rows.length > 500) {
      return new Response(JSON.stringify({ error: "Limite de 500 linhas excedido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Chave IA não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um especialista em orçamentos de construção civil portuguesa. Recebe dados brutos extraídos de um ficheiro Excel de orçamento e deve organizá-los no formato padrão do ObraSys.

REGRAS:
1. Identifique quais linhas são CAPÍTULOS (títulos de secção, sem quantidade nem preço) e quais são ARTIGOS (itens de trabalho com descrição, quantidade, preço).
2. Agrupe os artigos sob o capítulo correto. Se não houver capítulo explícito, crie um capítulo "Geral".
3. Normalize as unidades para: un, m, m2, m3, ml, kg, vg, l
4. Se uma linha tiver apenas texto (sem valores numéricos relevantes), é provavelmente um capítulo.
5. Se o código do artigo não existir, gere um código sequencial (ex: 1.1, 1.2, 2.1).
6. Sugira um título para o orçamento baseado no conteúdo.
7. Mantenha os preços originais sem alterar.
8. Se existirem subtotais ou totais, IGNORE essas linhas.

IMPORTANTE: Não invente dados. Se um campo não existir nos dados originais, use null.`;

    const userPrompt = `Colunas do Excel: ${JSON.stringify(headers)}

Dados brutos (${rows.length} linhas):
${JSON.stringify(rows.slice(0, 200), null, 0)}

${rows.length > 200 ? `... e mais ${rows.length - 200} linhas adicionais.` : ''}

Organize estes dados no formato JSON estruturado do ObraSys.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
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
              name: "organize_budget",
              description: "Organiza dados brutos de Excel num orçamento estruturado com capítulos e artigos",
              parameters: {
                type: "object",
                properties: {
                  titulo_sugerido: {
                    type: "string",
                    description: "Título sugerido para o orçamento baseado no conteúdo",
                  },
                  capitulos: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        numero: { type: "number" },
                        titulo: { type: "string" },
                        artigos: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              codigo: { type: "string", description: "Código do artigo (ex: 1.1)" },
                              descricao: { type: "string" },
                              unidade: { type: "string", description: "Unidade normalizada: un, m, m2, m3, ml, kg, vg, l" },
                              quantidade: { type: "number" },
                              preco_unitario: { type: "number" },
                            },
                            required: ["descricao", "unidade", "quantidade", "preco_unitario"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["numero", "titulo", "artigos"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["titulo_sugerido", "capitulos"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "organize_budget" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de pedidos excedido. Tente novamente em breves momentos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "Erro ao processar com IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "IA não retornou dados estruturados" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const organized = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(organized), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("organize-budget-import error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
