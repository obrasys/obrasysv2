import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { site_conditions } = await req.json();
    if (!site_conditions) {
      return new Response(JSON.stringify({ error: "Missing site_conditions" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sc = site_conditions;
    const systemPrompt = `Eres Axia™, o motor de inteligência para construção civil portuguesa. Gera cenários de fundação preliminares para orçamento.

REGRAS ESTRITAS:
- Gera exatamente 2-3 cenários de fundação adequados às condições fornecidas
- Cada cenário inclui itens paramétricos com quantidades e preços estimados para Portugal
- Os preços são estimativas de mercado em €, ano 2024-2025
- Inclui sempre uma breve justificação técnica (axia_reasoning)
- Classifica a confiança de 0.0 a 1.0
- Nunca apresentes como cálculo definitivo — é estimativa para orçamento preliminar
- Fórmulas de origem devem referenciar parâmetros do terreno (ex: "area_implantacao * 0.15")
- Responde em português de Portugal
- Usa a ferramenta fornecida para estruturar a resposta`;

    const userPrompt = `Condições do terreno:
- Tipo de solo: ${sc.tipo_solo}
- Capacidade portante: ${sc.capacidade_portante_kpa} kPa
- Nível freático: ${sc.nivel_freatico_m} m
- Zona sísmica: ${sc.zona_sismica}
- Topografia: ${sc.topografia}
- Área de implantação: ${sc.area_implantacao_m2} m²
- Número de pisos: ${sc.numero_pisos}

Gera cenários de fundação adequados com itens paramétricos e custos estimados.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              name: "infra_scenarios",
              description: "Return foundation scenarios with parametric items",
              parameters: {
                type: "object",
                properties: {
                  scenarios: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        nome: { type: "string" },
                        tipo_fundacao: {
                          type: "string",
                          enum: ["sapatas_isoladas", "sapata_corrida", "ensoleiramento", "estacas"],
                        },
                        descricao: { type: "string" },
                        parametros: { type: "object" },
                        custo_estimado: { type: "number" },
                        axia_confidence: { type: "number" },
                        axia_reasoning: { type: "string" },
                        items: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              descricao: { type: "string" },
                              unidade: { type: "string" },
                              quantidade: { type: "number" },
                              preco_unitario: { type: "number" },
                              valor_total: { type: "number" },
                              formula_origem: { type: "string" },
                            },
                            required: ["descricao", "unidade", "quantidade", "preco_unitario", "valor_total", "formula_origem"],
                          },
                        },
                      },
                      required: ["nome", "tipo_fundacao", "descricao", "parametros", "custo_estimado", "axia_confidence", "axia_reasoning", "items"],
                    },
                  },
                },
                required: ["scenarios"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "infra_scenarios" } },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("AI gateway error:", resp.status, errText);
      return new Response(
        JSON.stringify({ error: resp.status === 429 ? "Rate limit exceeded" : resp.status === 402 ? "Credits exhausted" : "AI error" }),
        { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await resp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let scenarios: any[] = [];

    if (toolCall) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        scenarios = parsed.scenarios || [];
      } catch (e) {
        console.error("Failed to parse AI response:", e);
      }
    }

    return new Response(JSON.stringify({ scenarios }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("axia-infra-scenarios error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
