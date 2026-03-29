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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query, category } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Éste é um assistente especializado em preços de materiais de construção civil em Portugal.

REGRAS ESTRITAS:
- Responde APENAS em formato JSON usando tool calling
- Pesquisa preços atuais de mercado em Portugal (2024-2025)
- Inclui sempre a unidade (m², m³, kg, un, ml, l, ton)
- Inclui faixa de preço (mínimo e máximo)
- Inclui um preço médio estimado
- Indica a confiança da estimativa (0-100)
- Indica fontes prováveis (ex: "Mercado PT 2024", "Referência sectorial")
- Se não tiver dados fiáveis, indica confiança baixa
- Máximo 10 resultados por pesquisa
- Preços em EUR (€)
- Categoria do item deve ser inferida (ex: "Betão", "Aço", "Cerâmica", "Tintas", etc.)`;

    const userPrompt = category 
      ? `Pesquisa preços atuais de mercado em Portugal para materiais de construção na categoria "${category}": ${query}`
      : `Pesquisa preços atuais de mercado em Portugal para materiais de construção: ${query}`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
                name: "return_material_prices",
                description: "Return researched material prices for construction in Portugal",
                parameters: {
                  type: "object",
                  properties: {
                    materials: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          nome: { type: "string", description: "Nome do material" },
                          descricao: { type: "string", description: "Descrição breve" },
                          categoria: { type: "string", description: "Categoria (Betão, Aço, Cerâmica, Tintas, Isolamento, etc.)" },
                          unidade: { type: "string", description: "Unidade de medida (m², m³, kg, un, ml, l, ton)" },
                          preco_minimo: { type: "number", description: "Preço mínimo estimado em EUR" },
                          preco_maximo: { type: "number", description: "Preço máximo estimado em EUR" },
                          preco_medio: { type: "number", description: "Preço médio estimado em EUR" },
                          confianca: { type: "number", description: "Nível de confiança da estimativa (0-100)" },
                          fonte: { type: "string", description: "Fonte da informação" },
                          notas: { type: "string", description: "Notas adicionais relevantes" },
                        },
                        required: ["nome", "categoria", "unidade", "preco_minimo", "preco_maximo", "preco_medio", "confianca", "fonte"],
                        additionalProperties: false,
                      },
                    },
                    resumo: { type: "string", description: "Resumo geral da pesquisa" },
                    data_referencia: { type: "string", description: "Data de referência dos preços (YYYY-MM)" },
                  },
                  required: ["materials", "resumo", "data_referencia"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "return_material_prices" } },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de pedidos excedido. Tente novamente em breve." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos na sua conta." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call returned from AI");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("research-material-prices error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
