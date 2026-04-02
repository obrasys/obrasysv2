import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { image_base64, calibration_info } = await req.json();

    if (!image_base64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
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

    const calibrationContext = calibration_info
      ? `A planta já está calibrada: ${calibration_info.real_distance} ${calibration_info.unidade} = ${calibration_info.pixels_per_meter.toFixed(1)} px/m.`
      : "A planta NÃO está calibrada. Tenta identificar a escala gráfica ou cotas de referência para sugerir calibração.";

    const systemPrompt = `Eres Axia™, motor de visão computacional para plantas de construção civil portuguesa.

Analisa a imagem da planta e extrai TODAS as informações que consigas identificar:

1. COTAS E DIMENSÕES: Identifica todos os valores numéricos com unidade (ex: "3.50", "2.10m", "450") que representem distâncias ou dimensões cotadas na planta. Indica a posição aproximada (percentagem x,y da imagem) e o que medem.

2. ELEMENTOS CONSTRUTIVOS: Identifica paredes, portas, janelas, pilares, escadas, e divisões/compartimentos. Para cada divisão identificada, estima o nome provável (sala, quarto, WC, cozinha, corredor, etc.).

3. ESCALA: Se vires uma escala gráfica (barra de escala) ou indicação de escala (ex: "1:100", "1:50"), reporta-a.

4. ÁREAS: Se conseguires estimar áreas de compartimentos com base nas cotas visíveis, fá-lo.

${calibrationContext}

Regras:
- Reporta apenas o que REALMENTE vês na imagem
- Usa coordenadas normalizadas (0-1) relativas à imagem
- Responde sempre em português de Portugal
- Sê preciso nos valores numéricos`;

    const userContent = [
      {
        type: "text",
        text: "Analisa esta planta de construção e identifica todas as cotas, dimensões, elementos construtivos e compartimentos visíveis.",
      },
      {
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${image_base64}`,
        },
      },
    ];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "plan_analysis",
              description: "Return structured analysis of a construction plan image",
              parameters: {
                type: "object",
                properties: {
                  scale_detected: {
                    type: "object",
                    properties: {
                      found: { type: "boolean" },
                      value: { type: "string", description: "Ex: 1:100, 1:50" },
                      reference_dimension: { type: "string", description: "Ex: barra de escala de 1m" },
                    },
                    required: ["found"],
                    additionalProperties: false,
                  },
                  dimensions: {
                    type: "array",
                    description: "Cotas e dimensões identificadas na planta",
                    items: {
                      type: "object",
                      properties: {
                        value: { type: "number", description: "Valor numérico da cota" },
                        unit: { type: "string", description: "Unidade: m, cm, mm" },
                        label: { type: "string", description: "O que mede: largura parede sala, comprimento corredor, etc." },
                        position_x: { type: "number", description: "Posição X normalizada (0-1)" },
                        position_y: { type: "number", description: "Posição Y normalizada (0-1)" },
                        confidence: { type: "number", description: "Confiança 0-1" },
                      },
                      required: ["value", "unit", "label", "position_x", "position_y", "confidence"],
                      additionalProperties: false,
                    },
                  },
                  rooms: {
                    type: "array",
                    description: "Compartimentos/divisões identificados",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Nome do compartimento: Sala, Quarto, WC, Cozinha, etc." },
                        estimated_area: { type: "number", description: "Área estimada em m² (se possível calcular)" },
                        center_x: { type: "number", description: "Centro X normalizado (0-1)" },
                        center_y: { type: "number", description: "Centro Y normalizado (0-1)" },
                        confidence: { type: "number", description: "Confiança 0-1" },
                      },
                      required: ["name", "center_x", "center_y", "confidence"],
                      additionalProperties: false,
                    },
                  },
                  elements: {
                    type: "array",
                    description: "Elementos construtivos identificados (portas, janelas, pilares, escadas)",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["porta", "janela", "pilar", "escada", "parede", "outro"] },
                        label: { type: "string" },
                        position_x: { type: "number" },
                        position_y: { type: "number" },
                        count: { type: "number", description: "Quantidade deste elemento" },
                      },
                      required: ["type", "label", "position_x", "position_y"],
                      additionalProperties: false,
                    },
                  },
                  summary: {
                    type: "string",
                    description: "Resumo textual da análise da planta",
                  },
                },
                required: ["scale_detected", "dimensions", "rooms", "elements", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "plan_analysis" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await resp.text();
      console.error("AI gateway error:", resp.status, errText);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await resp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let analysis = null;

    if (toolCall) {
      try {
        analysis = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse AI response:", e);
      }
    }

    // Log the analysis
    await supabase.from("axia_suggestions_log").insert({
      user_id: userId,
      suggestion_type: "plan_vision_analysis",
      suggestion_payload: { analysis },
    });

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("axia-plan-vision error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
