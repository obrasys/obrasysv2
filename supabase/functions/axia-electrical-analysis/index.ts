// Axia – análise elétrica avançada com sub-classificação de folha,
// regra anti-legenda, leitura de tabelas quantitativas e cross-validation.
// Persiste símbolos em plan_placed_elements e circuitos em plan_electrical_circuits.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHEET_SUBTYPES = [
  "planta_instalacoes_eletricas",
  "planta_iluminacao",
  "planta_tomadas_alimentacoes",
  "pontos_eletricos_cotados",
  "diagrama_unifilar",
  "tabela_cargas",
  "quadro_distribuicao",
  "detalhe_vista_eletrica",
  "legenda_simbolos",
  "outro",
] as const;

const SYMBOL_KEYS = [
  // ─── Proteção & quadros ───
  "interruptor_tetrapolar", "interruptor_unipolar", "interruptor_unipolar_chave",
  "interruptor_diferencial_tetrapolar", "interruptor_diferencial_bipolar",
  "disjuntor_diferencial_tetrapolar", "disjuntor_diferencial_bipolar",
  "disjuntor_tetrapolar", "disjuntor_tripolar", "disjuntor_bipolar", "disjuntor_unipolar",
  "porta_fusivel_unipolar", "porta_fusivel_bipolar", "porta_fusivel_tripolar",
  "tribloco_fusiveis", "quadro_eletrico", "portinhola",
  "contador_energia", "contador_energia_tripla_tarifa",
  "caixa_coluna", "caixa_derivacao", "caixa_visita", "caixa_alimentacao",
  "ligacao_terra", "ligador_amovivel", "sinalizador_tensao_modular",
  // ─── Comando ───
  "interruptor_simples", "interruptor_duplo", "interruptor_paralelo",
  "comutador_escada", "comutador_escada_duplo", "comutador_lustre", "comutador_chave",
  "inversor",
  "botao_pressao", "botao_chave", "botao_pressao_sinalizacao",
  "detector_movimento",
  // ─── Iluminação ───
  "ponto_luz", "ponto_luz_embebido_parede", "ponto_luz_parede",
  "ponto_luz_downlight", "ponto_luz_uplight", "projetor_250w",
  "bloco_emergencia_permanente", "bloco_emergencia_nao_permanente",
  "bloco_emergencia_protecao_mecanica",
  "armadura_fluorescente_1x18", "armadura_fluorescente_1x36", "armadura_fluorescente_1x58",
  "armadura_fluorescente_2x18", "armadura_fluorescente_2x36", "armadura_fluorescente_2x58",
  "armadura_fluorescente_4x18",
  "armadura_fluorescente_2x36_antideflagrante",
  "armadura_incandescente_60w_antideflagrante",
  "armadura_fluorescente_2x36_kit_emergencia",
  "armadura_fluorescente_quadro_parede",
  "luminaria_industrial_suspensa_250w", "sinalizador_parede",
  // ─── Tomadas ───
  "tomada_schuko_obturadores", "tomada_estabilizada_ups", "tomada_trifasica_terra",
  // ─── Outros ───
  "sirene", "canalizacao_geral", "canalizacao_geral_enterrada",
  "ar_condicionado", "motor_extracao", "campainha", "sensor", "refletor",
  // ─── Aliases legados (compatibilidade com análises anteriores) ───
  "luz_teto", "luz_parede", "luz_pendente", "fluorescente", "led_neon",
  "tomada_baixa", "tomada_media", "tomada_alta", "tomada_dupla", "tomada_trifasica",
  "quadro_distribuicao", "disjuntor",
  "calha_tecnica", "eletroduto", "eletrocalha",
  "outro",
] as const;

const SHEETS_THAT_ALLOW_VISUAL_COUNT = new Set([
  "planta_instalacoes_eletricas",
  "planta_iluminacao",
  "planta_tomadas_alimentacoes",
  "pontos_eletricos_cotados",
]);

const SHEETS_THAT_BLOCK_VISUAL_COUNT = new Set([
  "diagrama_unifilar",
  "tabela_cargas",
  "quadro_distribuicao",
  "legenda_simbolos",
  "detalhe_vista_eletrica",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: claims } = await supabase.auth.getClaims(token);
      userId = (claims?.claims?.sub as string | undefined) ?? null;
    }

    const body = await req.json();
    const {
      image_base64,
      image_mime_type,
      calibration_info,
      scale_text,
      plan_import_id,
      specialty_plan_id,
      page_number,
      persist = true,
    } = body ?? {};

    if (!image_base64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const calibrationContext = calibration_info
      ? `Planta calibrada: ${calibration_info.real_distance} ${calibration_info.unidade ?? "m"} = ${calibration_info.pixels_per_meter?.toFixed?.(1) ?? "?"} px/m.`
      : scale_text
        ? `Escala indicada: ${scale_text}.`
        : "Planta NÃO calibrada — deixa total_wire_length_m=0 e total_conduit_length_m=0.";

    const systemPrompt = `Tu és a Axia, motor de inteligência operacional do Obra Sys, em PT-PT.
Analisas plantas e desenhos elétricos. NUNCA inventas dados. Sem evidência → confidence baixa e review_required=true.

ETAPA 1 — sheet_classification (OBRIGATÓRIA)
Classifica o tipo de folha em "sheet_subtype" usando UMA destas chaves:
- planta_instalacoes_eletricas: planta de implantação geral de instalações elétricas
- planta_iluminacao: planta dedicada apenas a iluminação
- planta_tomadas_alimentacoes: planta dedicada a tomadas e alimentações
- pontos_eletricos_cotados: planta de pontos cotados em altura/posição
- diagrama_unifilar: esquema unifilar de circuitos (NÃO é planta)
- tabela_cargas: quadro/tabela de cargas elétricas
- quadro_distribuicao: detalhe de quadro de distribuição
- detalhe_vista_eletrica: detalhe técnico ou vista
- legenda_simbolos: folha apenas com legenda/mapa de símbolos
- outro

ETAPA 2 — REGRAS DE EXTRAÇÃO POR TIPO DE FOLHA (CRÍTICO)
- Em planta_instalacoes_eletricas, planta_iluminacao, planta_tomadas_alimentacoes, pontos_eletricos_cotados:
  podes contar símbolos POSICIONADOS na planta como elementos reais da obra (placed_symbols).
- Em diagrama_unifilar, tabela_cargas, quadro_distribuicao:
  NÃO devolvas placed_symbols (deixa o array vazio). Preenche apenas circuits[] com circuito, quadro, tensão, potência, secção e disjuntor.
- Em legenda_simbolos:
  NÃO devolvas placed_symbols (vazio). Devolve apenas legend_map[] com {symbol_visual, symbol_key, meaning}.
- Em detalhe_vista_eletrica:
  NÃO contes símbolos. Devolve placed_symbols vazio.

REGRA DURA: Não contar símbolos presentes em legendas, tabelas de cargas, diagramas unifilares ou vistas técnicas como pontos executáveis da planta, salvo confirmação explícita do utilizador.

ETAPA 3 — quantity_table_extraction
Se a folha contiver uma TABELA QUANTITATIVA declarada (ex: "Tomadas Simples — 12 un", "Luminárias — 8 un", "Eletroduto aparente — 45 m"), extrai cada linha para declared_quantities[] com:
{ symbol_key, label, quantity, unit, source_table_name?, data_source: "extracted_quantity_table" }

ETAPA 4 — Cross-validation (visual_counts vs declared_quantities)
- Para cada símbolo presente em ambos, calcula divergência relativa.
- Se divergência > 10%, adiciona um item em "discrepancies": { symbol_key, visual_count, declared_count, message: "Há diferença entre a contagem visual e a tabela quantitativa da prancha. Confirme qual valor deseja usar." }
- Marca review_required=true nesses casos.

ETAPA 5 — Atributos elétricos por símbolo (quando aplicável)
Para cada symbol em placed_symbols, devolve, quando legível:
- installation_height: ex "h=0.35m", "h=1.10m", "h=1.40m"
- circuit_number, distribution_board (ex "QD-01"), voltage, power_w, cable_section_mm2, breaker_rating_a
- room_name (ex "Cozinha", "Salão", "Lavabo")
- is_existing (true se marcado como existente)
- technical_note
- data_source: "visual_symbol_detection" | "extracted_quantity_table" | "electrical_diagram" | "load_schedule"

ETAPA 6 — Materiais e cabos
- Só estima total_wire_length_m / total_conduit_length_m se houver escala/calibração; caso contrário 0.
- ${calibrationContext}

SIMBOLOGIA DE REFERÊNCIA (PT-PT, norma usada em projetos de eletricidade em Portugal)
Quando reconheceres um destes símbolos, usa EXATAMENTE a "symbol_key" indicada. Se não corresponder a nenhum, usa "outro" e descreve em technical_note.

[Proteção & Quadros]
- Interruptor tetrapolar (...A) → interruptor_tetrapolar
- Interruptor unipolar (...A) → interruptor_unipolar
- Interruptor unipolar com chave → interruptor_unipolar_chave
- Interruptor diferencial tetrapolar (...A ...mA) → interruptor_diferencial_tetrapolar
- Interruptor diferencial bipolar (...A ...mA) → interruptor_diferencial_bipolar
- Disjuntor diferencial tetrapolar (...A ...mA) → disjuntor_diferencial_tetrapolar
- Disjuntor diferencial bipolar (...A ...mA) → disjuntor_diferencial_bipolar
- Disjuntor tetrapolar / tripolar / bipolar / unipolar → disjuntor_tetrapolar | disjuntor_tripolar | disjuntor_bipolar | disjuntor_unipolar
- Porta circuitos fusível unipolar / bipolar / tripolar → porta_fusivel_unipolar | porta_fusivel_bipolar | porta_fusivel_tripolar
- Tribloco de fusíveis → tribloco_fusiveis
- Quadro elétrico → quadro_eletrico
- Portinhola (P) → portinhola
- Contador de energia (kWh) → contador_energia
- Contador de energia tripla tarifa (kWh, leitura com TI's) → contador_energia_tripla_tarifa
- Caixa de coluna (D=2 saídas, Q=4 saídas) → caixa_coluna
- Caixa de derivação (•) → caixa_derivacao
- Caixa de visita → caixa_visita
- Caixa de alimentação (CXA, com tomadas mono/trifásicas) → caixa_alimentacao
- Ligação à terra → ligacao_terra
- Ligador amovível (caixa de medição de terras) → ligador_amovivel
- Sinalizadores de tensão modulares (⦿⦿) → sinalizador_tensao_modular

[Comando]
- Interruptor simples → interruptor_simples
- Comutador de escada → comutador_escada
- Comutador de escada duplo → comutador_escada_duplo
- Comutador de lustre → comutador_lustre
- Comutador de chave → comutador_chave
- Inversor → inversor
- Botão de pressão → botao_pressao
- Botão com chave → botao_chave
- Botão de pressão com sinalização → botao_pressao_sinalizacao
- Detector de movimento (DM, 180º/360º) → detector_movimento

[Iluminação]
- Ponto de luz (✕) → ponto_luz
- Ponto de luz embebido em parede (☒) → ponto_luz_embebido_parede
- Ponto de luz na parede → ponto_luz_parede
- Ponto de luz no teto tipo "downlight" → ponto_luz_downlight
- Ponto de luz no pavimento tipo "uplight" → ponto_luz_uplight
- Projetor 1x250W → projetor_250w
- Bloco autónomo de emergência permanente → bloco_emergencia_permanente
- Bloco autónomo de emergência não permanente → bloco_emergencia_nao_permanente
- Bloco autónomo de emergência com proteção mecânica (0,5m do pavimento) → bloco_emergencia_protecao_mecanica
- Sinalizador de parede (△) → sinalizador_parede
- Armadura fluorescente 1x18W / 1x36W / 1x58W → armadura_fluorescente_1x18 | _1x36 | _1x58
- Armadura fluorescente 2x18W / 2x36W / 2x58W → armadura_fluorescente_2x18 | _2x36 | _2x58
- Armadura fluorescente 4x18W → armadura_fluorescente_4x18
- Armadura fluorescente 2x36W anti-deflagrante → armadura_fluorescente_2x36_antideflagrante
- Armadura incandescente 1x60W anti-deflagrante → armadura_incandescente_60w_antideflagrante
- Armadura fluorescente 2x36W com KIT de emergência → armadura_fluorescente_2x36_kit_emergencia
- Armadura fluorescente 1x36W para quadro de parede → armadura_fluorescente_quadro_parede
- Luminária industrial suspensa 1x250W → luminaria_industrial_suspensa_250w

[Tomadas]
- Tomada monofásica tipo Schuko com obturadores → tomada_schuko_obturadores
- Tomada monofásica estabilizada (UPS, terra circuito estabilizado) → tomada_estabilizada_ups
- Tomada trifásica com ligação à terra → tomada_trifasica_terra

[Outros]
- Sirene → sirene
- Canalização geral (linha) → canalizacao_geral
- Canalização geral enterrada → canalizacao_geral_enterrada

REGRAS DE USO DA SIMBOLOGIA
- Mantém SEMPRE o snake_case acima; nunca inventes chaves novas.
- Quando o desenho mostrar variações de potência (ex. armadura 2x58W), escolhe a chave correspondente em vez de "fluorescente" genérico.
- Se identificares um disjuntor mas não distinguires polos, usa "disjuntor" (legado).
- Aliases antigos (luz_teto, tomada_baixa, etc.) só devem ser usados se o desenho não permitir distinção PT-PT.

DEVOLVE APENAS via tool function "electrical_plan_analysis_v2".`;

    const imageMimeType = typeof image_mime_type === "string" && image_mime_type.startsWith("image/")
      ? image_mime_type
      : "image/jpeg";

    const userContent = [
      { type: "text", text: "Analisa esta folha elétrica seguindo as etapas e devolve a estrutura completa." },
      { type: "image_url", image_url: { url: `data:${imageMimeType};base64,${image_base64}` } },
    ];

    const toolSchema = {
      type: "object",
      properties: {
        sheet_subtype: { type: "string", enum: [...SHEET_SUBTYPES] },
        sheet_subtype_confidence: { type: "number" },
        scale_detected: {
          type: "object",
          properties: { found: { type: "boolean" }, value: { type: "string" } },
          required: ["found"], additionalProperties: false,
        },
        legend_found: { type: "boolean" },
        placed_symbols: {
          type: "array",
          description: "Símbolos POSICIONADOS na planta (apenas em folhas tipo planta_*).",
          items: {
            type: "object",
            properties: {
              symbol_key: { type: "string", description: "snake_case da simbologia PT-PT listada no prompt; usa \"outro\" se não corresponder." },
              label: { type: "string" },
              count: { type: "number", description: "Quantidade agrupada (ex: 5 tomadas iguais juntas) ou 1." },
              x: { type: "number" }, y: { type: "number" },
              installation_height: { type: "string" },
              circuit_number: { type: "string" },
              distribution_board: { type: "string" },
              voltage: { type: "number" },
              power_w: { type: "number" },
              cable_section_mm2: { type: "number" },
              breaker_rating_a: { type: "number" },
              room_name: { type: "string" },
              is_existing: { type: "boolean" },
              technical_note: { type: "string" },
              data_source: { type: "string", enum: ["visual_symbol_detection", "extracted_quantity_table", "electrical_diagram", "load_schedule"] },
              confidence: { type: "number" },
              review_required: { type: "boolean" },
            },
            required: ["symbol_key", "count", "confidence"],
            additionalProperties: false,
          },
        },
        declared_quantities: {
          type: "array",
          description: "Linhas de tabelas quantitativas declaradas na folha.",
          items: {
            type: "object",
            properties: {
              symbol_key: { type: "string", description: "snake_case da simbologia PT-PT listada no prompt; usa \"outro\" se não corresponder." },
              label: { type: "string" },
              quantity: { type: "number" },
              unit: { type: "string" },
              source_table_name: { type: "string" },
              data_source: { type: "string", enum: ["extracted_quantity_table"] },
            },
            required: ["symbol_key", "quantity", "unit"],
            additionalProperties: false,
          },
        },
        legend_map: {
          type: "array",
          items: {
            type: "object",
            properties: {
              symbol_visual: { type: "string" },
              symbol_key: { type: "string", description: "snake_case da simbologia PT-PT listada no prompt; usa \"outro\" se não corresponder." },
              meaning: { type: "string" },
            },
            required: ["symbol_key", "meaning"],
            additionalProperties: false,
          },
        },
        circuits: {
          type: "array",
          description: "Apenas para diagrama_unifilar / tabela_cargas / quadro_distribuicao.",
          items: {
            type: "object",
            properties: {
              circuit_number: { type: "string" },
              description: { type: "string" },
              distribution_board: { type: "string" },
              voltage: { type: "number" },
              power_w: { type: "number" },
              cable_section_mm2: { type: "number" },
              breaker_rating_a: { type: "number" },
              technical_note: { type: "string" },
              data_source: { type: "string", enum: ["electrical_diagram", "load_schedule"] },
            },
            required: ["description"],
            additionalProperties: false,
          },
        },
        discrepancies: {
          type: "array",
          items: {
            type: "object",
            properties: {
              symbol_key: { type: "string" },
              visual_count: { type: "number" },
              declared_count: { type: "number" },
              message: { type: "string" },
            },
            required: ["symbol_key", "visual_count", "declared_count", "message"],
            additionalProperties: false,
          },
        },
        total_wire_length_m: { type: "number" },
        total_conduit_length_m: { type: "number" },
        summary: { type: "string" },
        recommendations: {
          type: "array",
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
        review_required: { type: "boolean" },
      },
      required: ["sheet_subtype", "scale_detected", "legend_found", "placed_symbols", "declared_quantities", "legend_map", "circuits", "discrepancies", "total_wire_length_m", "total_conduit_length_m", "summary", "recommendations", "review_required"],
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
        return JSON.parse(sliced);
      }
    };

    const normalizeAnalysis = (analysis: any) => ({
      sheet_subtype: typeof analysis?.sheet_subtype === "string" ? analysis.sheet_subtype : "outro",
      scale_detected: analysis?.scale_detected ?? { found: false },
      legend_found: !!analysis?.legend_found,
      placed_symbols: Array.isArray(analysis?.placed_symbols) ? analysis.placed_symbols : [],
      declared_quantities: Array.isArray(analysis?.declared_quantities) ? analysis.declared_quantities : [],
      legend_map: Array.isArray(analysis?.legend_map) ? analysis.legend_map : [],
      circuits: Array.isArray(analysis?.circuits) ? analysis.circuits : [],
      discrepancies: Array.isArray(analysis?.discrepancies) ? analysis.discrepancies : [],
      total_wire_length_m: Number(analysis?.total_wire_length_m) || 0,
      total_conduit_length_m: Number(analysis?.total_conduit_length_m) || 0,
      summary: typeof analysis?.summary === "string" ? analysis.summary : "",
      recommendations: Array.isArray(analysis?.recommendations) ? analysis.recommendations : [],
      review_required: !!analysis?.review_required,
    });

    const callAI = async (modelName: string, mode: "tool" | "json" = "tool") => {
      const fallbackSystemPrompt = `${systemPrompt}\n\nFALLBACK CRÍTICO: se não conseguires devolver via function tool, responde APENAS com um objeto JSON válido, sem markdown nem texto antes/depois.`;
      return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelName,
          max_tokens: mode === "json" ? 10000 : 8000,
          messages: [
            { role: "system", content: mode === "json" ? fallbackSystemPrompt : systemPrompt },
            { role: "user", content: userContent },
          ],
          ...(mode === "json"
            ? { response_format: { type: "json_object" } }
            : {
                tools: [{
                  type: "function",
                  function: {
                    name: "electrical_plan_analysis_v2",
                    description: "Análise estruturada de folha elétrica com sub-classificação e cross-validation.",
                    parameters: toolSchema,
                  },
                }],
                tool_choice: { type: "function", function: { name: "electrical_plan_analysis_v2" } },
              }),
        }),
      });
    };

    let resp = await callAI("google/gemini-2.5-flash", "tool");
    if (!resp.ok && resp.status !== 400) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let aiData: any = resp.ok ? await resp.json() : {};
    let choice = aiData.choices?.[0];
    let toolCall = choice?.message?.tool_calls?.[0];
    let messageText = extractTextContent(choice?.message?.content);
    let analysis: any = null;

    if (toolCall) {
      try { analysis = parseJsonWithRepair(toolCall.function?.arguments ?? ""); }
      catch (e) { console.error("Failed to parse AI tool response:", e); }
    }

    if (!analysis) {
      const toolErrText = resp.ok ? "" : await resp.text();
      if (toolErrText) console.error("AI gateway tool error:", resp.status, toolErrText);

      const fallbackResp = await callAI("google/gemini-2.5-flash", "json");
      if (fallbackResp.ok) {
        aiData = await fallbackResp.json();
        choice = aiData.choices?.[0];
        messageText = extractTextContent(choice?.message?.content);
        if (messageText) {
          try { analysis = parseJsonWithRepair(messageText); }
          catch (e) { console.error("Failed to parse AI JSON fallback:", e); }
        }
      } else {
        const fallbackErrText = await fallbackResp.text();
        console.error("AI gateway JSON fallback error:", fallbackResp.status, fallbackErrText);
      }
    }

    if (!analysis) analysis = emptyAnalysis("A IA não devolveu análise estruturada.");
    analysis = normalizeAnalysis(analysis);

    // Aplicar regras de bloqueio em folhas que não permitem contagem visual
    const subtype = analysis.sheet_subtype || "outro";
    if (SHEETS_THAT_BLOCK_VISUAL_COUNT.has(subtype)) {
      if (Array.isArray(analysis.placed_symbols) && analysis.placed_symbols.length > 0) {
        analysis.recommendations ||= [];
        analysis.recommendations.push({
          type: "warning",
          message: `Esta folha foi classificada como "${subtype}" — símbolos visuais foram descartados. Não devem ser contados como elementos da obra.`,
        });
        analysis.placed_symbols = [];
      }
    }

    // Persistência
    let persisted = { placed_elements: 0, circuits: 0 };
    if (persist && userId && (plan_import_id || specialty_plan_id)) {
      // 1) Símbolos colocados → plan_placed_elements (apenas se plan_import_id)
      if (plan_import_id && Array.isArray(analysis.placed_symbols) && analysis.placed_symbols.length > 0) {
        const rows: any[] = [];
        for (const s of analysis.placed_symbols) {
          const count = Math.max(1, Math.round(Number(s.count) || 1));
          // Cada "count" expandido para uma linha separada simplifica os quantitativos.
          for (let i = 0; i < count; i++) {
            rows.push({
              plan_import_id,
              user_id: userId,
              symbol_type_id: s.symbol_key ?? "outro",
              category: "eletrica",
              subcategory: s.symbol_key ?? null,
              x: typeof s.x === "number" ? s.x : 0,
              y: typeof s.y === "number" ? s.y : 0,
              quantity: 1,
              note: s.label ?? null,
              environment: s.room_name ?? null,
              origin: "axia",
              installation_height: s.installation_height ?? null,
              circuit_number: s.circuit_number ?? null,
              distribution_board: s.distribution_board ?? null,
              voltage: s.voltage ?? null,
              power_w: s.power_w ?? null,
              cable_section_mm2: s.cable_section_mm2 ?? null,
              breaker_rating_a: s.breaker_rating_a ?? null,
              is_existing: !!s.is_existing,
              room_name: s.room_name ?? null,
              technical_note: s.technical_note ?? null,
              data_source: s.data_source ?? "visual_symbol_detection",
              sheet_subtype: subtype,
              review_required: !!s.review_required || (typeof s.confidence === "number" && s.confidence < 0.6),
            });
          }
        }
        if (rows.length > 0) {
          const { error, count } = await supabase
            .from("plan_placed_elements")
            .insert(rows, { count: "exact" });
          if (error) console.error("insert placed_elements failed", error);
          else persisted.placed_elements = count ?? rows.length;
        }
      }

      // 2) Linhas de tabela quantitativa declarada → plan_placed_elements (data_source=extracted_quantity_table)
      // Em folhas de legenda nunca persistir como obra: a legenda só explica símbolos.
      if (
        plan_import_id &&
        subtype !== "legenda_simbolos" &&
        Array.isArray(analysis.declared_quantities) &&
        analysis.declared_quantities.length > 0
      ) {
        const rows: any[] = [];
        for (const d of analysis.declared_quantities) {
          const qty = Math.max(0, Math.round(Number(d.quantity) || 0));
          if (qty === 0) continue;
          rows.push({
            plan_import_id,
            user_id: userId,
            symbol_type_id: d.symbol_key ?? "outro",
            category: "eletrica",
            subcategory: d.symbol_key ?? null,
            x: 0, y: 0,
            quantity: qty,
            note: d.label ?? d.source_table_name ?? "Tabela quantitativa",
            origin: "axia",
            data_source: "extracted_quantity_table",
            sheet_subtype: subtype,
            review_required: false,
          });
        }
        if (rows.length > 0) {
          const { error, count } = await supabase
            .from("plan_placed_elements")
            .insert(rows, { count: "exact" });
          if (error) console.error("insert declared_quantities failed", error);
          else persisted.placed_elements += count ?? rows.length;
        }
      }

      // 3) Circuitos elétricos
      if (Array.isArray(analysis.circuits) && analysis.circuits.length > 0) {
        const rows = analysis.circuits.map((c: any) => ({
          plan_import_id: plan_import_id ?? null,
          specialty_plan_id: specialty_plan_id ?? null,
          user_id: userId,
          circuit_number: c.circuit_number ?? null,
          description: c.description ?? null,
          distribution_board: c.distribution_board ?? null,
          voltage: c.voltage ?? null,
          power_w: c.power_w ?? null,
          cable_section_mm2: c.cable_section_mm2 ?? null,
          breaker_rating_a: c.breaker_rating_a ?? null,
          source_sheet_subtype: subtype,
          data_source: c.data_source ?? "electrical_diagram",
          technical_note: c.technical_note ?? null,
        }));
        const { error, count } = await supabase
          .from("plan_electrical_circuits")
          .insert(rows, { count: "exact" });
        if (error) console.error("insert circuits failed", error);
        else persisted.circuits = count ?? rows.length;
      }
    }

    return new Response(JSON.stringify({ analysis, persisted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("axia-electrical-analysis error:", msg);
    return new Response(JSON.stringify({
      analysis: emptyAnalysis(msg),
      error: { code: "runtime_error", message: msg },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  }
});

function emptyAnalysis(reason: string) {
  return {
    sheet_subtype: "outro",
    scale_detected: { found: false },
    legend_found: false,
    placed_symbols: [],
    declared_quantities: [],
    legend_map: [],
    circuits: [],
    discrepancies: [],
    total_wire_length_m: 0,
    total_conduit_length_m: 0,
    summary: "",
    recommendations: [
      { type: "warning", message: `Análise indisponível: ${reason}. Reveja manualmente a planta elétrica.` },
    ],
    review_required: true,
  };
}
