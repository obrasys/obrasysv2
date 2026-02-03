import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orcamentoId } = await req.json();

    if (!orcamentoId) {
      return new Response(
        JSON.stringify({ error: "orcamentoId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get authorization header
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

    // Fetch orcamento with RLS - only returns if user owns it
    const { data: orcamento, error: fetchError } = await supabaseClient
      .from("orcamentos")
      .select(`
        *,
        capitulos:capitulos_orcamento(
          *,
          artigos:artigos_orcamento(*)
        )
      `)
      .eq("id", orcamentoId)
      .single();

    if (fetchError || !orcamento) {
      console.error("Error fetching orcamento:", fetchError);
      return new Response(
        JSON.stringify({ error: "Orçamento não encontrado ou acesso negado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare data for AI validation
    const capitulos = orcamento.capitulos || [];
    const totalArtigos = capitulos.reduce(
      (acc: number, cap: any) => acc + (cap.artigos?.length || 0),
      0
    );

    const prompt = `Analisa este orçamento de construção civil e verifica a sua consistência:

ORÇAMENTO: ${orcamento.titulo}
VALOR TOTAL: ${orcamento.valor_total}€
MARGEM DE LUCRO: ${orcamento.margem_lucro}%
NÚMERO DE CAPÍTULOS: ${capitulos.length}
NÚMERO DE ARTIGOS: ${totalArtigos}

CAPÍTULOS E ARTIGOS:
${capitulos.map((cap: any) => `
CAPÍTULO ${cap.numero}: ${cap.titulo} (Total: ${cap.valor_total}€)
${(cap.artigos || []).map((art: any) => 
  `  - ${art.codigo || 'S/C'}: ${art.descricao} | ${art.quantidade} ${art.unidade} x ${art.preco_unitario}€ = ${art.valor_total}€`
).join('\n')}
`).join('\n')}

Verifica:
1. Preços unitários realistas para Portugal
2. Quantidades coerentes
3. Descrições técnicas adequadas
4. Capítulos bem organizados
5. Margem de lucro adequada ao tipo de trabalho

Responde em formato JSON usando a tool 'validate_budget'.`;

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "És um especialista em orçamentação de construção civil em Portugal. Analisa orçamentos e identifica problemas, inconsistências e oportunidades de melhoria. Sê conciso e prático.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "validate_budget",
              description: "Retorna o resultado da validação do orçamento",
              parameters: {
                type: "object",
                properties: {
                  isValid: {
                    type: "boolean",
                    description: "Se o orçamento está válido e sem erros críticos",
                  },
                  score: {
                    type: "number",
                    description: "Pontuação de 0 a 100",
                  },
                  issues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["error", "warning", "info"] },
                        message: { type: "string" },
                        capitulo: { type: "string" },
                        artigo: { type: "string" },
                      },
                      required: ["type", "message"],
                    },
                  },
                  suggestions: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["isValid", "score", "issues", "suggestions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "validate_budget" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente mais tarde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos à sua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao validar orçamento com IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    console.log("AI response:", JSON.stringify(aiData));

    // Extract tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ error: "Resposta inválida da IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validationResult = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(validationResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in validate-budget-ai:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
