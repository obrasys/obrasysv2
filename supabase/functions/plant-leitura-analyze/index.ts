import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VALID_UNITS = ["un", "m", "m2", "m3", "ml"];
const VALID_CATEGORIES = [
  "Paredes", "Paredes ICF", "Vigas", "Pilares", "Lajes", "Sapatas",
  "Fundações", "Muros", "Vãos", "Portas", "Janelas", "Escadas",
  "Áreas", "Compartimentos", "Instalações elétricas",
  "Instalações hidráulicas", "Cobertura", "Arranjos Exteriores",
  "Piscina", "Outros",
];

const SYSTEM_PROMPT = `Tu és a Axia, motor de leitura assistida de plantas de construção civil em Portugal.

Age como técnico de medição e orçamentação. A tua função é extrair quantitativos úteis para orçamento, sem inventar valores.

Deves separar rigorosamente:
- "elements": tudo o que pode virar item de orçamento;
- "ignored_regions": tudo o que é apenas gráfico, carimbo, texto sem valor orçamentável, terreno irrelevante, sombras, mobiliário ou decoração.

REGRAS GERAIS:
- Devolve apenas JSON válido.
- Nunca devolvas texto fora do JSON.
- Nunca inventes quantitativos.
- Se leres diretamente texto com área, dimensão ou quantidade, usa read_method="direct_text".
- Se identificares visualmente mas não tiveres certeza suficiente, usa status="review" e validation_required=true.
- Se for uma sugestão técnica baseada na planta, usa status="proposed" e validation_required=true.
- Elementos com dúvida devem continuar em "elements", não devem ir para "ignored_regions", desde que possam ser úteis para orçamento.

REGRAS DE IGNORADOS:
Ignora e coloca em "ignored_regions":
- carimbo técnico; título da folha; nome do cliente; autor do projeto; escala; data; norte;
- cotas topográficas; curvas de nível; limites de terreno; árvores e vegetação decorativa;
- mobiliário; sombras; hachuras puramente gráficas; manchas; fundos; símbolos decorativos; textos de rua.

Atenção:
- Nunca cries uma ignored_region grande que cubra o edifício inteiro.
- Uma região ignorada não pode ter mais de 15% da área útil da folha, exceto se for claramente o carimbo ou uma legenda isolada fora da zona da planta.
- Se houver terreno à volta do edifício, ignora apenas as zonas exteriores, sem cobrir o edifício.
- Não coloques compartimentos, paredes, portas, janelas, piscina, pavimentos ou áreas úteis dentro de ignored_regions.

REGRAS DE EXTRAÇÃO:
Extrai obrigatoriamente, quando visível ou legível:
- compartimentos com nome e área (cozinha, sala, quartos, IS, arrumos, circulação, closet, biblioteca, alpendre);
- garagem; piscina; pavimentos exteriores identificados; lugares de estacionamento;
- mapas ou quadros de áreas com valores úteis para orçamento.

Se existirem divisões com texto e área → "elements" com categoria "Compartimentos".
Se existir quadro de áreas com valores técnicos úteis → "elements" com categoria "Áreas" ou "Arranjos Exteriores", deixando claro na descrição que veio de quadro/legenda.

Paredes: só quantificar em metros lineares ou m² se existirem escala calibrada, cotas legíveis ou geometria suficiente. Se a escala existir mas a leitura não permitir medição segura, cria warning e suggestion.
Portas e janelas: se forem visualmente identificáveis, contar como unidades com status="review" quando não for possível confirmar dimensões. Se houver mapa de vãos, usar os dados do mapa.
Estrutura: se a folha for arquitetura, não inventar sapatas, vigas ou pilares. Se não houver planta estrutural, sugere em "suggestions".

SCHEMA OBRIGATÓRIO:
{
 "sheet": {"sheet_index":N,"sheet_name":"","discipline":"Arquitetura|Estrutura|Fundações|Instalações elétricas|Instalações hidráulicas|Cortes|Alçados|Cobertura|Outro","floor_level":"","scale":"","confidence":0.0,"needs_review":false},
 "ignored_regions":[{"region_type":"graphic_fill|hatch|shadow|furniture|title_block|terrain|text|dimension|vegetation","reason":"","description":"","coordinates":{"x":0,"y":0,"w":0,"h":0},"confidence":0.0}],
 "elements":[{"code":"","category":"Compartimentos","description":"","quantity":0,"unit":"un|m|m2|m3|ml","dimensions":{},"coordinates":{"x":0,"y":0,"w":0,"h":0},"source_text":"","confidence":0.0,"status":"ok|review|proposed","read_method":"direct_text|visual_detection|calculated|inferred","validation_required":false,"budget_chapter_suggestion":"","budget_item_suggestion":"","notes":"","reasoning_summary":""}],
 "warnings":[],
 "suggestions":[]
}

Categorias válidas: ${VALID_CATEGORIES.join(", ")}.
Unidades válidas: un, m, m2, m3, ml.`;

function normalizeQuantity(q: unknown): number | null {
  if (q === null || q === undefined) return null;
  if (typeof q === "number") return Number.isFinite(q) ? q : null;
  if (typeof q === "string") {
    const cleaned = q.replace(/\s/g, "").replace(",", ".");
    const n = Number.parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizeUnit(u: unknown): string | null {
  if (typeof u !== "string") return null;
  const v = u.trim().toLowerCase().replace("²", "2").replace("³", "3");
  if (VALID_UNITS.includes(v)) return v;
  if (v === "und" || v === "uni" || v === "unid") return "un";
  if (v === "mt" || v === "metro" || v === "metros") return "m";
  return null;
}

function rectArea(c: any): number {
  const w = Number(c?.w) || 0;
  const h = Number(c?.h) || 0;
  // Coordinates may be normalized 0..1 OR absolute. Compute fractional area assuming 0..1; otherwise normalize.
  if (w <= 1 && h <= 1) return w * h;
  // Absolute: normalize by 1000x1000 assumed canvas
  return (w * h) / (1000 * 1000);
}

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
              { type: "text", text: `Analisa a folha índice ${sheet.sheet_index} do ficheiro ${sheet.plant_file_id}.\nDevolve apenas JSON válido conforme o schema.\nExtrai todos os quantitativos legíveis e úteis para orçamento.\nNão coloques elementos orçamentáveis dentro de ignored_regions.` },
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
      parsed = { sheet: {}, elements: [], ignored_regions: [], warnings: ["JSON inválido devolvido pela Axia"], suggestions: [] };
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

    // Remove previous AI-only elements (preserva approved/edited/ignored confirmados pelo utilizador)
    await service.from("plant_elements")
      .delete()
      .eq("plant_sheet_id", plant_sheet_id)
      .in("status", ["ok", "review", "proposed", "error"]);
    // Limpa também regiões ignoradas anteriores geradas pela IA (sem revisão humana)
    await service.from("plant_elements")
      .delete()
      .eq("plant_sheet_id", plant_sheet_id)
      .eq("status", "ignored")
      .is("approved_by", null);

    const rawElements: any[] = Array.isArray(parsed.elements) ? parsed.elements : [];
    const rawIgnored: any[] = Array.isArray(parsed.ignored_regions) ? parsed.ignored_regions : [];

    // Validação e normalização dos elements
    let droppedNoQty = 0;
    let droppedBadUnit = 0;
    const cleanedElements = rawElements
      .map((e: any) => {
        const qty = normalizeQuantity(e?.quantity);
        const unit = normalizeUnit(e?.unit);
        return { raw: e, qty, unit };
      })
      .filter(({ raw, qty, unit }) => {
        if (qty === null || qty <= 0) { droppedNoQty++; return false; }
        if (!unit) { droppedBadUnit++; return false; }
        if (!raw?.category && !raw?.description) return false;
        return true;
      });

    const rows = cleanedElements.map(({ raw, qty, unit }) => {
      const conf = typeof raw.confidence === "number" ? raw.confidence : null;
      let status = raw.status || "ok";
      if (!["ok", "review", "proposed"].includes(status)) status = "ok";
      if (status !== "proposed" && conf !== null && conf < 0.85 && status !== "review") status = "review";
      const category = VALID_CATEGORIES.includes(raw.category) ? raw.category : (raw.category || "Outros");
      return {
        plant_file_id: sheet.plant_file_id,
        plant_sheet_id: sheet.id,
        organization_id: sheet.organization_id,
        obra_id: sheet.obra_id,
        code: raw.code || null,
        category,
        description: raw.description || null,
        quantity: qty,
        unit,
        dimensions_json: raw.dimensions || null,
        coordinates_json: raw.coordinates || null,
        source_text: raw.source_text || null,
        confidence: conf,
        status,
        read_method: raw.read_method || null,
        validation_required: !!raw.validation_required || status === "proposed" || status === "review",
        budget_chapter_suggestion: raw.budget_chapter_suggestion || null,
        budget_item_suggestion: raw.budget_item_suggestion || null,
        notes: raw.notes || raw.reasoning_summary || null,
      };
    });
    if (rows.length) await service.from("plant_elements").insert(rows);

    // Defesa anti-falso-positivo em ignored_regions:
    // descarta regiões que cubram > 15% da folha (a menos que sejam title_block ou text)
    let droppedOversizeRegions = 0;
    const safeIgnored = rawIgnored.filter((r: any) => {
      const area = rectArea(r?.coordinates);
      const allowedBig = r?.region_type === "title_block" || r?.region_type === "text";
      if (area > 0.15 && !allowedBig) { droppedOversizeRegions++; return false; }
      if (area > 0.4) { droppedOversizeRegions++; return false; }
      return true;
    });

    const ignoredRows = safeIgnored.slice(0, 50).map((r: any) => ({
      plant_file_id: sheet.plant_file_id,
      plant_sheet_id: sheet.id,
      organization_id: sheet.organization_id,
      obra_id: sheet.obra_id,
      code: null,
      category: "Outros",
      description: r.description || r.reason || "Região ignorada",
      quantity: null,
      unit: null,
      dimensions_json: null,
      coordinates_json: r.coordinates || null,
      source_text: r.region_type || null,
      confidence: typeof r.confidence === "number" ? r.confidence : null,
      status: "ignored",
      read_method: "visual_detection",
      validation_required: false,
      budget_chapter_suggestion: null,
      budget_item_suggestion: null,
      notes: `[${r.region_type || "ignored"}] ${r.reason || ""}`,
    }));
    if (ignoredRows.length) await service.from("plant_elements").insert(ignoredRows);

    await service.from("plant_sheets").update(sheetUpdate).eq("id", plant_sheet_id);
    await service.from("plant_processing_logs").insert({
      organization_id: sheet.organization_id, obra_id: sheet.obra_id, plant_file_id: sheet.plant_file_id,
      plant_sheet_id: sheet.id, step: "axia_analyze", status: "ok",
      message: `${rows.length} elementos extraídos, ${ignoredRows.length} regiões ignoradas`,
      details_json: {
        warnings: parsed.warnings || [],
        suggestions: parsed.suggestions || [],
        elements_count: rows.length,
        ignored_count: ignoredRows.length,
        dropped_no_qty: droppedNoQty,
        dropped_bad_unit: droppedBadUnit,
        dropped_oversize_regions: droppedOversizeRegions,
      },
    });

    return new Response(JSON.stringify({ ok: true, elements: rows.length, ignored: ignoredRows.length, sheet: sheetUpdate }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
