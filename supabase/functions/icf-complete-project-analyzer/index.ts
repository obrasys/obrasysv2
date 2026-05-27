// Edge function: icf-complete-project-analyzer
// Classifica documentos de um dossiê ICF Projeto Completo via Axia (Lovable AI Gateway).
// Atribui categoria (planta/corte/alcado/detalhe/mapa_vaos/fundacao/memoria_descritiva/outro),
// confiança e resumo curto. Atualiza icf_project_documents e regista issues quando confiança < 0.6.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  analysis_id: z.string().uuid(),
  document_ids: z.array(z.string().uuid()).min(1).max(20).optional(),
});

const SYSTEM_PROMPT = `Você é a Axia, classificadora de documentos técnicos de projeto ICF (HOMEBLOCK) em Portugal.

REGRAS:
- Classifique cada documento numa destas categorias: planta, corte, alcado, detalhe, mapa_vaos, fundacao, memoria_descritiva, outro.
- Devolva confiança 0–1. Use < 0.6 quando o ficheiro for ilegível, ambíguo ou misto.
- Resumo curto (max 240 caracteres) descrevendo o que o documento contém.
- Não invente conteúdo: se não conseguir ver, classifique como "outro" com confiança baixa.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "classify_icf_document",
    description: "Classifica um documento técnico de projeto ICF.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        categoria: {
          type: "string",
          enum: ["planta", "corte", "alcado", "detalhe", "mapa_vaos", "fundacao", "memoria_descritiva", "outro"],
        },
        confianca: { type: "number" },
        resumo: { type: "string" },
      },
      required: ["categoria", "confianca", "resumo"],
    },
  },
};

interface ClassifyResult {
  document_id: string;
  axia_category: string;
  axia_confidence: number;
  axia_summary: string;
}

async function classifyOne(
  fileUrl: string,
  fileName: string,
  apiKey: string,
): Promise<{ categoria: string; confianca: number; resumo: string } | null> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: `Classifique o documento "${fileName}".` },
            { type: "image_url", image_url: { url: fileUrl } },
          ],
        },
      ],
      tools: [TOOL_SCHEMA],
      tool_choice: { type: "function", function: { name: "classify_icf_document" } },
    }),
  });

  if (!resp.ok) {
    console.error("AI gateway error", resp.status, await resp.text());
    return null;
  }
  const data = await resp.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) return null;
  try {
    return JSON.parse(call.function.arguments);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const aiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!aiKey) {
      return new Response(JSON.stringify({ error: "AI gateway não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cliente autenticado para validar acesso
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cliente admin para escrita controlada
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Valida que a análise pertence à org do user
    const { data: analysis, error: aErr } = await userClient
      .from("icf_project_analyses")
      .select("id, empresa_id")
      .eq("id", parsed.data.analysis_id)
      .single();
    if (aErr || !analysis) {
      return new Response(JSON.stringify({ error: "Análise não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Carrega documentos
    let docsQuery = adminClient
      .from("icf_project_documents")
      .select("id, file_name, file_path, mime_type, empresa_id")
      .eq("analysis_id", parsed.data.analysis_id)
      .eq("empresa_id", analysis.empresa_id);
    if (parsed.data.document_ids?.length) {
      docsQuery = docsQuery.in("id", parsed.data.document_ids);
    }
    const { data: docs, error: dErr } = await docsQuery;
    if (dErr) throw dErr;

    const results: ClassifyResult[] = [];

    for (const doc of docs ?? []) {
      // signed url (60s) para o ficheiro privado
      const { data: signed } = await adminClient.storage
        .from("plan-files")
        .createSignedUrl(doc.file_path, 60);
      if (!signed?.signedUrl) continue;

      const cls = await classifyOne(signed.signedUrl, doc.file_name, aiKey);
      if (!cls) {
        await adminClient
          .from("icf_project_documents")
          .update({ status: "pending", axia_summary: "Não foi possível classificar." })
          .eq("id", doc.id);
        continue;
      }

      await adminClient
        .from("icf_project_documents")
        .update({
          axia_category: cls.categoria,
          axia_confidence: cls.confianca,
          axia_summary: cls.resumo,
          status: "classified",
        })
        .eq("id", doc.id);

      results.push({
        document_id: doc.id,
        axia_category: cls.categoria,
        axia_confidence: cls.confianca,
        axia_summary: cls.resumo,
      });

      // Issue se confiança baixa
      if (cls.confianca < 0.6) {
        await adminClient.from("icf_project_issues").insert({
          empresa_id: analysis.empresa_id,
          analysis_id: parsed.data.analysis_id,
          severity: "warning",
          category: "low_confidence",
          title: `Baixa confiança na classificação de "${doc.file_name}"`,
          message: `A Axia atribuiu confiança ${(cls.confianca * 100).toFixed(0)}%. Reveja a categoria sugerida (${cls.categoria}).`,
          related_document_id: doc.id,
        });
      }
    }

    // Atualiza estado do dossiê para em_revisao
    await adminClient
      .from("icf_project_analyses")
      .update({ status: "em_revisao" })
      .eq("id", parsed.data.analysis_id);

    return new Response(JSON.stringify({ results, count: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("icf-complete-project-analyzer error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
