import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader?.replace("Bearer ", "");
    if (!token) throw new Error("Não autenticado");
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(token);
    if (authErr || !user) throw new Error("Não autenticado");

    const body = await req.json();
    const { file_path, obra_id, configuracao_id, espessura_nucleo, classe_betao, classe_aco } = body;

    if (!file_path || !obra_id || !configuracao_id) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios em falta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download the file from storage
    const { data: fileData, error: dlErr } = await supabase.storage
      .from("plan-files")
      .download(file_path);

    if (dlErr || !fileData) {
      throw new Error(`Erro ao descarregar ficheiro: ${dlErr?.message || "ficheiro não encontrado"}`);
    }

    // Convert to base64 (chunk-safe for large files)
    const arrayBuf = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuf);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary);
    const mimeType = file_path.endsWith(".pdf") ? "application/pdf"
      : file_path.endsWith(".png") ? "image/png"
      : "image/jpeg";

    const systemPrompt = `Você é um engenheiro estrutural especialista em sistema construtivo ICF (Insulated Concrete Forms).
Analise a planta de estrutura/arquitetura fornecida e extraia TODOS os elementos construtivos visíveis.

Regras de extração:
- Paredes ICF: identifique cada pano de parede com referência (ex: P1, P2...), comprimento (m), altura útil (m), e espessura do núcleo de betão (${espessura_nucleo || 0.15}m).
- Vãos: para cada parede, identifique portas (largura x altura), janelas (largura x altura) e respectivas quantidades.
- Fundações: identifique sapatas contínuas e/ou isoladas com comprimento, largura e altura estimados.
- Lajes: identifique lajes com área (m²), espessura total estimada e tipologia (maciça, aligeirada, etc.).
- Use dimensões em METROS.
- Se não conseguir determinar um valor exacto, faça uma estimativa razoável baseada na escala da planta.

Classe de betão de referência: ${classe_betao || "C25/30"}
Classe de aço de referência: ${classe_aco || "A500NR"}

Responda EXCLUSIVAMENTE com o JSON estruturado, sem markdown, sem comentários.`;

    const userPrompt = `Analise esta planta e extraia todos os elementos construtivos ICF num JSON com esta estrutura exacta:
{
  "paredes": [
    {
      "referencia": "P1",
      "comprimento": 5.0,
      "altura_util": 2.80,
      "espessura_nucleo": ${espessura_nucleo || 0.15},
      "piso_inicial": "R/C",
      "piso_final": "R/C",
      "vaos": [
        { "tipo_vao": "porta", "largura": 0.90, "altura": 2.10, "quantidade": 1 },
        { "tipo_vao": "janela", "largura": 1.20, "altura": 1.00, "quantidade": 2 }
      ]
    }
  ],
  "fundacoes": [
    {
      "tipo_fundacao": "sapata_continua",
      "referencia": "SC1",
      "comprimento": 10.0,
      "largura": 0.70,
      "altura": 0.45,
      "quantidade": 1
    }
  ],
  "lajes": [
    {
      "referencia": "L1",
      "piso": "R/C",
      "tipologia_laje": "aligeirada",
      "area": 80.0,
      "espessura_total": 0.25
    }
  ],
  "notas": "Observações gerais sobre a planta analisada"
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64}` },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_icf_elements",
              description: "Extrair elementos construtivos ICF de uma planta",
              parameters: {
                type: "object",
                properties: {
                  paredes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        referencia: { type: "string" },
                        comprimento: { type: "number" },
                        altura_util: { type: "number" },
                        espessura_nucleo: { type: "number" },
                        piso_inicial: { type: "string" },
                        piso_final: { type: "string" },
                        vaos: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              tipo_vao: { type: "string" },
                              largura: { type: "number" },
                              altura: { type: "number" },
                              quantidade: { type: "number" },
                            },
                            required: ["tipo_vao", "largura", "altura", "quantidade"],
                          },
                        },
                      },
                      required: ["referencia", "comprimento", "altura_util", "espessura_nucleo"],
                    },
                  },
                  fundacoes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        tipo_fundacao: { type: "string", enum: ["sapata_continua", "sapata_isolada", "outra"] },
                        referencia: { type: "string" },
                        comprimento: { type: "number" },
                        largura: { type: "number" },
                        altura: { type: "number" },
                        quantidade: { type: "number" },
                      },
                      required: ["tipo_fundacao", "comprimento", "largura", "altura", "quantidade"],
                    },
                  },
                  lajes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        referencia: { type: "string" },
                        piso: { type: "string" },
                        tipologia_laje: { type: "string" },
                        area: { type: "number" },
                        espessura_total: { type: "number" },
                      },
                      required: ["area", "espessura_total"],
                    },
                  },
                  notas: { type: "string" },
                },
                required: ["paredes", "fundacoes", "lajes"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_icf_elements" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de pedidos excedido, tente novamente em breve." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos AI esgotados. Adicione créditos em Definições." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      throw new Error(`Erro na análise AI: ${status}`);
    }

    const aiData = await aiResponse.json();

    // Extract from tool call
    let extracted: any;
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      extracted = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } else {
      // Fallback: try parsing from content
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Não foi possível extrair dados da planta");
      }
    }

    return new Response(JSON.stringify({ success: true, data: extracted }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("icf-plant-analysis error:", e);
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
