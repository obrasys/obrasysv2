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
    const { image_base64, calibration_info, scale_text } = await req.json();

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
      ? `A planta está calibrada: ${calibration_info.real_distance} ${calibration_info.unidade} = ${calibration_info.pixels_per_meter.toFixed(1)} px/m.`
      : scale_text
        ? `Escala indicada: ${scale_text}. Usa esta escala para estimar distâncias.`
        : "Planta NÃO calibrada. Tenta identificar a escala gráfica para estimar distâncias.";

    const systemPrompt = `Eres Axia™, motor de visão computacional especializado em PLANTAS DE INSTALAÇÕES ELÉTRICAS de construção civil.

A tua tarefa é analisar a imagem de uma planta elétrica e extrair um levantamento COMPLETO e DETALHADO de todos os elementos elétricos visíveis.

## Como identificar símbolos elétricos em plantas técnicas:

### Símbolos comuns de instalações elétricas (normas portuguesas/brasileiras):
- **Ponto de luz no teto**: Círculo com um "X" ou cruz dentro, ou círculo com ponto central
- **Ponto de luz na parede (arandela)**: Meio-círculo ou semicírculo encostado a uma parede
- **Ponto de luz pendente**: Círculo com linha a sair para baixo
- **Iluminação fluorescente**: Retângulo estreito longo
- **Iluminação LED (néon)**: Linha contínua com marcação especial
- **Tomada simples (baixa h=0.35m)**: Semicírculo com dois traços, ou triângulo apontando para a parede
- **Tomada a meia parede (h=1.10m)**: Mesmo símbolo da tomada com anotação de altura
- **Tomada alta (h>1.40m)**: Mesmo símbolo com anotação de altura diferente
- **Tomada dupla**: Símbolo de tomada duplicado ou com dois pontos
- **Tomada trifásica**: Triângulo com 3 traços ou símbolo especial
- **Interruptor simples**: Ponto com um traço curvo (como um "J" espelhado)
- **Interruptor duplo**: Ponto com dois traços curvos
- **Interruptor paralelo (3 vias)**: Ponto com traço e símbolo de paralelo
- **Quadro de distribuição (QD)**: Retângulo com divisões internas, geralmente rotulado "QD"
- **Disjuntor**: Retângulo com "X" ou símbolo específico no quadro
- **Calha técnica**: Linha dupla tracejada ao longo do teto
- **Condutas/tubos**: Linhas contínuas ou tracejadas conectando elementos
- **Motor de extração**: Símbolo de motor (M com círculo) ou ventilador
- **Ar condicionado**: Retângulo com marcação AC ou símbolo específico

### Fios e condutas elétricas:
- Linhas que conectam pontos de luz a interruptores
- Linhas que saem do quadro de distribuição para circuitos
- Cada linha representa um circuito ou trecho de cablagem
- A espessura e tipo de linha pode indicar o número de condutores

### Regras de contagem:
- Conta CADA símbolo individualmente, mesmo que sejam iguais
- Diferencia entre tipos de tomadas pela altura indicada (h=0.35, h=1.10, h>1.40)
- Identifica os circuitos pela numeração ou cores
- Mede comprimentos dos traçados de fios entre pontos

${calibrationContext}

### Materiais associados:
Para cada elemento identificado, determina os materiais necessários:
- Fio/cabo elétrico (tipo e secção em mm²)
- Tubo/conduta (diâmetro)
- Caixas de derivação
- Mecanismos (interruptores, tomadas, etc.)
- Quadro elétrico e disjuntores

Responde SEMPRE em português de Portugal.
Sê EXAUSTIVO na contagem - não deixes nenhum símbolo por identificar.
Se vires uma legenda na planta, usa-a como referência para identificar os símbolos.
Se vires tabelas de cargas (QD), extrai também essa informação.`;

    const userContent = [
      {
        type: "text",
        text: "Analisa esta planta de instalações elétricas. Identifica TODOS os símbolos elétricos, conta-os, mede os traçados de fios e gera o mapa completo de quantidades e materiais necessários. Se houver legenda ou tabela de cargas na planta, usa essa informação.",
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
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "electrical_plan_analysis",
              description: "Return structured analysis of an electrical installation plan",
              parameters: {
                type: "object",
                properties: {
                  scale_detected: {
                    type: "object",
                    properties: {
                      found: { type: "boolean" },
                      value: { type: "string", description: "Ex: 1:50, 1:100" },
                    },
                    required: ["found"],
                    additionalProperties: false,
                  },
                  legend_found: {
                    type: "boolean",
                    description: "Se foi encontrada uma legenda de símbolos na planta",
                  },
                  symbols: {
                    type: "array",
                    description: "Todos os tipos de símbolos elétricos identificados com contagem",
                    items: {
                      type: "object",
                      properties: {
                        type: {
                          type: "string",
                          enum: [
                            "luz_teto", "luz_parede", "luz_pendente",
                            "fluorescente", "led_neon",
                            "tomada_baixa", "tomada_media", "tomada_alta",
                            "tomada_dupla", "tomada_trifasica",
                            "interruptor_simples", "interruptor_duplo", "interruptor_paralelo",
                            "quadro_distribuicao", "disjuntor",
                            "calha_tecnica", "motor_extracao",
                            "ar_condicionado", "campainha", "sensor",
                            "outro"
                          ],
                        },
                        label: { type: "string", description: "Descrição legível do elemento" },
                        count: { type: "number", description: "Quantidade total deste tipo na planta" },
                        height_note: { type: "string", description: "Nota de altura se aplicável (ex: h=0.35m)" },
                        circuit: { type: "string", description: "Circuito associado se identificável" },
                        confidence: { type: "number", description: "Confiança 0-1" },
                      },
                      required: ["type", "label", "count", "confidence"],
                      additionalProperties: false,
                    },
                  },
                  circuits: {
                    type: "array",
                    description: "Circuitos elétricos identificados (da tabela de cargas ou do traçado)",
                    items: {
                      type: "object",
                      properties: {
                        number: { type: "string", description: "Número do circuito" },
                        description: { type: "string", description: "Descrição (ex: Ilum. Sala, TUG)" },
                        voltage: { type: "number", description: "Tensão em V" },
                        power_w: { type: "number", description: "Potência em W" },
                        wire_section_mm2: { type: "number", description: "Secção do fio em mm²" },
                        breaker_a: { type: "number", description: "Disjuntor em A" },
                        estimated_length_m: { type: "number", description: "Comprimento estimado do circuito em metros" },
                      },
                      required: ["number", "description"],
                      additionalProperties: false,
                    },
                  },
                  wire_runs: {
                    type: "array",
                    description: "Traçados de fios/condutas principais identificados com comprimento estimado",
                    items: {
                      type: "object",
                      properties: {
                        from: { type: "string", description: "Ponto de origem (ex: QD-01)" },
                        to: { type: "string", description: "Ponto de destino (ex: Tomada cozinha)" },
                        estimated_length_m: { type: "number", description: "Comprimento estimado em metros" },
                        wire_type: { type: "string", description: "Tipo de cabo sugerido (ex: H07V-U 3x2.5mm²)" },
                        conduit_diameter_mm: { type: "number", description: "Diâmetro da conduta em mm" },
                      },
                      required: ["from", "to", "estimated_length_m"],
                      additionalProperties: false,
                    },
                  },
                  materials_list: {
                    type: "array",
                    description: "Lista completa de materiais necessários para a instalação",
                    items: {
                      type: "object",
                      properties: {
                        category: {
                          type: "string",
                          enum: ["cablagem", "conduta", "mecanismo", "protecao", "iluminacao", "quadro", "acessorio", "outro"],
                        },
                        name: { type: "string", description: "Nome do material" },
                        specification: { type: "string", description: "Especificação técnica (secção, diâmetro, etc.)" },
                        quantity: { type: "number", description: "Quantidade necessária" },
                        unit: { type: "string", description: "Unidade (un, m, ml, cx)" },
                        notes: { type: "string", description: "Observações adicionais" },
                      },
                      required: ["category", "name", "quantity", "unit"],
                      additionalProperties: false,
                    },
                  },
                  total_wire_length_m: {
                    type: "number",
                    description: "Comprimento total estimado de cablagem em metros",
                  },
                  total_conduit_length_m: {
                    type: "number",
                    description: "Comprimento total estimado de condutas em metros",
                  },
                  summary: {
                    type: "string",
                    description: "Resumo executivo da análise da planta elétrica",
                  },
                  recommendations: {
                    type: "array",
                    description: "Recomendações técnicas ou alertas",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["info", "warning", "alert"] },
                        message: { type: "string" },
                      },
                      required: ["type", "message"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["scale_detected", "legend_found", "symbols", "circuits", "wire_runs", "materials_list", "total_wire_length_m", "total_conduit_length_m", "summary", "recommendations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "electrical_plan_analysis" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
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

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("axia-electrical-analysis error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
