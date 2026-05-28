// Axia Budget Insights - analisa orçamento (Base vs Target vs Adjudicado vs Comprado)
// e gera insights proativos via Lovable AI.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { resolveChain } from "../_shared/axia/model-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Insight {
  type: "deviation" | "risk" | "opportunity" | "info";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  metric?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { orcamentoId } = await req.json();
    if (!orcamentoId) {
      return new Response(JSON.stringify({ error: "orcamentoId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar versão Target ativa (RLS aplica-se)
    const { data: versions, error: vErr } = await supabase
      .from("budget_versions")
      .select("*")
      .eq("source_budget_id", orcamentoId)
      .order("created_at", { ascending: true });
    if (vErr) throw vErr;

    const baseV = versions?.find((v: any) => v.version_type === "base_dry");
    const activeTarget = versions?.find(
      (v: any) => v.version_type === "target" && v.status === "active",
    );
    if (!activeTarget) {
      return new Response(
        JSON.stringify({ insights: [], summary: "Sem Budget Objetivo ativo." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: items, error: iErr } = await supabase
      .from("budget_version_items")
      .select("*")
      .eq("budget_version_id", activeTarget.id);
    if (iErr) throw iErr;

    // ── Cálculos determinísticos (sem IA) ──
    const totals = (items ?? []).reduce(
      (acc: any, it: any) => {
        acc.base += Number(it.base_total) || 0;
        acc.target += Number(it.target_total) || 0;
        acc.awarded += Number(it.awarded_amount) || 0;
        acc.purchased += Number(it.purchased_amount) || 0;
        return acc;
      },
      { base: 0, target: 0, awarded: 0, purchased: 0 },
    );
    const variance = totals.target - totals.base;
    const variancePct = totals.base > 0 ? (variance / totals.base) * 100 : 0;
    const consumedPct = totals.target > 0
      ? ((totals.awarded + totals.purchased) / totals.target) * 100
      : 0;

    const insights: Insight[] = [];

    if (Math.abs(variancePct) >= 5) {
      insights.push({
        type: variancePct > 0 ? "deviation" : "opportunity",
        severity: Math.abs(variancePct) >= 15 ? "high" : "medium",
        title: variancePct > 0
          ? `Budget Objetivo ${variancePct.toFixed(1)}% acima do Base`
          : `Budget Objetivo ${Math.abs(variancePct).toFixed(1)}% abaixo do Base`,
        description: variancePct > 0
          ? "Há erosão de margem face ao orçamento aprovado. Reveja itens com maior desvio."
          : "Há margem positiva face ao orçamento aprovado. Pode haver oportunidade de absorver imprevistos.",
        metric: `Δ ${variance.toFixed(2)} €`,
      });
    }

    // Top 3 itens com maior desvio absoluto
    const ranked = [...(items ?? [])]
      .map((it: any) => ({
        ...it,
        delta: (Number(it.target_total) || 0) - (Number(it.base_total) || 0),
      }))
      .filter((it: any) => Math.abs(it.delta) > 0)
      .sort((a: any, b: any) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 3);

    const overPurchased = (items ?? []).filter(
      (it: any) =>
        Number(it.purchased_amount) > Number(it.target_total) &&
        Number(it.target_total) > 0,
    );
    if (overPurchased.length > 0) {
      insights.push({
        type: "risk",
        severity: "high",
        title: `${overPurchased.length} item(s) com compras acima do alvo`,
        description:
          "Alguns itens já têm compras superiores ao valor planeado no Budget Objetivo. Reveja o planeamento.",
      });
    }

    if (consumedPct >= 80 && variancePct >= 0) {
      insights.push({
        type: "info",
        severity: "medium",
        title: `${consumedPct.toFixed(0)}% do Budget Objetivo consumido`,
        description: "Avalie geração da Folha de Fecho Final quando a obra estiver concluída.",
      });
    }

    // ── Narrativa via Lovable AI (curta) ──
    let summary = "";
    try {
      const prompt = `Resume em 2-3 frases curtas, em português europeu, o estado financeiro deste orçamento de obra. Tom profissional e direto, sem emojis. Dados:
- Total Base: ${totals.base.toFixed(2)} €
- Total Target: ${totals.target.toFixed(2)} € (desvio ${variancePct.toFixed(1)}%)
- Total Adjudicado: ${totals.awarded.toFixed(2)} €
- Total Comprado: ${totals.purchased.toFixed(2)} €
- Itens com maior desvio: ${ranked.map((r: any) => `${r.description} (Δ ${r.delta.toFixed(0)} €)`).join("; ") || "nenhum"}`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: resolveChain("suggestions").primary,
          messages: [
            {
              role: "system",
              content:
                "És o Axia, assistente contextual do Obra Sys. Nunca dês opiniões absolutas. Sem PII. Sem emojis. Português europeu.",
            },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (aiResp.status === 429) {
        summary = "Limite temporário de IA atingido. Tente novamente em instantes.";
      } else if (aiResp.status === 402) {
        summary = "Créditos de IA esgotados. Adicione créditos no workspace.";
      } else if (aiResp.ok) {
        const data = await aiResp.json();
        summary = data.choices?.[0]?.message?.content?.trim() ?? "";
      }
    } catch (e) {
      console.error("AI summary failed:", e);
    }

    return new Response(
      JSON.stringify({
        summary,
        insights,
        totals: { ...totals, variance, variancePct, consumedPct },
        topDeviations: ranked.map((r: any) => ({
          id: r.id,
          description: r.description,
          chapter: r.chapter_name,
          delta: r.delta,
          base_total: r.base_total,
          target_total: r.target_total,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("axia-budget-insights error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
