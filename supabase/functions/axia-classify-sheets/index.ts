// Axia — Classificação automática das folhas de um projeto (arquitetura/estrutura/piso).
// Lê todas as plan_pages do plan_import, chama Gemini 2.5 Pro (multi-imagem) e persiste
// a classificação em plan_pages (discipline, sheet_type, detected_floor, etc.).

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod";
import { AXIA_GLOBAL_SAFETY_BLOCK } from "../_shared/axia/system-prompts.ts";
import { resolveModel } from "../_shared/axia/model-router.ts";

const BodySchema = z.object({
  plan_import_id: z.string().uuid(),
  pages: z
    .array(
      z.object({
        page_number: z.number().int(),
        image_base64: z.string().optional(), // jpeg sem prefixo data:
        text_hint: z.string().optional(),
      }),
    )
    .min(1)
    .max(20),
});

const SYSTEM_PROMPT = `
És a Axia, motor técnico do Obra Sys. Tarefa: CLASSIFICAR cada folha de um projeto
de construção, identificando disciplina, tipo de folha e piso correspondente.

DISCIPLINAS: arquitetura | estrutura | mep | outro
TIPOS DE FOLHA:
- Arquitetura: planta_arquitetura, alcado, corte, cobertura
- Estrutura: planta_fundacoes, armaduras_sapatas, quadro_pilares, planta_estrutural,
  armaduras_vigas, armaduras_lajes, armaduras_paredes, pormenor_icf, pormenor_metalico
- Outro: outro
PISOS: fundacao | piso_-1 | piso_0 | piso_1 | piso_2 | cobertura | generico

Para cada folha devolve:
{
  "page_number": int,
  "sheet_title": "string",
  "drawing_code": "string|null",
  "discipline": "arquitetura|estrutura|mep|outro",
  "sheet_type": "...",
  "detected_floor": "...",
  "should_extract_quantities": boolean,  // false p/ pormenores, alçados, cortes
  "use_for_validation_only": boolean,
  "confidence": 0..1,
  "warnings": ["..."]
}

REGRAS:
- Pormenores ICF, pormenores metálicos, alçados e cortes → use_for_validation_only=true e should_extract_quantities=false.
- Plantas estruturais (fundações, lajes, paredes) → use_for_validation_only=false e should_extract_quantities=true.
- Se o título não permitir identificar piso, devolve "generico".
- Devolve em PORTUGUÊS DE PORTUGAL.

${AXIA_GLOBAL_SAFETY_BLOCK}

RESPOSTA: JSON estrito { "sheets": [ ... ] } — sem markdown, sem texto extra.
`.trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY em falta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supaUrl, anon, { global: { headers: { Authorization: auth } } });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { plan_import_id, pages } = parsed.data;

    const admin = createClient(supaUrl, service);

    // Verificar que o plan_import pertence ao utilizador (RLS-friendly check)
    const { data: planRow, error: planErr } = await admin
      .from("plan_imports")
      .select("id, user_id, obra_id")
      .eq("id", plan_import_id)
      .maybeSingle();
    if (planErr || !planRow) {
      return new Response(JSON.stringify({ error: "Plan import não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Montar mensagem multimodal
    const content: any[] = [
      { type: "text", text: "Classifica cada uma das seguintes folhas. Devolve JSON { sheets: [...] }." },
    ];
    for (const p of pages) {
      content.push({ type: "text", text: `Página ${p.page_number}${p.text_hint ? ` — Pista: ${p.text_hint}` : ""}` });
      if (p.image_base64) {
        content.push({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${p.image_base64}` },
        });
      }
    }

    const model = resolveModel("critical_vision_analysis", "primary");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": lovableKey,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      return new Response(
        JSON.stringify({ error: "Falha gateway IA", status: aiResp.status, detail: txt.slice(0, 500) }),
        { status: aiResp.status === 429 || aiResp.status === 402 ? aiResp.status : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiJson = await aiResp.json();
    const raw = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let sheets: any[] = [];
    try {
      const parsedAi = JSON.parse(raw);
      sheets = Array.isArray(parsedAi?.sheets) ? parsedAi.sheets : [];
    } catch {
      return new Response(JSON.stringify({ error: "JSON inválido da IA", raw: raw.slice(0, 500) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Persistir em plan_pages (1 update por página)
    const now = new Date().toISOString();
    const updates: any[] = [];
    for (const s of sheets) {
      const page_number = Number(s.page_number);
      if (!page_number) continue;
      const { error: upErr } = await admin
        .from("plan_pages")
        .update({
          sheet_title: s.sheet_title ?? null,
          drawing_code: s.drawing_code ?? null,
          discipline: s.discipline ?? null,
          sheet_type: s.sheet_type ?? null,
          detected_floor: s.detected_floor ?? null,
          should_extract_quantities: s.should_extract_quantities !== false,
          use_for_validation_only: !!s.use_for_validation_only,
          classification_confidence: typeof s.confidence === "number" ? s.confidence : null,
          classification_warnings: Array.isArray(s.warnings) ? s.warnings : [],
          classified_by: "axia",
          classified_at: now,
        })
        .eq("plan_import_id", plan_import_id)
        .eq("page_number", page_number);
      if (!upErr) updates.push(page_number);
    }

    return new Response(
      JSON.stringify({ success: true, classified_pages: updates, sheets }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[axia-classify-sheets]", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Erro inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
