import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveChain } from "../_shared/axia/model-router.ts";
import { AXIA_ANTI_HALLUCINATION_BLOCK, AXIA_GLOBAL_SAFETY_BLOCK } from "../_shared/axia/system-prompts.ts";
import { rateLimitOrg } from "../_shared/rateLimitOrg.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Default rulesets per country and typology ─────────────────────────
const DEFAULT_RULESETS: Record<string, any> = {
  PT: {
    typologies: {
      residencial: {
        essential_chapters: [
          "Estaleiro",
          "Demolições",
          "Movimentação de Terras",
          "Fundações",
          "Estruturas",
          "Alvenarias",
          "Impermeabilizações",
          "Isolamentos",
          "Revestimentos",
          "Pavimentos",
          "Carpintarias",
          "Serralharias",
          "Pinturas",
          "Instalações Elétricas (ITED)",
          "Instalações de Água e Esgotos",
          "Equipamentos Sanitários",
        ],
        essential_items_per_chapter: {
          Impermeabilizações: ["Tela asfáltica", "Membrana líquida"],
          Isolamentos: ["Isolamento térmico", "Isolamento acústico"],
          "Instalações Elétricas (ITED)": ["Quadro elétrico", "Tomadas", "Iluminação"],
        },
      },
      reabilitacao: {
        essential_chapters: [
          "Estaleiro",
          "Demolições",
          "Reforço Estrutural",
          "Impermeabilizações",
          "Isolamentos",
          "Revestimentos",
          "Pinturas",
          "Instalações Elétricas",
          "Instalações Hidráulicas",
          "Restauro",
        ],
        essential_items_per_chapter: {
          "Reforço Estrutural": ["Reforço de vigas", "Injeção de resinas"],
          Impermeabilizações: ["Tratamento de fissuras"],
        },
      },
      comercial: {
        essential_chapters: [
          "Estaleiro",
          "Demolições",
          "Estruturas",
          "Alvenarias",
          "Revestimentos",
          "Pavimentos",
          "Pinturas",
          "Instalações Elétricas",
          "AVAC",
          "Segurança Contra Incêndio",
          "Rede de Dados",
        ],
        essential_items_per_chapter: {
          AVAC: ["Unidade de climatização", "Condutas"],
          "Segurança Contra Incêndio": ["Extintores", "Deteção de incêndio"],
        },
      },
      industrial: {
        essential_chapters: [
          "Estaleiro",
          "Movimentação de Terras",
          "Fundações",
          "Estrutura Metálica",
          "Cobertura",
          "Pavimentos Industriais",
          "Instalações Elétricas",
          "Instalações Mecânicas",
          "Drenagem",
        ],
        essential_items_per_chapter: {
          "Pavimentos Industriais": ["Pavimento em betão polido", "Juntas de dilatação"],
          "Estrutura Metálica": ["Pilares metálicos", "Treliças"],
        },
      },
    },
  },
  ES: {
    typologies: {
      residencial: {
        essential_chapters: [
          "Instalación de Obra",
          "Demoliciones",
          "Movimiento de Tierras",
          "Cimentación",
          "Estructura",
          "Albañilería",
          "Impermeabilización",
          "Aislamiento",
          "Revestimientos",
          "Pavimentos",
          "Carpintería",
          "Cerrajería",
          "Pinturas",
          "Instalaciones Eléctricas",
          "Fontanería y Saneamiento",
        ],
        essential_items_per_chapter: {},
      },
      reabilitacao: { essential_chapters: [], essential_items_per_chapter: {} },
      comercial: { essential_chapters: [], essential_items_per_chapter: {} },
      industrial: { essential_chapters: [], essential_items_per_chapter: {} },
    },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// ── Auth helper ──────────────────────────────────────────────────────
async function authenticateRequest(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims) throw new Error("Invalid token");

  const userId = data.claims.sub as string;
  const limited = await rateLimitOrg(userId, {
    module: "budget_ai", windowSeconds: 60, maxCalls: 5,
    corsHeaders: { "Access-Control-Allow-Origin": "*" },
  });
  if (limited) throw new Response(limited.body, { status: 429, headers: limited.headers });

  return { client, userId };
}

// ── Get or create AI settings ────────────────────────────────────────
async function getOrCreateSettings(client: any, userId: string) {
  const { data } = await client
    .from("company_ai_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (data) return data;

  // Get country from profile
  const { data: profile } = await client
    .from("profiles")
    .select("empresa_pais")
    .eq("user_id", userId)
    .maybeSingle();

  const country = (profile?.empresa_pais || "Portugal").toLowerCase().includes("espan") ? "ES" : "PT";
  const defaultRuleset = DEFAULT_RULESETS[country] || DEFAULT_RULESETS.PT;

  const { data: created, error } = await client
    .from("company_ai_settings")
    .insert({
      user_id: userId,
      country,
      ruleset: defaultRuleset,
    })
    .select()
    .single();

  if (error) throw error;
  return created;
}

// ── Budget snapshot helper ───────────────────────────────────────────
function budgetSnapshot(orcamento: any) {
  const capitulos = (orcamento.capitulos || []).map((c: any) => ({
    id: c.id,
    numero: c.numero,
    titulo: c.titulo,
    valor_total: c.valor_total,
    artigos_count: (c.artigos || []).length,
  }));
  return {
    id: orcamento.id,
    valor_total: orcamento.valor_total,
    margem_lucro: orcamento.margem_lucro,
    capitulos,
    total_artigos: capitulos.reduce((s: number, c: any) => s + c.artigos_count, 0),
  };
}

// ── RULE A: Missing sections ─────────────────────────────────────────
function checkMissingSections(orcamento: any, settings: any): any[] {
  const findings: any[] = [];
  const ruleset = settings.ruleset;
  if (!ruleset?.typologies) return findings;

  const currentChapters = (orcamento.capitulos || []).map((c: any) => normalize(c.titulo));

  // Check all typologies (we don't know which one this budget is for, so flag across all)
  for (const [typo, config] of Object.entries(ruleset.typologies) as any[]) {
    const essentials = config.essential_chapters || [];
    for (const chapter of essentials) {
      const normChapter = normalize(chapter);
      const found = currentChapters.some(
        (cc: string) => cc.includes(normChapter) || normChapter.includes(cc)
      );
      if (!found) {
        findings.push({
          type: "missing_sections",
          severity: "warn",
          title: `Capítulo em falta: ${chapter}`,
          message: `O capítulo "${chapter}" é essencial para projetos do tipo ${typo} mas não está presente no orçamento.`,
          impact_value: null,
          impact_percent: null,
          payload: { suggested_chapter: chapter, typology: typo },
          content_hash: simpleHash(`ms_${chapter}_${typo}`),
        });
      }
    }
  }

  return findings;
}

// ── RULE B: Missing items per chapter ────────────────────────────────
function checkMissingItems(orcamento: any, settings: any): any[] {
  const findings: any[] = [];
  const ruleset = settings.ruleset;
  if (!ruleset?.typologies) return findings;

  const capitulos = orcamento.capitulos || [];

  for (const [_typo, config] of Object.entries(ruleset.typologies) as any[]) {
    const essentialItems = config.essential_items_per_chapter || {};
    for (const [chapterName, items] of Object.entries(essentialItems) as any[]) {
      const normChapter = normalize(chapterName);
      const matchedCap = capitulos.find(
        (c: any) => normalize(c.titulo).includes(normChapter) || normChapter.includes(normalize(c.titulo))
      );
      if (!matchedCap) continue;

      const artigos = matchedCap.artigos || [];
      const artigoDescs = artigos.map((a: any) => normalize(a.descricao));

      for (const item of items) {
        const normItem = normalize(item);
        const found = artigoDescs.some(
          (d: string) => d.includes(normItem) || normItem.includes(d)
        );
        if (!found) {
          findings.push({
            type: "missing_items",
            severity: "info",
            title: `Item em falta: ${item}`,
            message: `O item "${item}" é recomendado no capítulo "${matchedCap.titulo}" mas não foi encontrado.`,
            impact_value: null,
            impact_percent: null,
            payload: { chapter_id: matchedCap.id, chapter_title: matchedCap.titulo, suggested_item: item },
            content_hash: simpleHash(`mi_${item}_${matchedCap.id}`),
          });
        }
      }
    }
  }

  return findings;
}

// ── RULE C: Low margin ───────────────────────────────────────────────
function checkLowMargin(orcamento: any, settings: any): any[] {
  const findings: any[] = [];
  const minMargin = settings.min_margin_percent || 15;
  const currentMargin = orcamento.margem_lucro || 0;

  if (currentMargin < minMargin) {
    findings.push({
      type: "low_margin",
      severity: "critical",
      title: `Margem abaixo do mínimo (${currentMargin}%)`,
      message: `A margem de lucro atual (${currentMargin}%) está abaixo do mínimo configurado (${minMargin}%). Considere ajustar os preços.`,
      impact_percent: minMargin - currentMargin,
      impact_value: null,
      payload: { current_margin: currentMargin, min_margin: minMargin },
      content_hash: simpleHash(`lm_${currentMargin}_${minMargin}`),
    });
  }

  return findings;
}

// ── RULE D: Outlier prices ───────────────────────────────────────────
function checkOutlierPrices(orcamento: any, priceStats: any[], settings: any): any[] {
  const findings: any[] = [];
  const zscore = settings.outlier_zscore || 2.5;

  const capitulos = orcamento.capitulos || [];
  for (const cap of capitulos) {
    for (const art of cap.artigos || []) {
      if (!art.preco_unitario || art.preco_unitario <= 0) continue;

      // Find matching stats by unit
      const stats = priceStats.find((s: any) => s.unidade === art.unidade);
      if (!stats || !stats.stddev_price || stats.stddev_price === 0) continue;

      const deviation = Math.abs(art.preco_unitario - stats.avg_price) / stats.stddev_price;
      if (deviation > zscore) {
        const direction = art.preco_unitario > stats.avg_price ? "acima" : "abaixo";
        const diff = Math.abs(art.preco_unitario - stats.avg_price);

        findings.push({
          type: "outlier_prices",
          severity: "warn",
          title: `Preço fora do padrão: ${art.descricao.substring(0, 40)}`,
          message: `O preço unitário (${art.preco_unitario}€) está ${direction} da média histórica (${stats.avg_price}€) por ${diff.toFixed(2)}€.`,
          impact_value: diff * art.quantidade,
          impact_percent: null,
          payload: {
            artigo_id: art.id,
            capitulo_id: cap.id,
            current_price: art.preco_unitario,
            avg_price: stats.avg_price,
            median_price: stats.median_price,
            stddev: stats.stddev_price,
            deviation_zscore: Math.round(deviation * 100) / 100,
          },
          content_hash: simpleHash(`op_${art.id}`),
        });
      }
    }
  }

  return findings;
}

// ── runBudgetRules ───────────────────────────────────────────────────
async function runBudgetRules(client: any, userId: string, budgetId: string) {
  // Verify budget access (RLS handles org-level permissions)
  const { data: orcamento, error: orcError } = await client
    .from("orcamentos")
    .select(`
      *,
      capitulos:capitulos_orcamento(
        *,
        artigos:artigos_orcamento(*)
      )
    `)
    .eq("id", budgetId)
    .single();

  if (orcError) {
    console.error("runBudgetRules query error:", orcError, "budgetId:", budgetId, "userId:", userId);
  }
  if (orcError || !orcamento) throw new Error("Orçamento não encontrado ou acesso negado");

  const settings = await getOrCreateSettings(client, userId);
  if (!settings.enabled) return { insights: [], message: "IA desativada" };

  // Get historical price stats
  const { data: priceStats } = await client.rpc("get_price_stats", { p_user_id: userId });

  // Run deterministic rules
  const allFindings = [
    ...checkMissingSections(orcamento, settings),
    ...checkMissingItems(orcamento, settings),
    ...checkLowMargin(orcamento, settings),
    ...checkOutlierPrices(orcamento, priceStats || [], settings),
  ];

  // Upsert insights (dedup by content_hash)
  for (const finding of allFindings) {
    const { error: upsertError } = await client
      .from("ai_budget_insights")
      .upsert(
        {
          user_id: userId,
          budget_id: budgetId,
          ...finding,
        },
        { onConflict: "budget_id,type,content_hash", ignoreDuplicates: false }
      );

    if (upsertError) {
      console.error("Upsert error:", upsertError);
    }
  }

  return { findings: allFindings, settings, orcamento };
}

// ── aiBudgetAssist (LLM layer) ──────────────────────────────────────
async function aiBudgetAssist(
  client: any,
  userId: string,
  budgetId: string,
  findings: any[],
  orcamento: any,
  settings: any
) {
  if (!settings.llm_enabled) return [];

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY not configured");
    return [];
  }

  // Build compact context
  const capitulos = (orcamento.capitulos || []).map((c: any) => ({
    titulo: c.titulo,
    valor: c.valor_total,
    artigos: (c.artigos || []).length,
  }));

  const prompt = `Analisa este orçamento e sugere melhorias ADICIONAIS, sem duplicar findings já detectados, sem inventar preços, marcas ou normas.

ORÇAMENTO: ${orcamento.titulo}
VALOR TOTAL: ${orcamento.valor_total}€
MARGEM: ${orcamento.margem_lucro}%
PAÍS: ${settings.country}
CAPÍTULOS: ${JSON.stringify(capitulos)}

PROBLEMAS JÁ DETECTADOS (${findings.length}):
${findings.slice(0, 10).map((f: any) => `- [${f.severity}] ${f.title}`).join("\n")}

Regras:
- Sugestões devem basear-se APENAS no orçamento e nos findings fornecidos.
- NÃO criar novos artigos com preços inventados. Se sugerires artigos em falta, fá-lo como sugestão QUALITATIVA (sem preço), com review_required=true e auto_apply_allowed=false.
- Usa a tool 'suggest_insights' para devolver JSON estruturado.`;

  try {
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: resolveChain("budget_validation").primary,
        messages: [
          {
            role: "system",
            content:
              "És a Axia™, assistente de orçamentação de construção civil. Responde em Português de Portugal. Devolves sugestões práticas baseadas APENAS nos dados fornecidos. Nunca inventas preços, marcas, normas ou fornecedores.\n\n" + AXIA_ANTI_HALLUCINATION_BLOCK + "\n\n" + AXIA_GLOBAL_SAFETY_BLOCK,
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_insights",
              description: "Retorna sugestões de melhoria adicionais para o orçamento",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: {
                          type: "string",
                          enum: ["missing_sections", "missing_items", "outlier_prices", "low_margin", "parametric_suggestion"],
                        },
                        severity: { type: "string", enum: ["info", "warn", "critical"] },
                        title: { type: "string" },
                        message: { type: "string" },
                        impact_value: { type: "number" },
                        payload: { type: "object" },
                      },
                      required: ["type", "severity", "title", "message"],
                    },
                  },
                },
                required: ["insights"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_insights" } },
      }),
    });

    if (!aiResponse.ok) {
      console.error("LLM error:", aiResponse.status);
      return [];
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return [];

    const result = JSON.parse(toolCall.function.arguments);
    const llmInsights = (result.insights || []).slice(0, 5);

    // Persist LLM insights
    for (const insight of llmInsights) {
      const hash = simpleHash(`llm_${insight.title}`);
      await client.from("ai_budget_insights").upsert(
        {
          user_id: userId,
          budget_id: budgetId,
          type: insight.type || "parametric_suggestion",
          severity: insight.severity || "info",
          title: insight.title,
          message: insight.message,
          impact_value: insight.impact_value || null,
          impact_percent: insight.impact_percent || null,
          payload: insight.payload || {},
          status: "open",
          content_hash: hash,
        },
        { onConflict: "budget_id,type,content_hash", ignoreDuplicates: true }
      );
    }

    return llmInsights;
  } catch (err) {
    console.error("LLM error:", err);
    return [];
  }
}

// ── applyInsight ─────────────────────────────────────────────────────
async function applyInsight(client: any, userId: string, insightId: string) {
  // Get the insight
  const { data: insight, error: insightError } = await client
    .from("ai_budget_insights")
    .select("*")
    .eq("id", insightId)
    .eq("user_id", userId)
    .single();

  if (insightError || !insight) throw new Error("Insight não encontrado");
  if (insight.status !== "open") throw new Error("Insight já foi processado");

  // Get budget with chapters for snapshot
  const { data: orcamento } = await client
    .from("orcamentos")
    .select(`*, capitulos:capitulos_orcamento(*, artigos:artigos_orcamento(*))`)
    .eq("id", insight.budget_id)
    .eq("user_id", userId)
    .single();

  if (!orcamento) throw new Error("Orçamento não encontrado");

  const beforeSnap = budgetSnapshot(orcamento);
  const payload = insight.payload || {};
  let applied = false;

  // Apply based on type
  if (insight.type === "missing_sections" && payload.suggested_chapter) {
    const nextNumero = (orcamento.capitulos || []).length + 1;
    const { error } = await client.from("capitulos_orcamento").insert({
      orcamento_id: insight.budget_id,
      numero: nextNumero,
      titulo: payload.suggested_chapter,
      ordem: nextNumero,
    });
    if (!error) applied = true;
  } else if (insight.type === "missing_items" && payload.chapter_id && payload.suggested_item) {
    // Look up price from base_precos or default
    const { data: basePrice } = await client
      .from("base_precos_personalizada")
      .select("*")
      .eq("user_id", userId)
      .ilike("descricao", `%${payload.suggested_item}%`)
      .limit(1)
      .maybeSingle();

    const precoUnit = basePrice?.preco_unitario || 0;
    const unidade = basePrice?.unidade || "un";

    const nextOrdem = ((orcamento.capitulos || [])
      .find((c: any) => c.id === payload.chapter_id)?.artigos || []).length + 1;

    const { error } = await client.from("artigos_orcamento").insert({
      capitulo_id: payload.chapter_id,
      descricao: payload.suggested_item,
      unidade,
      quantidade: 1,
      preco_unitario: precoUnit,
      preco_base: precoUnit,
      margem_lucro_artigo: 0,
      ordem: nextOrdem,
    });
    if (!error) applied = true;
  }
  // For low_margin and outlier_prices, we just mark as applied (user adjusts manually)
  else {
    applied = true;
  }

  if (applied) {
    // Mark insight as applied
    await client
      .from("ai_budget_insights")
      .update({ status: "applied" })
      .eq("id", insightId);

    // Get after snapshot
    const { data: afterOrc } = await client
      .from("orcamentos")
      .select(`*, capitulos:capitulos_orcamento(*, artigos:artigos_orcamento(*))`)
      .eq("id", insight.budget_id)
      .single();

    const afterSnap = afterOrc ? budgetSnapshot(afterOrc) : beforeSnap;

    // Log action
    await client.from("ai_budget_actions_log").insert({
      user_id: userId,
      budget_id: insight.budget_id,
      insight_id: insightId,
      action: "applied",
      before_snapshot: beforeSnap,
      after_snapshot: afterSnap,
      actor_user_id: userId,
    });
  }

  return { applied };
}

// ── dismissInsight ───────────────────────────────────────────────────
async function dismissInsight(client: any, userId: string, insightId: string) {
  const { data: insight } = await client
    .from("ai_budget_insights")
    .select("*")
    .eq("id", insightId)
    .eq("user_id", userId)
    .single();

  if (!insight) throw new Error("Insight não encontrado");

  await client
    .from("ai_budget_insights")
    .update({ status: "dismissed" })
    .eq("id", insightId);

  await client.from("ai_budget_actions_log").insert({
    user_id: userId,
    budget_id: insight.budget_id,
    insight_id: insightId,
    action: "dismissed",
    before_snapshot: null,
    after_snapshot: null,
    actor_user_id: userId,
  });

  return { dismissed: true };
}

// ── Main handler ─────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client, userId } = await authenticateRequest(req);
    const body = await req.json();
    const { action, budgetId, insightId } = body;

    let result: any;

    switch (action) {
      case "runBudgetRules": {
        if (!budgetId) throw new Error("budgetId é obrigatório");
        const rulesResult = await runBudgetRules(client, userId, budgetId);

        // Optionally run LLM if enabled
        let llmInsights: any[] = [];
        if (rulesResult.settings?.llm_enabled) {
          llmInsights = await aiBudgetAssist(
            client,
            userId,
            budgetId,
            rulesResult.findings ?? [],
            rulesResult.orcamento,
            rulesResult.settings
          );
        }

        // Fetch all open insights for this budget
        const { data: allInsights } = await client
          .from("ai_budget_insights")
          .select("*")
          .eq("budget_id", budgetId)
          .order("severity", { ascending: true })
          .order("created_at", { ascending: false });

        result = {
          insights: allInsights || [],
          deterministic_count: rulesResult.findings?.length ?? 0,
          llm_count: llmInsights.length,
        };
        break;
      }

      case "applyInsight": {
        if (!insightId) throw new Error("insightId é obrigatório");
        result = await applyInsight(client, userId, insightId);
        break;
      }

      case "dismissInsight": {
        if (!insightId) throw new Error("insightId é obrigatório");
        result = await dismissInsight(client, userId, insightId);
        break;
      }

      case "getInsights": {
        if (!budgetId) throw new Error("budgetId é obrigatório");
        // Verify access (RLS handles org-level permissions)
        const { data: orc, error: orcCheckError } = await client
          .from("orcamentos")
          .select("id")
          .eq("id", budgetId)
          .maybeSingle();
        
        // If budget not found (RLS filtered or doesn't exist), return empty instead of throwing
        if (!orc) {
          console.log("getInsights: budget not accessible or not found:", budgetId, "error:", orcCheckError);
          result = { insights: [] };
          break;
        }

        const { data: insights } = await client
          .from("ai_budget_insights")
          .select("*")
          .eq("budget_id", budgetId)
          .order("severity", { ascending: true })
          .order("created_at", { ascending: false });

        result = { insights: insights || [] };
        break;
      }

      case "getSettings": {
        result = await getOrCreateSettings(client, userId);
        break;
      }

      case "updateSettings": {
        const { settings: newSettings } = body;
        if (!newSettings) throw new Error("settings é obrigatório");

        const { data, error } = await client
          .from("company_ai_settings")
          .update({
            enabled: newSettings.enabled,
            llm_enabled: newSettings.llm_enabled,
            contextual_assistant_enabled: newSettings.contextual_assistant_enabled,
            min_margin_percent: newSettings.min_margin_percent,
            outlier_zscore: newSettings.outlier_zscore,
            country: newSettings.country,
          })
          .eq("user_id", userId)
          .select()
          .single();

        if (error) throw error;
        result = data;
        break;
      }

      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("budget-ai-engine error:", error);
    const status = error instanceof Error && error.message.includes("Unauthorized") ? 401 : 400;
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
