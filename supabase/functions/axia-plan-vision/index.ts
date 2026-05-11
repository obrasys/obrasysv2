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

    const { image_base64, calibration_info, plan_import_id, page_number } = await req.json();

    if (!image_base64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validação de tamanho — base64 inflate ~33% sobre bytes reais.
    const approxBytes = Math.floor((image_base64.length * 3) / 4);
    const MAX_BYTES = 12 * 1024 * 1024; // 12 MB de imagem
    if (approxBytes > MAX_BYTES) {
      return new Response(JSON.stringify({
        error: `Imagem demasiado grande (${(approxBytes / 1024 / 1024).toFixed(1)} MB). Limite 12 MB. Reduza a resolução ou divida a planta.`,
      }), { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const startedAt = Date.now();
    const callModel = "google/gemini-2.5-flash";
    const callType = "axia_plan_vision";
    const inputSizeBytes = approxBytes;
    let logStatus: "ok" | "error" | "timeout" = "ok";
    let logErrorMessage: string | null = null;

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

    const systemPrompt = `Tu és a Axia, a camada de inteligência operacional do Obra Sys, especializada em leitura técnica de documentos de obra.

A tua função é analisar plantas arquitetónicas, cortes, alçados, implantações e documentos técnicos, extraindo informação útil para gestão de obra, orçamento, medições, cronograma e validação técnica. Trabalhas em português de Portugal e segues normas e práticas correntes em Portugal.

Devolves SEMPRE um JSON estruturado válido conforme o schema da function tool. Nunca inventas: se não tens a certeza, marcas confidence baixa e review_required=true.

ETAPAS DE ANÁLISE:

1) CLASSIFICAÇÃO DA FOLHA — preenche sheet_classification: tipo (planta_piso, implantacao, corte, alcado, detalhe, legenda, outro), piso, título da folha, escala (1:50, 1:100…), e flags norte_presente, legenda_presente, carimbo_presente.

2) CALIBRAÇÃO E ESCALA — ${calibrationContext}. Preenche scale_detected.found=true se vires barra de escala ou indicação textual de escala.

3) COTAS — para cada cota visível, regista: raw_text (texto exatamente como aparece, ex: "3.50", "3,50 m", "350"), value (numérico interpretado), unit (m/cm/mm), label (o que mede), position_x/position_y (centro normalizado 0-1), bbox normalizada {x_min,y_min,x_max,y_max} se possível, confidence 0-1. Se a cota é ilegível, marca valor_nao_legivel=true e review_required=true (não inventes valor — usa 0).

4) COMPARTIMENTOS — identifica divisões. Cada um: name (texto literal da planta se existir), tipo_normalizado (sala, cozinha, sala_cozinha, quarto, suite, instalacao_sanitaria, circulacao, escada, arrumos, zona_tecnica, garagem, estacionamento, terraco, varanda, jardim, churrasqueira, exterior, indefinido), estimated_area (m² — OBRIGATÓRIO, nunca 0; se a área está rotulada na planta usa-a e marca area_legivel=true; caso contrário ESTIMA com base nas cotas visíveis, escala detetada, ou proporção do bbox face à folha — neste caso area_legivel=false e review_required=true; usa intervalos típicos: WC 3-6 m², quarto 9-15 m², sala 15-30 m², cozinha 8-15 m², circulação 4-10 m², garagem 12-25 m²), perimetro_estimado_m (perímetro real do contorno em metros — se cotas visíveis usa-as; caso contrário aproxima pelo retângulo do bbox usando a escala detetada; NUNCA devolvas 0 quando há área), vaos_porta_associados (array com os labels/identificadores das portas em elements que abrem para este compartimento — usa o mesmo nome que pões em compartimentos_conectados dos vãos), center_x/center_y, bbox, confidence, evidencias (sinais que usaste — ex: "rotulo SALA", "WC simbolo sanitario", "estimado por bbox"), area_legivel.

5) PAREDES — popula walls com tipo (parede_exterior, parede_interior, muro_lote, muro_contencao, parede_indefinida), orientacao (horizontal/vertical/diagonal/irregular), bbox, compartimento_associado, confidence_score, review_required, evidencias. NUNCA afirmes que uma parede é estrutural com base só em planta arquitetónica — usa parede_indefinida em caso de dúvida.

REGRA ANTI-DUPLICAÇÃO DE PAREDES (CRÍTICO): cada parede física é UMA entrada. Mede pelo eixo médio (centerline) — NUNCA contes as duas faces paralelas da mesma parede como duas paredes diferentes. Se vires duas linhas paralelas próximas (espessura típica de parede 0.10–0.40 m), é UMA parede. Não dupliques paredes vistas em cortes/detalhes/legendas/carimbos.

IGNORAR ELEMENTOS NÃO-PLANTA: se a folha for classificada como corte, alcado, detalhe, legenda ou outro (ou se uma região for claramente um corte/legenda/carimbo dentro da folha), NÃO incluas as suas paredes/vãos/compartimentos em walls/elements/rooms — esses elementos não devem ir para quantitativos. Regista apenas em limitations.

6) ELEMENTOS CONSTRUTIVOS — portas, janelas, vãos, pilares, escadas. Tipos preferenciais: porta_interior, porta_exterior, porta_correr, janela, portao_garagem, portao_lote, vao_indefinido, pilar, escada (mantém porta/janela genéricos como fallback). Para CADA porta/janela é OBRIGATÓRIO devolver largura_cm e altura_cm. Se a planta tem cota legível do vão usa-a e marca dimensao_legivel=true; caso contrário INFERE com padrões PT (Porta WC 70, Porta interior 80, Porta entrada 90, Porta correr 120, Portão garagem 240; Janela pequena 60-80×100, média 100-140×120, grande ≥160×140; altura padrão de portas 210, de janelas 120) e marca dimensao_legivel=false + review_required=true. Inclui parede_associada, compartimentos_conectados (lista os compartimentos que o vão liga — para portas interiores DEVE incluir o compartimento "interior" para que o rodapé seja descontado nesse compartimento), confidence_score.

7) ELEMENTOS EXTERIORES — para implantações ou folhas com exterior, popula exterior_elements: lote, rua, acesso, estacionamento, jardim, vegetacao, muro, patio, terraco, cota_altimetrica, confrontacao. Inclui bbox e confidence_score.

8) QUALIDADE DE LEITURA — preenche reading_quality com overall_confidence, image_quality (alta/media/baixa), text_legibility, dimensions_legibility, risk_level (baixo/medio/alto) e human_intervention_required (true se a folha tem texto/cotas largamente ilegíveis ou é ambígua).

9) LIMITAÇÕES E PERGUNTAS — em limitations lista o que não conseguiste extrair (ex: "cotas verticais sobrepostas no canto inferior direito"); em validation_questions sugere até 5 perguntas concretas para um humano confirmar (ex: "Confirma que o compartimento central é Sala+Cozinha?").

REGRAS CRÍTICAS:
- Nunca afirmes que um elemento é estrutural apenas pela planta arquitetónica.
- Usa sempre confidence/confidence_score entre 0 e 1.
- Marca review_required=true sempre que houver dúvida.
- Toda entidade deve ter posição (position_x/y ou center_x/y ou bbox). Coordenadas e bbox são SEMPRE normalizadas 0-1.
- Se não conseguires localizar a região, omite bbox e explica em notes.
- Responde em português de Portugal.
- Sê preciso nos valores numéricos. Não inventes cotas que não vês.`;

    const userContent = [
      {
        type: "text",
        text: "Analisa esta planta de construção seguindo as 9 etapas. Devolve JSON estruturado completo via plan_analysis.",
      },
      {
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${image_base64}`,
        },
      },
    ];

    const bboxSchema = {
      type: "object",
      properties: {
        x_min: { type: "number" },
        y_min: { type: "number" },
        x_max: { type: "number" },
        y_max: { type: "number" },
      },
      required: ["x_min", "y_min", "x_max", "y_max"],
      additionalProperties: false,
    };

    const extractTextContent = (content: unknown): string => {
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        return content
          .map((part) => {
            if (typeof part === "string") return part;
            if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
              return part.text;
            }
            return "";
          })
          .filter(Boolean)
          .join("\n");
      }
      return "";
    };

    const parseJsonWithRepair = (raw: string) => {
      const cleaned = raw
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();

      try {
        return JSON.parse(cleaned);
      } catch {
        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");
        const sliced = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
        let s = sliced.trim().replace(/,\s*$/, "");
        const stack: string[] = [];
        let inStr = false;
        let esc = false;
        for (const c of s) {
          if (esc) {
            esc = false;
            continue;
          }
          if (c === "\\") {
            esc = true;
            continue;
          }
          if (c === '"') {
            inStr = !inStr;
            continue;
          }
          if (inStr) continue;
          if (c === "{") stack.push("}");
          else if (c === "[") stack.push("]");
          else if ((c === "}" || c === "]") && stack.length) stack.pop();
        }
        if (inStr) s += '"';
        while (stack.length) s += stack.pop();
        return JSON.parse(s);
      }
    };

    const normalizeAnalysis = (analysis: any) => ({
      ...analysis,
      scale_detected: analysis?.scale_detected ?? { found: false },
      dimensions: Array.isArray(analysis?.dimensions) ? analysis.dimensions : [],
      rooms: Array.isArray(analysis?.rooms) ? analysis.rooms : [],
      elements: Array.isArray(analysis?.elements) ? analysis.elements : [],
      walls: Array.isArray(analysis?.walls) ? analysis.walls : [],
      exterior_elements: Array.isArray(analysis?.exterior_elements) ? analysis.exterior_elements : [],
      limitations: Array.isArray(analysis?.limitations) ? analysis.limitations : [],
      validation_questions: Array.isArray(analysis?.validation_questions) ? analysis.validation_questions : [],
      summary: typeof analysis?.summary === "string" ? analysis.summary : "",
    });

    const HARD_DEADLINE_MS = 135_000; // deixa folga para 150s da edge runtime
    const deadline = startedAt + HARD_DEADLINE_MS;
    const remainingMs = () => deadline - Date.now();

    const callAI = async (modelName: string, mode: "tool" | "json" = "tool", timeoutMs = 60_000) => {
      const fallbackSystemPrompt = `${systemPrompt}\n\nFALLBACK CRÍTICO: se não conseguires devolver via function tool, responde APENAS com um objeto JSON válido, sem markdown nem texto antes/depois.`;
      const ctrl = new AbortController();
      const budget = Math.min(timeoutMs, Math.max(5_000, remainingMs() - 2_000));
      const timer = setTimeout(() => ctrl.abort(), budget);
      try {
        return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelName,
          max_tokens: mode === "json" ? 12000 : 8000,
          messages: [
            { role: "system", content: mode === "json" ? fallbackSystemPrompt : systemPrompt },
            { role: "user", content: userContent },
          ],
          ...(mode === "json"
            ? {
                response_format: { type: "json_object" },
              }
            : {
                tools: [
                  {
                    type: "function",
                    function: {
                      name: "plan_analysis",
                      description: "Return structured analysis of a construction plan image (Axia spec).",
                      parameters: {
                        type: "object",
                        properties: {
                  sheet_classification: {
                    type: "object",
                    properties: {
                      type: {
                        type: "string",
                        enum: ["planta_piso", "implantacao", "corte", "alcado", "detalhe", "legenda", "outro"],
                      },
                      piso: { type: "string" },
                      titulo: { type: "string" },
                      escala: { type: "string" },
                      norte_presente: { type: "boolean" },
                      legenda_presente: { type: "boolean" },
                      carimbo_presente: { type: "boolean" },
                    },
                    additionalProperties: false,
                  },
                  scale_detected: {
                    type: "object",
                    properties: {
                      found: { type: "boolean" },
                      value: { type: "string" },
                      reference_dimension: { type: "string" },
                    },
                    required: ["found"],
                    additionalProperties: false,
                  },
                  dimensions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        value: { type: "number" },
                        unit: { type: "string" },
                        label: { type: "string" },
                        raw_text: { type: "string" },
                        valor_nao_legivel: { type: "boolean" },
                        position_x: { type: "number" },
                        position_y: { type: "number" },
                        bbox: bboxSchema,
                        confidence: { type: "number" },
                        review_required: { type: "boolean" },
                        associated_to: { type: "string" },
                      },
                      required: ["value", "unit", "label", "position_x", "position_y", "confidence"],
                      additionalProperties: false,
                    },
                  },
                  rooms: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        tipo_normalizado: {
                          type: "string",
                          enum: [
                            "sala", "cozinha", "sala_cozinha", "quarto", "suite",
                            "instalacao_sanitaria", "circulacao", "escada", "arrumos",
                            "zona_tecnica", "garagem", "estacionamento", "terraco",
                            "varanda", "jardim", "churrasqueira", "exterior", "indefinido",
                          ],
                        },
                        estimated_area: { type: "number" },
                        area_legivel: { type: "boolean" },
                        perimetro_estimado_m: { type: "number" },
                        vaos_porta_associados: { type: "array", items: { type: "string" } },
                        center_x: { type: "number" },
                        center_y: { type: "number" },
                        bbox: bboxSchema,
                        confidence: { type: "number" },
                        review_required: { type: "boolean" },
                        evidencias: { type: "array", items: { type: "string" } },
                      },
                      required: ["name", "center_x", "center_y", "confidence", "estimated_area", "perimetro_estimado_m"],
                      additionalProperties: false,
                    },
                  },
                  elements: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: {
                          type: "string",
                          enum: [
                            "porta", "janela", "pilar", "escada", "parede", "outro",
                            "porta_interior", "porta_exterior", "porta_correr",
                            "portao_garagem", "portao_lote", "vao_indefinido",
                          ],
                        },
                        label: { type: "string" },
                        position_x: { type: "number" },
                        position_y: { type: "number" },
                        bbox: bboxSchema,
                        count: { type: "number" },
                        largura_cm: { type: "number" },
                        altura_cm: { type: "number" },
                        dimensao_legivel: { type: "boolean" },
                        parede_associada: { type: "string" },
                        compartimentos_conectados: { type: "array", items: { type: "string" } },
                        largura_legivel: { type: "boolean" },
                        confidence_score: { type: "number" },
                        review_required: { type: "boolean" },
                      },
                      required: ["type", "label", "position_x", "position_y"],
                      additionalProperties: false,
                    },
                  },
                  walls: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        tipo: {
                          type: "string",
                          enum: ["parede_exterior", "parede_interior", "muro_lote", "muro_contencao", "parede_indefinida"],
                        },
                        orientacao: {
                          type: "string",
                          enum: ["horizontal", "vertical", "diagonal", "irregular"],
                        },
                        bbox: bboxSchema,
                        compartimento_associado: { type: "string" },
                        confidence_score: { type: "number" },
                        review_required: { type: "boolean" },
                        evidencias: { type: "array", items: { type: "string" } },
                        notes: { type: "string" },
                      },
                      required: ["tipo", "orientacao", "confidence_score"],
                      additionalProperties: false,
                    },
                  },
                  exterior_elements: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        tipo: {
                          type: "string",
                          enum: [
                            "lote", "rua", "acesso", "estacionamento", "jardim",
                            "vegetacao", "muro", "patio", "terraco", "cota_altimetrica", "confrontacao",
                          ],
                        },
                        bbox: bboxSchema,
                        confidence_score: { type: "number" },
                        notes: { type: "string" },
                      },
                      required: ["tipo", "confidence_score"],
                      additionalProperties: false,
                    },
                  },
                  reading_quality: {
                    type: "object",
                    properties: {
                      overall_confidence: { type: "number" },
                      image_quality: { type: "string", enum: ["alta", "media", "baixa"] },
                      text_legibility: { type: "string", enum: ["alta", "media", "baixa"] },
                      dimensions_legibility: { type: "string", enum: ["alta", "media", "baixa"] },
                      risk_level: { type: "string", enum: ["baixo", "medio", "alto"] },
                      human_intervention_required: { type: "boolean" },
                    },
                    additionalProperties: false,
                  },
                  limitations: { type: "array", items: { type: "string" } },
                  validation_questions: { type: "array", items: { type: "string" } },
                  summary: { type: "string" },
                },
                        required: ["scale_detected", "dimensions", "rooms", "elements", "summary"],
                        additionalProperties: false,
                      },
                    },
                  },
                ],
                tool_choice: { type: "function", function: { name: "plan_analysis" } },
              }),
        }),
      });
      } finally {
        clearTimeout(timer);
      }
    };

    let resp = await callAI("google/gemini-2.5-flash");
    let usedFallback = false;

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

    let aiData = await resp.json();
    let choice = aiData.choices?.[0];
    let finishReason = choice?.finish_reason;
    let toolCall = choice?.message?.tool_calls?.[0];
    let messageText = extractTextContent(choice?.message?.content);

    // Retry com modelo mais robusto se a Flash falhou (apenas se houver tempo)
    if ((!toolCall || finishReason === "error") && !usedFallback && remainingMs() > 45_000) {
      console.warn("Flash failed (finish_reason=", finishReason, "). Retrying with gemini-2.5-pro.");
      usedFallback = true;
      resp = await callAI("google/gemini-2.5-pro");
      if (resp.ok) {
        aiData = await resp.json();
        choice = aiData.choices?.[0];
        finishReason = choice?.finish_reason;
        toolCall = choice?.message?.tool_calls?.[0];
        messageText = extractTextContent(choice?.message?.content);
      }
    }

    let analysis = null;

    if (toolCall) {
      const rawArgs: string = toolCall.function?.arguments ?? "";
      try {
        analysis = parseJsonWithRepair(rawArgs);
      } catch (e) {
        console.error(
          "Failed to parse AI tool args. finish_reason=",
          finishReason,
          "len=",
          rawArgs.length,
          "tail=",
          rawArgs.slice(-200),
        );
        // Attempt repair: balance unclosed braces/brackets caused by truncation
        try {
          analysis = parseJsonWithRepair(rawArgs);
          console.warn("Recovered partial JSON via repair (truncated output).");
        } catch (e2) {
          return new Response(
            JSON.stringify({
              error:
                finishReason === "length"
                  ? "Análise truncada (planta muito densa). Tente processar uma página de cada vez."
                  : "Resposta inválida do motor de IA. Tente novamente.",
            }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    } else {
      console.error("No tool_call in AI response. finish_reason=", finishReason, "messageTextLen=", messageText.length);
      if (messageText) {
        try {
          analysis = parseJsonWithRepair(messageText);
          console.warn("Recovered analysis from plain JSON message content.");
        } catch {
          console.warn("Plain JSON recovery failed. Retrying with json_object response format.");
        }
      }

      if (!analysis && remainingMs() > 30_000) {
        const jsonResp = await callAI("google/gemini-2.5-pro", "json");
        if (jsonResp.ok) {
          const jsonData = await jsonResp.json();
          const jsonChoice = jsonData.choices?.[0];
          const jsonText = extractTextContent(jsonChoice?.message?.content);
          try {
            analysis = parseJsonWithRepair(jsonText);
            finishReason = jsonChoice?.finish_reason ?? finishReason;
          } catch (jsonErr) {
            console.error("JSON fallback parse failed:", jsonErr instanceof Error ? jsonErr.message : String(jsonErr));
          }
        } else {
          console.error("JSON fallback request failed with status", jsonResp.status);
        }
      }

      if (!analysis) {
        return new Response(
          JSON.stringify({ error: "Motor de IA não devolveu análise estruturada." }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    analysis = normalizeAnalysis(analysis);

    // Pós-processamento: dedup paredes por eixo médio + orientação + compartimento
    // (evita contar duas faces paralelas como duas paredes distintas)
    if (analysis && Array.isArray(analysis.walls)) {
      const seen = new Map<string, any>();
      const PROX = 0.02; // 2% da folha = ~espessura de parede em coords normalizadas
      let removed = 0;
      for (const w of analysis.walls) {
        const b = w.bbox;
        const cx = b ? (b.x_min + b.x_max) / 2 : -1;
        const cy = b ? (b.y_min + b.y_max) / 2 : -1;
        const ori = w.orientacao ?? "indef";
        const comp = (w.compartimento_associado ?? "").toLowerCase().trim();
        // chave grosseira (compartimento + orientação + centroide arredondado)
        const key = `${comp}|${ori}|${Math.round(cx / PROX)}|${Math.round(cy / PROX)}`;
        if (seen.has(key)) {
          removed++;
          continue;
        }
        seen.set(key, w);
      }
      if (removed > 0) {
        analysis.walls = Array.from(seen.values());
        analysis.limitations = [
          ...(Array.isArray(analysis.limitations) ? analysis.limitations : []),
          `Dedup automático: ${removed} parede(s) duplicada(s) (faces paralelas ou repetidas) removidas.`,
        ];
      }
    }

    await supabase.from("axia_suggestions_log").insert({
      user_id: userId,
      suggestion_type: "plan_vision_analysis",
      suggestion_payload: { analysis },
    });

    // Log estruturado de chamada (Fase 7)
    await supabase.from("axia_call_logs").insert({
      user_id: userId,
      call_type: callType,
      model: callModel,
      plan_import_id: plan_import_id ?? null,
      page_number: page_number ?? null,
      input_size_bytes: inputSizeBytes,
      latency_ms: Date.now() - startedAt,
      status: logStatus,
      error_message: logErrorMessage,
    } as any).then(() => {}, (e) => console.warn("axia_call_logs insert failed:", e?.message));

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
