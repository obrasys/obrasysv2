// Axia — Análise contextual de Orçamento & RAI da Obra (Fase 8)
// Recebe a consolidação atual da obra e devolve insights, riscos e recomendações.
// Sem alterar valores. Sem PII no prompt.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { rateLimitOrg } from "../_shared/rateLimitOrg.ts";


interface ConsolidationInput {
  obraId: string;
  currentPhase: "budget" | "forecast" | "outturn" | "aftercare";
  phases: Array<{
    phase: string;
    label: string;
    status: string;
    rai: number;
    margin: number;
    marginPct: number;
    vendas: number;
    custos: number;
  }>;
  kpis: {
    vendas: number;
    custos: number;
    margemValor: number;
    margemPct: number;
    rai: number;
    desvioBudget: number;
    impactoMce: number;
    custosSpv: number;
    raiComSpv: number;
  };
  attention?: Array<{ severity: string; title: string }>;
}

interface AxiaInsight {
  level: "info" | "warning" | "critical";
  title: string;
  message: string;
  category: "rai" | "margem" | "desvio" | "mce" | "fluxo" | "pos_venda";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth obrigatória
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: uErr } = await supabase.auth.getUser();
    if (uErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const limited = await rateLimitOrg(userData.user.id, {
      module: "orcamento_rai", windowSeconds: 60, maxCalls: 5, corsHeaders,
    });
    if (limited) return limited;


    const body = (await req.json().catch(() => null)) as
      | { consolidation?: ConsolidationInput }
      | null;
    if (!body?.consolidation?.obraId) {
      return new Response(JSON.stringify({ error: "Consolidação inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const c = body.consolidation;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Fallback heurístico, sem IA
      const insights = heuristicInsights(c);
      return new Response(JSON.stringify({ insights, source: "heuristic" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `És a Axia, copiloto financeiro do Obra Sys. Analisas a consolidação Orçamento & RAI de UMA obra e devolves entre 3 e 6 insights curtos, accionáveis e em português europeu. NUNCA inventes valores. NUNCA recomendes nada absoluto (usa "considere", "avalie", "verifique"). Foca em desvios, margem, risco de RAI e pós-venda. Responde APENAS JSON válido no formato {"insights":[{"level":"info|warning|critical","title":"...","message":"...","category":"rai|margem|desvio|mce|fluxo|pos_venda"}]}.`;

    const userPrompt = `Fase atual: ${c.currentPhase}\nKPIs: ${JSON.stringify(c.kpis)}\nFases: ${JSON.stringify(c.phases)}\nAlertas existentes: ${JSON.stringify(c.attention ?? [])}`;

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
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("Lovable AI error", resp.status, txt);
      const insights = heuristicInsights(c);
      return new Response(JSON.stringify({ insights, source: "heuristic_fallback" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { insights?: AxiaInsight[] } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { insights: heuristicInsights(c) };
    }

    return new Response(
      JSON.stringify({ insights: parsed.insights ?? heuristicInsights(c), source: "axia" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("orcamento-rai-axia error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function heuristicInsights(c: ConsolidationInput): AxiaInsight[] {
  const out: AxiaInsight[] = [];
  if (c.kpis.margemPct < 5) {
    out.push({
      level: "critical",
      title: "Margem muito baixa",
      message: `Margem atual em ${c.kpis.margemPct.toFixed(1)}%. Avalie revisão de preços ou redução de custos diretos.`,
      category: "margem",
    });
  } else if (c.kpis.margemPct < 12) {
    out.push({
      level: "warning",
      title: "Margem abaixo do alvo",
      message: `Margem em ${c.kpis.margemPct.toFixed(1)}%. Considere acompanhar de perto custos e MCEs.`,
      category: "margem",
    });
  }
  if (c.kpis.desvioBudget < 0) {
    out.push({
      level: Math.abs(c.kpis.desvioBudget) > Math.abs(c.kpis.rai) * 0.1 ? "critical" : "warning",
      title: "Desvio negativo face ao Budget",
      message: `RAI ${c.kpis.desvioBudget.toFixed(0)} € abaixo do bloqueado. Verifique MCEs e compras recentes.`,
      category: "desvio",
    });
  }
  if (c.currentPhase === "aftercare" && c.kpis.custosSpv > 0) {
    out.push({
      level: "info",
      title: "Pós-venda em curso",
      message: `Custos SPV acumulam ${c.kpis.custosSpv.toFixed(0)} €. Considere encerrar reclamações abertas há mais tempo.`,
      category: "pos_venda",
    });
  }
  if (out.length === 0) {
    out.push({
      level: "info",
      title: "Sem desvios relevantes",
      message: "A obra mantém-se alinhada com o RAI previsto. Continue a registar MCEs e autos para conservar a precisão.",
      category: "rai",
    });
  }
  return out;
}
