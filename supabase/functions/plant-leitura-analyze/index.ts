import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu és a Axia, motor de leitura assistida de plantas de construção civil em Portugal.
Analisa esta folha de planta como técnico de orçamentação. Primeiro identifica o tipo de folha, escala, piso e disciplina. Depois extrai apenas os elementos visíveis ou textualmente identificáveis. Para cada elemento, informa quantidade, unidade, descrição, categoria, piso, folha, confiança e coordenadas aproximadas (bbox normalizado 0-1). Não inventes dados. Quando algo for inferido, marca como status="proposed" e validation_required=true. Se a confiança for inferior a 0.85, marca como status="review". Devolve APENAS JSON válido conforme o schema.

Schema esperado:
{
 "sheet": {"sheet_index":N,"sheet_name":"","discipline":"Arquitetura|Estrutura|Fundações|Instalações elétricas|Instalações hidráulicas|Cortes|Alçados|Cobertura|Outro","floor_level":"","scale":"1:100","confidence":0.0-1.0,"needs_review":bool},
 "elements":[{"code":"S.01","category":"Sapatas","description":"","quantity":0,"unit":"un|m|m2|m3","dimensions":{},"coordinates":{"x":0,"y":0,"w":0,"h":0},"source_text":"","confidence":0.0-1.0,"status":"ok|review|proposed","read_method":"direct_text|visual_detection|calculated|inferred","validation_required":bool,"budget_chapter_suggestion":"","budget_item_suggestion":"","notes":""}],
 "warnings":[],
 "suggestions":[]
}
Categorias válidas: Paredes, Paredes ICF, Vigas, Pilares, Lajes, Sapatas, Fundações, Muros, Vãos, Portas, Janelas, Escadas, Áreas, Compartimentos, Instalações elétricas, Instalações hidráulicas, Cobertura, Outros.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    const { plant_sheet_id } = await req.json();
    if (!plant_sheet_id || typeof plant_sheet_id !== "string") {
      return new Response(JSON.stringify({ error: "plant_sheet_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get sheet via RLS to ensure caller has access
    const { data: sheet, error: sErr } = await supabase
      .from("plant_sheets")
      .select("*")
      .eq("id", plant_sheet_id)
      .maybeSingle();
    if (sErr || !sheet) {
      return new Response(JSON.stringify({ error: "Sem acesso a esta folha." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!sheet.image_path) {
      return new Response(JSON.stringify({ error: "Folha sem imagem (DXF não suportado nesta fase)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await service.from("plant_sheets").update({ status: "processing", error_message: null }).eq("id", plant_sheet_id);
    await service.from("plant_processing_logs").insert({
      organization_id: sheet.organization_id,
      obra_id: sheet.obra_id,
      plant_file_id: sheet.plant_file_id,
      plant_sheet_id: sheet.id,
      step: "axia_analyze",
      status: "started",
      message: `Folha ${sheet.sheet_index}`,
    });

    // Download image as base64
    const { data: imgBlob, error: dlErr } = await service.storage.from("plant-files").download(sheet.image_path);
    if (dlErr || !imgBlob) throw new Error("Não foi possível ler a imagem da folha.");
    const buf = new Uint8Array(await imgBlob.arrayBuffer());
    let binary = "";
    for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
    const b64 = btoa(binary);
    const mime = sheet.image_path.toLowerCase().endsWith(".jpg") || sheet.image_path.toLowerCase().endsWith(".jpeg") ? "image/jpeg" : "image/png";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI Gateway não configurado." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: `Folha índice ${sheet.sheet_index}. Devolve APENAS JSON conforme o schema.` },
              { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
            ],
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      await service.from("plant_sheets").update({ status: "error", error_message: `AI ${aiRes.status}` }).eq("id", plant_sheet_id);
      await service.from("plant_processing_logs").insert({
        organization_id: sheet.organization_id, obra_id: sheet.obra_id, plant_file_id: sheet.plant_file_id,
        plant_sheet_id: sheet.id, step: "axia_analyze", status: "error", message: `AI ${aiRes.status}: ${txt.slice(0,400)}`,
      });
      return new Response(JSON.stringify({ error: `AI error ${aiRes.status}`, detail: txt.slice(0,500) }), {
        status: aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try {
      parsed = typeof content === "string" ? JSON.parse(content) : content;
    } catch {
      parsed = { sheet: {}, elements: [], warnings: ["JSON inválido devolvido pela Axia"], suggestions: [] };
    }

    const sheetUpdate: any = { status: "ready" };
    if (parsed.sheet) {
      const s = parsed.sheet;
      if (s.sheet_name) sheetUpdate.sheet_name = s.sheet_name;
      if (s.discipline) sheetUpdate.discipline = s.discipline;
      if (s.floor_level) sheetUpdate.floor_level = s.floor_level;
      if (s.scale) sheetUpdate.scale = s.scale;
      if (typeof s.confidence === "number") sheetUpdate.confidence = s.confidence;
      sheetUpdate.needs_review = !!s.needs_review;
      if (typeof s.confidence === "number" && s.confidence < 0.7) sheetUpdate.status = "low_confidence";
    }

    // Remove previous AI-only elements not yet approved/edited/ignored
    await service.from("plant_elements")
      .delete()
      .eq("plant_sheet_id", plant_sheet_id)
      .in("status", ["ok", "review", "proposed", "error"]);

    const els = Array.isArray(parsed.elements) ? parsed.elements : [];
    const rows = els.map((e: any) => {
      const conf = typeof e.confidence === "number" ? e.confidence : null;
      let status = e.status || "ok";
      if (status !== "proposed" && conf !== null && conf < 0.85) status = "review";
      return {
        plant_file_id: sheet.plant_file_id,
        plant_sheet_id: sheet.id,
        organization_id: sheet.organization_id,
        obra_id: sheet.obra_id,
        code: e.code || null,
        category: e.category || null,
        description: e.description || null,
        quantity: typeof e.quantity === "number" ? e.quantity : null,
        unit: e.unit || null,
        dimensions_json: e.dimensions || null,
        coordinates_json: e.coordinates || null,
        source_text: e.source_text || null,
        confidence: conf,
        status,
        read_method: e.read_method || null,
        validation_required: !!e.validation_required || status === "proposed",
        budget_chapter_suggestion: e.budget_chapter_suggestion || null,
        budget_item_suggestion: e.budget_item_suggestion || null,
        notes: e.notes || null,
      };
    });
    if (rows.length) await service.from("plant_elements").insert(rows);

    await service.from("plant_sheets").update(sheetUpdate).eq("id", plant_sheet_id);
    await service.from("plant_processing_logs").insert({
      organization_id: sheet.organization_id, obra_id: sheet.obra_id, plant_file_id: sheet.plant_file_id,
      plant_sheet_id: sheet.id, step: "axia_analyze", status: "ok",
      message: `${rows.length} elementos extraídos`,
      details_json: { warnings: parsed.warnings || [], suggestions: parsed.suggestions || [] },
    });

    return new Response(JSON.stringify({ ok: true, elements: rows.length, sheet: sheetUpdate }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
