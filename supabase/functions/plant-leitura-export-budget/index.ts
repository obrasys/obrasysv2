import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = await req.json();
    const { plant_file_id, obra_id, target, budget_id, budget_name, cliente_id } = body || {};
    if (!plant_file_id || !obra_id || !target) {
      return new Response(JSON.stringify({ error: "Parâmetros obrigatórios em falta." }), { status: 400, headers: corsHeaders });
    }

    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub as string;

    const { data: pf, error: pfErr } = await supabase.from("plant_files").select("*").eq("id", plant_file_id).maybeSingle();
    if (pfErr || !pf) return new Response(JSON.stringify({ error: "Sem acesso a este ficheiro." }), { status: 403, headers: corsHeaders });

    const { data: approved } = await service.from("plant_elements")
      .select("*")
      .eq("plant_file_id", plant_file_id)
      .eq("status", "approved");
    const items = (approved as any[]) || [];
    if (items.length === 0) {
      return new Response(JSON.stringify({ error: "Não há itens aprovados para enviar." }), { status: 400, headers: corsHeaders });
    }

    // Resolve target budget
    let targetBudgetId = budget_id;
    if (target === "new") {
      const { data: novo, error: nErr } = await service.from("orcamentos").insert({
        organization_id: pf.organization_id,
        obra_id,
        cliente_id: cliente_id || null,
        nome: budget_name || `Orçamento Planta — ${pf.file_name}`,
        estado: "rascunho",
        created_by: userId,
      }).select().single();
      if (nErr) throw nErr;
      targetBudgetId = (novo as any).id;
    }
    if (!targetBudgetId) {
      return new Response(JSON.stringify({ error: "Orçamento de destino inválido." }), { status: 400, headers: corsHeaders });
    }

    // Group by suggested chapter
    const groups = new Map<string, any[]>();
    for (const it of items) {
      const cap = it.budget_chapter_suggestion || it.category || "Outros";
      if (!groups.has(cap)) groups.set(cap, []);
      groups.get(cap)!.push(it);
    }

    // Existing chapters
    const { data: existingChaps } = await service.from("capitulos_orcamento")
      .select("id, nome, ordem")
      .eq("orcamento_id", targetBudgetId);
    const existingByName = new Map<string, any>();
    for (const c of (existingChaps || []) as any[]) existingByName.set((c.nome || "").trim().toLowerCase(), c);
    let nextOrdem = (existingChaps || []).reduce((m: number, c: any) => Math.max(m, c.ordem || 0), 0);

    let totalCreated = 0;
    for (const [capName, list] of groups) {
      let chap = existingByName.get(capName.trim().toLowerCase());
      if (!chap) {
        nextOrdem++;
        const { data: novoCap } = await service.from("capitulos_orcamento").insert({
          orcamento_id: targetBudgetId, nome: capName, ordem: nextOrdem,
        }).select().single();
        chap = novoCap as any;
        existingByName.set(capName.trim().toLowerCase(), chap);
      }

      const rows = list.map((el: any, i: number) => ({
        orcamento_id: targetBudgetId,
        capitulo_id: chap.id,
        descricao: el.budget_item_suggestion || el.description || el.code || "Item de planta",
        quantidade: el.quantity || 0,
        unidade: el.unit || "un",
        ordem: i + 1,
        plant_source: {
          file_id: pf.id, file_name: pf.file_name,
          sheet_id: el.plant_sheet_id, element_id: el.id,
          code: el.code, confidence: el.confidence,
          approved_by: el.approved_by, approved_at: el.approved_at,
        },
      }));
      const { error: iErr } = await service.from("artigos_orcamento").insert(rows);
      if (!iErr) totalCreated += rows.length;
    }

    // Mark elements as sent
    await service.from("plant_elements")
      .update({ sent_to_budget: true })
      .in("id", items.map((i: any) => i.id));

    await service.from("plant_budget_exports").insert({
      organization_id: pf.organization_id, obra_id, plant_file_id, budget_id: targetBudgetId,
      exported_by: userId, status: "completed", items_exported: totalCreated,
      details_json: { groups: Array.from(groups.keys()) },
    });

    return new Response(JSON.stringify({ ok: true, budget_id: targetBudgetId, items_exported: totalCreated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
