// Edge function: icf-architecture-assistant
// Lê plantas arquitetónicas comuns e produz pré-quantitativo ICF com rastreabilidade.
// Nunca inventa fundações; declara explicitamente quando não as encontra.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import { resolveChain } from "../_shared/axia/model-router.ts";
import { AXIA_ANTI_HALLUCINATION_BLOCK } from "../_shared/axia/system-prompts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FOUNDATIONS_NOT_FOUND_MESSAGE =
  "Não foram identificadas fundações ou sapatas na planta arquitetónica. A Axia pode sugerir uma solução preliminar para orçamento, mas a definição final deve ser validada por técnico/engenheiro responsável.";

interface ReqBody {
  session_id: string;
  file_path: string;
  plan_kind: "arquitetura" | "estrutural" | "icf" | "desconhecido";
  scale_m_per_px?: number | null;
  espessura_nucleo?: number;
  calibration?: {
    method?: "known_distance" | "declared_scale" | "uncalibrated" | null;
    confidence?: "alta" | "media" | "baixa" | null;
    page?: number | null;
    real_distance_m?: number | null;
    distance_px?: number | null;
    declared_scale?: string | null;
    override?: boolean;
  };
}

const SYSTEM_PROMPT = `Você é a Axia, motor de leitura de plantas para o sistema ICF (HOMEBLOCK) em Portugal.

REGRAS ABSOLUTAS:
- Aceita plantas de arquitetura comuns como base. Não exige detalhes ICF.
- Identifica paredes EXTERIORES e INTERIORES separadamente, vãos, pisos e áreas.
- Paredes exteriores são candidatas naturais a ICF; marca \`candidata_icf=true\`.
- Paredes interiores NUNCA são automaticamente ICF; marca \`candidata_icf=false\`.
- NUNCA INVENTE fundações ou sapatas. Se a planta não as mostra, devolva \`fundacoes_encontradas=false\` e a mensagem oficial.
- Todo item tem \`source_type\` ('extraido_planta' para o que está desenhado, 'calculado_sistema' para áreas derivadas).
- Marca \`review_required=true\` quando \`confidence<=0.6\`, quando faltam cotas, ou quando há ambiguidade.
- Explique incertezas nas \`assumptions\` (array de strings).
- NÃO produza orçamento final - apenas pré-quantitativo auditável.

BIBLIOTECA TÉCNICA HOMEBLOCK (única fonte dimensional válida):
- Catálogo fechado: HB-BLOCO-220 (1200×300×220 mm, núcleo 150), HB-BLOCO-300 (1200×300×300 mm, núcleo 220), HB-TOPO-150, HB-TOPO-220, HB-ESPACADOR-150, HB-ESPACADOR-220, HB-DETALHE-CORTE. Unidade sempre "un".
- Os SVGs em /icf/homeblock/*.svg são APENAS referência visual. Nunca extrair medidas dos desenhos - usar exclusivamente as dimensões canónicas acima.
- Modulação obrigatória: 1200 mm × 300 mm. Qualquer comprimento/altura de parede que não seja múltiplo destes valores gera sobra → \`review_required=true\`.
- Escolha do bloco principal pela espessura do núcleo desejada: 150 → HB-BLOCO-220; 220 → HB-BLOCO-300.
- Nunca inventar códigos, dimensões ou preços. Preços são definidos pelo sistema a jusante.

ALINHAMENTO COM O MODELO DE ORÇAMENTO:
- A saída desta análise alimenta UM ÚNICO capítulo "Sistema ICF / HOMEBLOCK" agregado por código da biblioteca.
- Os comprimentos/áreas devolvidos devem ser em metros (paredes) e m² (vãos), em valores brutos auditáveis. A conversão para quantidade de blocos é feita pelo motor de composição do sistema.
- Itens com \`review_required=true\` ou \`source_type='sugerido_axia'\` são tagueados como [REVISÃO TÉCNICA] no orçamento - não os omita, mas marque corretamente.

Devolva JSON estrito no schema fornecido.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "extract_icf_architecture",
    description: "Extrai paredes, vãos e indicação de fundações para o assistente ICF.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        fundacoes_encontradas: { type: "boolean" },
        fundacoes_mensagem: { type: "string" },
        paredes: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              referencia: { type: "string" },
              tipo: { type: "string", enum: ["exterior", "interior"] },
              comprimento_m: { type: "number" },
              altura_m: { type: "number" },
              piso: { type: "string" },
              candidata_icf: { type: "boolean" },
              confidence: { type: "number" },
              assumptions: { type: "array", items: { type: "string" } },
            },
            required: ["referencia", "tipo", "comprimento_m", "altura_m", "candidata_icf", "confidence"],
          },
        },
        vaos: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              parede_ref: { type: "string" },
              tipo: { type: "string" },
              largura_m: { type: "number" },
              altura_m: { type: "number" },
              quantidade: { type: "number" },
              confidence: { type: "number" },
            },
            required: ["parede_ref", "tipo", "largura_m", "altura_m", "quantidade", "confidence"],
          },
        },
        notas: { type: "string" },
      },
      required: ["fundacoes_encontradas", "paredes", "vaos"],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as ReqBody;
    if (!body.session_id || !body.file_path) {
      return json({ error: "Parâmetros em falta" }, 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY ausente" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Não autenticado" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: sess, error: sessErr } = await admin
      .from("icf_assistant_sessions")
      .select("*")
      .eq("id", body.session_id)
      .single();
    if (sessErr || !sess) return json({ error: "Sessão não encontrada" }, 404);

    // Download plant file and convert to data URL (Gemini requires data URL for PDFs)
    const { data: fileBlob, error: dlErr } = await admin.storage
      .from("plan-files")
      .download(body.file_path);
    if (dlErr || !fileBlob) return json({ error: "Não foi possível ler a planta" }, 500);

    const lowerPath = body.file_path.toLowerCase();
    let mimeType = fileBlob.type || "";
    if (!mimeType || mimeType === "application/octet-stream") {
      if (lowerPath.endsWith(".pdf")) mimeType = "application/pdf";
      else if (lowerPath.endsWith(".png")) mimeType = "image/png";
      else if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) mimeType = "image/jpeg";
      else if (lowerPath.endsWith(".webp")) mimeType = "image/webp";
      else if (lowerPath.endsWith(".gif")) mimeType = "image/gif";
      else mimeType = "application/pdf";
    }

    const arrBuf = await fileBlob.arrayBuffer();
    const bytes = new Uint8Array(arrBuf);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
    }
    const dataUrl = `data:${mimeType};base64,${btoa(binary)}`;

    const cal = body.calibration ?? {};
    const calMethod = cal.method ?? "uncalibrated";
    const calConf = cal.confidence ?? "baixa";
    const calGuard = `\nCONTEXTO DE CALIBRAÇÃO DA PLANTA:
- Método: ${calMethod}
- Confiança declarada: ${calConf}
- Página calibrada: ${cal.page ?? 1}
- Medida real de referência: ${cal.real_distance_m ?? "n/d"} m sobre ${cal.distance_px ?? "n/d"} px
- Escala declarada: ${cal.declared_scale ?? "n/d"}
- Override manual: ${cal.override ? "sim" : "não"}

REGRA DE CALIBRAÇÃO (OBRIGATÓRIA):
- Nunca assumir escala se não houver calibração confirmada. Usa exclusivamente o fator m/px fornecido (${body.scale_m_per_px ?? "n/d"}).
- Se método = known_distance → confidence pode ser alta.
- Se método = declared_scale → confidence máxima é média.
- Se método = uncalibrated OU override = true → marca TODOS os quantitativos como baixa confiança e review_required = true.`;

    const userPrompt = `Analise a planta. Tipo declarado: ${body.plan_kind}. Escala: ${body.scale_m_per_px ?? "desconhecida"} m/px.
Espessura núcleo ICF desejada: ${body.espessura_nucleo ?? 0.15} m.${calGuard}
Devolva JSON via tool call. Se não houver fundações desenhadas, defina fundacoes_encontradas=false e use a mensagem oficial.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: resolveChain("icf_analysis").primary,
        messages: [
          { role: "system", content: SYSTEM_PROMPT + "\n\n" + AXIA_ANTI_HALLUCINATION_BLOCK },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "extract_icf_architecture" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      if (aiResp.status === 429) return json({ error: "Limite de pedidos atingido. Tente novamente." }, 429);
      if (aiResp.status === 402) return json({ error: "Créditos esgotados na Lovable AI." }, 402);
      return json({ error: "Erro ao analisar planta" }, 500);
    }

    const aiJson = await aiResp.json();
    const call = aiJson.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!call) return json({ error: "A Axia não devolveu resultado estruturado" }, 502);

    let parsed: any;
    try { parsed = JSON.parse(call); } catch { return json({ error: "Resposta inválida da Axia" }, 502); }

    // Apagar itens anteriores (somente categorias geradas por análise)
    await admin
      .from("icf_assistant_items")
      .delete()
      .eq("session_id", body.session_id)
      .in("category", ["parede_ext", "parede_int", "vao"]);

    const rows: any[] = [];
    let ordem = 0;

    for (const p of parsed.paredes ?? []) {
      const isExt = p.tipo === "exterior";
      const conf = Number(p.confidence ?? 0.7);
      const area = Number(p.comprimento_m || 0) * Number(p.altura_m || 0);
      rows.push({
        session_id: body.session_id,
        organization_id: sess.organization_id,
        category: isExt ? "parede_ext" : "parede_int",
        reference: p.referencia,
        is_icf_candidate: isExt && !!p.candidata_icf,
        user_confirmed: false,
        quantity: round(area),
        unit: "m²",
        attributes: {
          comprimento: p.comprimento_m,
          altura: p.altura_m,
          piso: p.piso ?? null,
        },
        source_type: "extraido_planta",
        confidence: conf,
        review_required: conf <= 0.6 || !isExt,
        assumptions: p.assumptions ?? (isExt ? [] : ["Parede interior - requer confirmação para ser ICF"]),
        ordem: ordem++,
      });
    }

    for (const v of parsed.vaos ?? []) {
      const conf = Number(v.confidence ?? 0.7);
      const area = Number(v.largura_m || 0) * Number(v.altura_m || 0) * Number(v.quantidade || 1);
      rows.push({
        session_id: body.session_id,
        organization_id: sess.organization_id,
        category: "vao",
        reference: `${v.tipo} ${v.largura_m}×${v.altura_m} (${v.quantidade}x)`,
        quantity: round(area),
        unit: "m²",
        attributes: v,
        source_type: "extraido_planta",
        confidence: conf,
        review_required: conf <= 0.6,
        assumptions: [],
        ordem: ordem++,
      });
    }

    if (rows.length > 0) {
      const { error: insErr } = await admin.from("icf_assistant_items").insert(rows);
      if (insErr) return json({ error: insErr.message }, 500);
    }

    await admin
      .from("icf_assistant_sessions")
      .update({
        foundations_found: !!parsed.fundacoes_encontradas,
        axia_audit: {
          notas: parsed.notas ?? null,
          fundacoes_mensagem: parsed.fundacoes_encontradas
            ? null
            : parsed.fundacoes_mensagem || FOUNDATIONS_NOT_FOUND_MESSAGE,
          counts: {
            paredes: (parsed.paredes ?? []).length,
            vaos: (parsed.vaos ?? []).length,
          },
        },
      })
      .eq("id", body.session_id);

    return json({
      ok: true,
      summary: {
        paredes: (parsed.paredes ?? []).length,
        vaos: (parsed.vaos ?? []).length,
        foundations_found: !!parsed.fundacoes_encontradas,
      },
      message: parsed.fundacoes_encontradas ? null : FOUNDATIONS_NOT_FOUND_MESSAGE,
    });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Erro" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
