// Axia — Classificação automática das folhas de um projeto (arquitetura/estrutura/piso).
// Lê todas as plan_pages do plan_import, chama Gemini 2.5 Pro (multi-imagem) e persiste
// a classificação em plan_pages (discipline, sheet_type, detected_floor, etc.).

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod";
import { getPrompt } from "../_shared/axia/prompts.ts";
import { logAxiaCall } from "../_shared/axia/logCall.ts";
import { resolveModel } from "../_shared/axia/model-router.ts";
import { rateLimitOrg } from "../_shared/rateLimitOrg.ts";



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
de construção PT-PT, identificando disciplina, tipo de folha e piso correspondente.

DISCIPLINAS: arquitetura | estrutura | mep | outro

TIPOS DE FOLHA (usa exactamente estes valores):
- Arquitetura: floor_plan, roof_plan, elevation, section, planta_arquitetura
- Estrutura: foundation_plan, structural_floor_plan, reinforcement_detail,
  wall_reinforcement, beam_reinforcement, slab_reinforcement, quadro_pilares,
  metallic_structure_detail, icf_detail
- Outro: unknown

PISOS (usa exactamente estes valores):
fundacao | piso_-1 | piso_0 | piso_1 | piso_2 | cobertura | exterior | multi_floor | generico

PALAVRAS-CHAVE — ARQUITETURA:
"Planta do R/Chão", "Rés-do-chão", "R/C", "Planta do Piso 0", "Planta do 1º Andar",
"Planta do Piso 1", "Planta da Cobertura", "Compartimentos", "Áreas m2", "Cozinha",
"Sala", "Quarto", "I.S.", "Garagem", "Lavandaria", "Despensa", "Varanda", "Terraço".

PALAVRAS-CHAVE — ESTRUTURA/ESTABILIDADE:
"Estrutura", "Estabilidade", "Planta de Fundações", "Fundação", "Fundações", "Sapatas",
"Armaduras de Sapatas", "Quadro de Pilares", "Pilares", "Vigas", "Lajes", "Armaduras",
"Betão armado", "Planta estrutural", "Plantas estruturais", "Paredes estruturais",
"Armaduras de Paredes", "Armaduras de Vigas", "Reforços em Aberturas", "Pórticos",
"Perfis metálicos", "HEB", "IPE", "Ligações metálicas", "Pormenores ICF".

PALAVRAS-CHAVE — ALÇADOS:
"Alçado Sul/Norte/Poente/Nascente", "Fachada".

PALAVRAS-CHAVE — CORTES:
"Corte A-B", "Corte C-D", "Corte longitudinal", "Corte transversal", "Secção".

REGRAS DETERMINÍSTICAS (segue sempre):
- "Planta do R/Chão" / "Rés-do-chão" / "R/C" / "Piso 0" → arquitetura + floor_plan + piso_0 + extrair quantitativos.
- "Planta do 1º Andar" / "Piso 1" → arquitetura + floor_plan + piso_1 + extrair quantitativos.
- "Planta da Cobertura" → arquitetura + roof_plan + cobertura + extrair quantitativos.
- "Planta de Fundações" → estrutura + foundation_plan + fundacao + extrair quantitativos.
- "Plantas Estruturais do Piso 0/1" → estrutura + structural_floor_plan + piso correspondente + extrair quantitativos.
- "Armaduras de Sapatas" → estrutura + reinforcement_detail + fundacao + extrair.
- "Armaduras de Paredes" → estrutura + wall_reinforcement + piso correspondente quando possível + extrair.
- "Armaduras de Vigas" / "Reforços em Aberturas" → estrutura + beam_reinforcement + extrair.
- "Pormenores ICF" → estrutura + icf_detail + use_for_validation_only=true (não extrair).
- "Pormenores Ligações Metálicas" → estrutura + metallic_structure_detail + use_for_validation_only=true.
- "Alçado ..." → arquitetura + elevation + exterior + use_for_validation_only=true.
- "Corte ..." → arquitetura + section + multi_floor + use_for_validation_only=true.

Para cada folha devolve:
{
  "page_number": int,
  "sheet_title": "string",
  "drawing_code": "string|null",
  "discipline": "arquitetura|estrutura|mep|outro",
  "sheet_type": "...",
  "detected_floor": "...",
  "should_extract_quantities": boolean,
  "use_for_validation_only": boolean,
  "confidence": 0..1,
  "warnings": ["..."]
}

Se NÃO conseguires identificar com segurança: discipline="outro", sheet_type="unknown",
should_extract_quantities=false, e adiciona um aviso em warnings.

Devolve em PORTUGUÊS DE PORTUGAL.

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
    const limited = await rateLimitOrg(userRes.user.id, {
      module: "axia_classify", windowSeconds: 60, maxCalls: 15, corsHeaders,
    });
    if (limited) return limited;


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
