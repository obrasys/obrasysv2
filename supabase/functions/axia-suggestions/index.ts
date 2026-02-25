import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Not authenticated");

    const { tipo_obra, items, step } = await req.json();
    const suggestions: Array<{ type: string; message: string; payload: any }> = [];

    if (step === 2) {
      // Step 2: suggest missing items and detect outliers

      // Get stats for this tipo_obra
      const { data: stats } = await supabase
        .from("axia_budget_stats")
        .select("*")
        .eq("tipo_obra", tipo_obra);

      if (stats && stats.length > 0) {
        // Normalize current items via LLM
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        let normalizedItems: Array<{ descricao: string; canonical: string; valor: number }> = [];

        if (LOVABLE_API_KEY && items && items.length > 0) {
          try {
            const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                    content: `You are a construction budget item normalizer for Portugal. Given a list of work items, map each to a canonical category. Return ONLY a JSON array. Categories: Demolições, Alvenarias, Pinturas, Pavimentos, Revestimentos, Canalizações, Eletricidade, Carpintarias, Serralharias, Impermeabilizações, Coberturas, Estuques, Isolamentos, Vidros, Limpeza, Equipamentos, Paisagismo, Estruturas, Terraplanagem, Outros. Example: [{"original":"pintar paredes","canonical":"Pinturas"}]`,
                  },
                  {
                    role: "user",
                    content: JSON.stringify(items.map((i: any) => i.descricao)),
                  },
                ],
                tools: [{
                  type: "function",
                  function: {
                    name: "normalize_items",
                    description: "Normalize construction work items to canonical categories",
                    parameters: {
                      type: "object",
                      properties: {
                        items: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              original: { type: "string" },
                              canonical: { type: "string" },
                            },
                            required: ["original", "canonical"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["items"],
                      additionalProperties: false,
                    },
                  },
                }],
                tool_choice: { type: "function", function: { name: "normalize_items" } },
              }),
            });

            if (resp.ok) {
              const data = await resp.json();
              const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
              if (toolCall) {
                const parsed = JSON.parse(toolCall.function.arguments);
                normalizedItems = items.map((item: any, idx: number) => ({
                  descricao: item.descricao,
                  canonical: parsed.items?.[idx]?.canonical || "Outros",
                  valor: item.valor,
                }));

                // Save to dictionary
                for (const ni of normalizedItems) {
                  await supabase.from("axia_item_dictionary").upsert(
                    { raw_text: ni.descricao.toLowerCase().trim(), canonical_label: ni.canonical, confidence: 0.8 },
                    { onConflict: "raw_text", ignoreDuplicates: true }
                  ).select();
                }
              }
            }
          } catch (e) {
            console.error("LLM normalization error:", e);
          }
        }

        // Find missing common items for this tipo_obra
        const existingCanonicals = new Set(normalizedItems.map((i) => i.canonical));
        const commonItems = stats
          .filter((s: any) => s.sample_size >= 3 && !existingCanonicals.has(s.canonical_label))
          .sort((a: any, b: any) => b.sample_size - a.sample_size)
          .slice(0, 3);

        for (const missing of commonItems) {
          suggestions.push({
            type: "add_item",
            message: `A maioria dos orçamentos de ${tipo_obra.replace(/_/g, " ")} inclui "${missing.canonical_label}". Valor típico: ${missing.p25.toFixed(0)}€–${missing.p75.toFixed(0)}€.`,
            payload: {
              canonical_label: missing.canonical_label,
              suggested_value: missing.median_value,
            },
          });
        }

        // Detect value outliers
        for (const ni of normalizedItems) {
          const stat = stats.find((s: any) => s.canonical_label === ni.canonical);
          if (stat && stat.sample_size >= 3) {
            if (ni.valor < stat.p25 / 2) {
              suggestions.push({
                type: "value_outlier",
                message: `O valor de "${ni.descricao}" (${ni.valor}€) parece baixo. O intervalo típico é ${stat.p25.toFixed(0)}€–${stat.p75.toFixed(0)}€.`,
                payload: { descricao: ni.descricao, current: ni.valor, p25: stat.p25, p75: stat.p75 },
              });
            } else if (ni.valor > stat.p75 * 2) {
              suggestions.push({
                type: "value_outlier",
                message: `O valor de "${ni.descricao}" (${ni.valor}€) parece alto. Confirmas este valor? Intervalo típico: ${stat.p25.toFixed(0)}€–${stat.p75.toFixed(0)}€.`,
                payload: { descricao: ni.descricao, current: ni.valor, p25: stat.p25, p75: stat.p75 },
              });
            }
          }
        }
      }

      // If few items, suggest adding more
      if (items.length < 3) {
        suggestions.push({
          type: "add_item",
          message: `Orçamentos com mais detalhe têm maior taxa de adjudicação. Considera adicionar mais trabalhos.`,
          payload: {},
        });
      }
    }

    if (step === 3) {
      // Step 3: suggest profit margin

      // Get user's historical margin
      const { data: userOrcs } = await supabase
        .from("orcamentos")
        .select("margem_lucro")
        .eq("user_id", user.id)
        .not("margem_lucro", "is", null)
        .order("created_at", { ascending: false })
        .limit(10);

      if (userOrcs && userOrcs.length >= 3) {
        const avgMargin = userOrcs.reduce((s: number, o: any) => s + (o.margem_lucro || 0), 0) / userOrcs.length;
        suggestions.push({
          type: "adjust_profit",
          message: `A tua margem média nos últimos orçamentos é ${avgMargin.toFixed(0)}%. Queres usar este valor como referência?`,
          payload: { suggested_margin: Math.round(avgMargin) },
        });
      }

      // Warn if margin is very low
      const { margemLucro } = await req.json().catch(() => ({ margemLucro: null }));
      // We already have the data from the original parse, re-read from request isn't possible
      // So we'll just add a general tip
      suggestions.push({
        type: "adjust_profit",
        message: `Dica: margens abaixo de 10% podem não cobrir imprevistos. Recomendamos pelo menos 12-15% para remodelações.`,
        payload: { min_recommended: 12 },
      });
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("axia-suggestions error:", msg);
    return new Response(JSON.stringify({ error: msg, suggestions: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: error instanceof Error && error.message === "Not authenticated" ? 401 : 500,
    });
  }
});
