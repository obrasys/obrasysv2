import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { rateLimitOrg } from "../_shared/rateLimitOrg.ts";
import { resolveChain } from "../_shared/axia/model-router.ts";
import { buildAxiaPlanSuggestionsSystemPrompt } from "../_shared/axia/prompts.ts";
import { logAxiaCall } from "../_shared/axia/logCall.ts";




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
      return new Response(JSON.stringify({ error: "Unauthorized", suggestions: [] }), {
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
      return new Response(JSON.stringify({ error: "Unauthorized", suggestions: [] }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;
    const limited = await rateLimitOrg(userId, {
      module: "axia_plan_suggestions", windowSeconds: 60, maxCalls: 10, corsHeaders,
    });
    if (limited) return limited;

    const { obra_id, tipo_obra, measurements, existing_mappings } = await req.json();

    if (!measurements || measurements.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured", suggestions: [] }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context for the AI
    const measurementsSummary = measurements.map((m: any) => ({
      tipo: m.tipo,
      etiqueta: m.etiqueta || m.tipo,
      camada: m.camada || "sem camada",
      valor: m.valor_bruto,
      unidade: m.unidade,
      estado: m.estado_validacao,
    }));

    const mappingsSummary = (existing_mappings || []).map((mp: any) => ({
      medicao: mp.etiqueta || mp.tipo,
      artigo: mp.artigo_codigo || "sem artigo",
      artigo_desc: mp.artigo_descricao || "",
      estado: mp.estado,
    }));

    const systemPrompt = `Tu és a Axia, a camada de inteligência operacional do Obra Sys para construção civil em Portugal.
Trabalhas em português de Portugal.
Apoias leitura de planta, medições, validação e orçamento, mas NÃO substituis revisão humana, projeto técnico, engenheiro responsável ou fornecedor.
Nunca inventas valores. Quando não houver evidência suficiente, devolves resposta vazia (suggestions: []) em vez de inventar.

REGRAS GLOBAIS DA AXIA NO MÓDULO PLANTA
1. Nunca devolver medições como definitivas sem evidência.
2. Diferenciar sempre dado lido / calculado / inferido / estimado / indisponivel.
3. Sem escala/calibração confiável → não tratar quantidades como definitivas.
4. Em caso de dúvida → review_required=true.
5. Não contar elementos em cortes, alçados, detalhes, legendas, carimbos ou tabelas.
6. Não duplicar elementos entre planta geral, detalhe, corte e legenda.
7. Coordenadas e bbox sempre normalizadas entre 0 e 1.
8. Nada vai para orçamento sem origem, confidence e estado de validação.

Analisa as medições feitas sobre planta e os mapeamentos existentes para sugerir melhorias.

Regras estritas:
- Nunca sugiras valores absolutos de preço.
- Nunca alteres dados automaticamente - toda sugestão tem auto_apply_allowed=false implícito.
- Foca-te em artigos complementares que tipicamente acompanham os medidos.
- Não sugiras complementares como definitivos se a medição base estiver com estado=pendente ou confidence baixa - nesses casos marca severity="info" e indica no message que depende de validação prévia.
- Deteta duplicações na mesma zona/camada.
- Deteta incompatibilidades de unidades entre medição e artigo.
- Valida coerência de valores (ex: WC com mais de 50m² é provável erro).
- Em cada sugestão indica no message a razão (reason) e a ação sugerida (suggested_action) de forma operacional.
- Sê conciso e operacional nas mensagens.

${AXIA_ANTI_HALLUCINATION_BLOCK}`;

    const userPrompt = `Tipo de obra: ${tipo_obra || "não especificado"}
    
Medições realizadas (${measurementsSummary.length}):
${JSON.stringify(measurementsSummary, null, 2)}

Mapeamentos existentes (${mappingsSummary.length}):
${JSON.stringify(mappingsSummary, null, 2)}

Analisa e retorna sugestões usando a ferramenta fornecida.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: resolveChain("suggestions").primary,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "plan_suggestions",
              description: "Return suggestions for plan measurements",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: {
                          type: "string",
                          enum: [
                            "add_complementary",
                            "unit_mismatch",
                            "duplicate_zone",
                            "value_incoherence",
                            "missing_mapping",
                          ],
                        },
                        severity: {
                          type: "string",
                          enum: ["info", "warning", "error"],
                        },
                        title: { type: "string" },
                        message: { type: "string" },
                        related_measurement: { type: "string" },
                        suggested_article: { type: "string" },
                      },
                      required: ["type", "severity", "title", "message"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suggestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "plan_suggestions" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded", suggestions: [] }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted", suggestions: [] }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await resp.text();
      console.error("AI gateway error:", resp.status, errText);
      return new Response(JSON.stringify({ error: "AI error", suggestions: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await resp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let suggestions: any[] = [];

    if (toolCall) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        suggestions = parsed.suggestions || [];
      } catch (e) {
        console.error("Failed to parse AI response:", e);
      }
    }

    // Log to axia_suggestions_log (Lote 2.1: incluir organization_id)
    if (suggestions.length > 0) {
      const { data: __orgMembership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userId)
        .eq("member_status", "active")
        .maybeSingle();

      await supabase.from("axia_suggestions_log").insert({
        user_id: userId,
        organization_id: __orgMembership?.organization_id ?? null,
        suggestion_type: "plan_measurement",
        suggestion_payload: { obra_id, plan_measurements_count: measurements.length, suggestions },
      });
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("axia-plan-suggestions error:", msg);
    return new Response(JSON.stringify({ error: msg, suggestions: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
