// Axia — Sugestão preliminar de fundação ICF quando NÃO existe projecto estrutural.
// Recebe respostas do questionário + plan_import_id, gera itens preliminares com base
// no perímetro da planta de R/C e regras heurísticas, marca tudo como sugestão.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod";
import { AXIA_GLOBAL_SAFETY_BLOCK } from "../_shared/axia/system-prompts.ts";
import { resolveModel } from "../_shared/axia/model-router.ts";

const InputsSchema = z.object({
  numero_pisos: z.number().int().min(1).max(10),
  tem_cave: z.boolean(),
  tem_garagem: z.boolean(),
  tipo_terreno: z.string().optional(),
  icf_integral: z.boolean(),
  muros_contencao: z.boolean(),
  grandes_vaos: z.boolean(),
  tipo_laje_terrea: z.string().optional(),
  altura_pisos_m: z.number().min(2).max(6).optional(),
  localizacao: z.string().optional(),
  desniveis_terreno: z.boolean().optional(),
  tem_estudo_geotecnico: z.boolean().optional(),
});

const BodySchema = z.object({
  plan_import_id: z.string().uuid(),
  obra_id: z.string().uuid(),
  inputs: InputsSchema,
  area_implantacao_m2: z.number().min(0).optional(),
  perimetro_exterior_m: z.number().min(0).optional(),
});

const SYSTEM_PROMPT = `
És a Axia, motor técnico do Obra Sys (Portugal). Vais gerar uma SUGESTÃO PRELIMINAR
de fundação ICF, a partir da arquitetura (sem projecto de estabilidade).

ITENS PERMITIDOS (usa exactamente estes tipos):
- "betao_limpeza"                (m2)
- "fundacao_continua_exterior"   (ml)  — sob paredes ICF exteriores (perímetro R/C)
- "fundacao_continua_interior"   (ml)  — sob paredes interiores prováveis estruturais
- "sapata_isolada"               (un)  — em pontos de pilares/cargas concentradas
- "viga_fundacao"                (ml)  — vigas/lintéis de fundação
- "laje_terrea_icf"              (m2)  — se utilizador escolheu este tipo
- "laje_massame"                 (m2)  — alternativa a laje térrea ICF
- "impermeabilizacao_periferica" (ml)
- "drenagem_perimetral"          (ml)
- "arranque_paredes_icf"         (un)  — esperas para arranque ICF

REGRAS DE CÁLCULO PRELIMINAR:
- Fundação contínua exterior ≈ perímetro_exterior_m do R/C.
- Fundação contínua interior ≈ 30–50% do perímetro exterior (aproximação grosseira).
- Sapatas isoladas: estimar 4–8 unidades para moradia comum, mais se houver grandes vãos.
- Betão de limpeza ≈ área de implantação × 1.1.
- Laje térrea (ICF ou massame) ≈ área de implantação.
- Impermeabilização periférica e drenagem ≈ perímetro exterior.
- Arranques ICF ≈ perímetro exterior / 1.2 (cada bloco ~1.2m).
- Se tem_cave=true: adicionar paredes de cave e drenagem reforçada.
- Se tem_garagem=true: adicionar reforço local na zona.
- Se grandes_vaos=true: aumentar quantidade de sapatas e vigas de fundação.
- Se muros_contencao=true: nota explícita de muros adicionais.
- Se desniveis_terreno=true ou tem_estudo_geotecnico=false: subir requer_validacao.

Para cada item devolve:
{ "tipo": "...", "descricao": "...", "unidade": "ml|m2|un", "quantidade": number,
  "metodo_calculo": "fórmula usada", "confidence": 0..1,
  "observacoes": "Sugestão preliminar. Requer validação por projeto de estabilidade." }

REGRAS CRÍTICAS:
- TUDO é "sugestao_preliminar". NUNCA marques nada como confirmado.
- Sem projecto de estabilidade NÃO há cálculo estrutural real. Indica explicitamente.
- Se faltarem dados, regista em "missing_data" e baixa "confidence".
- Sem estudo geotécnico: missing_data deve incluir "estudo_geotecnico".
- Devolve PT-PT.

${AXIA_GLOBAL_SAFETY_BLOCK}

RESPOSTA: JSON estrito { "items": [...], "summary": "...", "missing_data": [...], "overall_confidence": 0..1 }.
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
    const { plan_import_id, obra_id, inputs, area_implantacao_m2, perimetro_exterior_m } = parsed.data;
    const userId = userRes.user.id;

    const userPrompt = `
Inputs do utilizador:
${JSON.stringify(inputs, null, 2)}

Dados extraídos da planta (podem ser nulos):
- area_implantacao_m2: ${area_implantacao_m2 ?? "indisponivel"}
- perimetro_exterior_m: ${perimetro_exterior_m ?? "indisponivel"}

Gera a sugestão preliminar de fundação ICF.
`.trim();

    const model = resolveModel("icf_analysis", "primary");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableKey },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
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
    let result: any = {};
    try {
      result = JSON.parse(raw);
    } catch {
      return new Response(JSON.stringify({ error: "JSON inválido da IA", raw: raw.slice(0, 500) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supaUrl, service);
    const now = new Date().toISOString();

    // Persistir sessão
    const { data: session, error: sessErr } = await admin
      .from("plan_foundation_suggestions")
      .insert({
        plan_import_id,
        obra_id,
        user_id: userId,
        inputs,
        result,
        status: "gerado",
        generated_at: now,
      })
      .select("id")
      .single();

    if (sessErr) {
      return new Response(JSON.stringify({ error: sessErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, session_id: session.id, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[axia-foundation-suggestion]", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Erro inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
