// Axia Voice Intake — process-voice-command
// Classifica um comando de voz/texto e cria intake items + rascunhos.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const PROMPT_VERSION = "axia.intake.v1";
const MODEL = "google/gemini-3-flash-preview";

type AxiaItem = {
  type: "pre_budget" | "rdo" | "financial_record" | "material_need" | "unknown";
  title: string;
  summary?: string;
  data: Record<string, unknown>;
  missing_fields: string[];
  questions: string[];
};

type AxiaResult = {
  intent: string;
  confidence: number;
  requires_human_review: boolean;
  project_resolution: { obra_id: string | null; confidence: number; reason: string };
  items: AxiaItem[];
  explanation: string;
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function resolveObraFromTranscript(transcript: string, obras: Array<{ id: string; nome: string }>) {
  const t = normalize(transcript);
  let best: { id: string; nome: string; score: number } | null = null;
  for (const o of obras) {
    const n = normalize(o.nome);
    if (!n) continue;
    if (t.includes(n)) {
      const score = n.length / Math.max(t.length, 1);
      if (!best || score > best.score) best = { ...o, score: Math.min(1, 0.6 + score) };
    }
  }
  return best;
}

const SYSTEM_PROMPT = `Você é a Axia, camada de inteligência operacional do Obra Sys.
Transforme comandos de voz/texto em dados estruturados para o sistema, em PT-PT.

Classifique cada comando em uma ou mais intenções: create_pre_budget, create_rdo_entry, create_financial_record, create_material_need, unknown_or_mixed.

Regras obrigatórias:
1. NUNCA crie orçamento final, apenas pré-orçamento.
2. NUNCA finalize RDO automaticamente.
3. Registo financeiro sem obra é permitido (será marcado missing_project).
4. Se a obra não for identificada com segurança, indique missing_fields=["obra_id"].
5. Use apenas os dados do contexto. Não invente cliente, obra, preço ou quantidade.
6. Quando houver incerteza, marque requires_human_review=true.
7. Se o comando misturar vários assuntos, crie múltiplos items.
8. Para pré-orçamentos, extraia serviços, áreas, quantidades, unidades e info em falta.
9. Para RDOs, extraia atividades executadas, materiais em falta, ocorrências.
10. Para financeiro, é OBRIGATÓRIO preencher data.amount (numérico em EUR, sem símbolos), data.description (string curta), data.category (ex: "combustivel", "material", "mao_de_obra", "outros"), data.tipo ("expense" ou "income"). Se algum destes faltar no transcript, adicione ao missing_fields.
11. Devolva APENAS JSON válido conforme a ferramenta.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "axia_intake_v1",
    description: "Estrutura o comando em items operacionais.",
    parameters: {
      type: "object",
      properties: {
        intent: { type: "string" },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        requires_human_review: { type: "boolean" },
        project_resolution: {
          type: "object",
          properties: {
            obra_id: { type: ["string", "null"] },
            confidence: { type: "number" },
            reason: { type: "string" },
          },
          required: ["obra_id", "confidence", "reason"],
          additionalProperties: false,
        },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["pre_budget", "rdo", "financial_record", "material_need", "unknown"] },
              title: { type: "string" },
              summary: { type: "string" },
              data: { type: "object", additionalProperties: true },
              missing_fields: { type: "array", items: { type: "string" } },
              questions: { type: "array", items: { type: "string" } },
            },
            required: ["type", "title", "data", "missing_fields", "questions"],
            additionalProperties: false,
          },
        },
        explanation: { type: "string" },
      },
      required: ["intent", "confidence", "requires_human_review", "project_resolution", "items", "explanation"],
      additionalProperties: false,
    },
  },
};

async function callAxia(transcript: string, context: unknown): Promise<AxiaResult> {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
  const today = new Date().toISOString().split("T")[0];
  const userPrompt = `Comando: "${transcript}"

Contexto (JSON):
${JSON.stringify(context)}

Data atual: ${today}

Devolva via tool_call axia_intake_v1.`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      tools: [TOOL_SCHEMA],
      tool_choice: { type: "function", function: { name: "axia_intake_v1" } },
    }),
  });

  if (!resp.ok) {
    if (resp.status === 429) throw new Error("RATE_LIMIT");
    if (resp.status === 402) throw new Error("PAYMENT_REQUIRED");
    throw new Error(`AI gateway: ${resp.status} ${await resp.text()}`);
  }

  const json = await resp.json();
  const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error("No tool call");
  return JSON.parse(toolCall.function.arguments) as AxiaResult;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth");

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) throw new Error("Not authenticated");
    userId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { voice_command_id } = await req.json();
    if (!voice_command_id || typeof voice_command_id !== "string") {
      throw new Error("voice_command_id required");
    }

    const { data: cmd, error: cmdErr } = await admin
      .from("voice_commands")
      .select("*")
      .eq("id", voice_command_id)
      .eq("user_id", userId)
      .single();
    if (cmdErr || !cmd) throw new Error("voice_command not found");

    await admin.from("voice_commands").update({ processing_status: "processing" }).eq("id", cmd.id);

    // Carregar contexto
    const { data: orgIds } = await admin.rpc("get_org_member_ids");
    const memberIds: string[] = (orgIds as string[]) ?? [userId];

    const { data: obras } = await admin
      .from("obras")
      .select("id, nome, cliente, status")
      .in("user_id", memberIds)
      .eq("arquivada", false)
      .order("created_at", { ascending: false })
      .limit(15);

    const { data: categorias } = await admin
      .from("categorias_financeiras")
      .select("id, nome")
      .in("user_id", memberIds)
      .limit(50);

    const ctxObra = cmd.obra_id ? obras?.find((o) => o.id === cmd.obra_id) : null;
    const fuzzy = !ctxObra ? resolveObraFromTranscript(cmd.transcript, obras ?? []) : null;

    const context = {
      empresa: { user_id: userId },
      obra_atual: ctxObra ?? null,
      obra_fuzzy_match: fuzzy,
      obras_recentes: (obras ?? []).map((o) => ({ id: o.id, nome: o.nome })),
      categorias_financeiras: (categorias ?? []).map((c) => ({ id: c.id, nome: c.nome })),
      source_context: cmd.source_context,
    };

    // Chamar Axia
    const axia = await callAxia(cmd.transcript, context);

    // Resolver obra final: contexto > AI > fuzzy
    const resolvedObraId =
      cmd.obra_id ??
      (axia.project_resolution.obra_id && obras?.some((o) => o.id === axia.project_resolution.obra_id)
        ? axia.project_resolution.obra_id
        : fuzzy?.id ?? null);

    const created_items: Array<{ type: string; id: string; status: string }> = [];
    let alerts_created = 0;

    for (const item of axia.items) {
      const conf = Math.min(1, Math.max(0, axia.confidence));
      const itemObraId =
        item.type === "rdo"
          ? resolvedObraId
          : item.type === "financial_record"
          ? resolvedObraId
          : resolvedObraId;

      // Decidir status do intake conforme confiança e obra
      let intakeStatus: "pending_review" | "needs_more_info" | "converted" = "pending_review";
      if (conf < 0.5 || item.type === "unknown") intakeStatus = "needs_more_info";
      if (item.type === "rdo" && !itemObraId) intakeStatus = "needs_more_info";

      // Criar intake item primeiro
      const { data: intake, error: intakeErr } = await admin
        .from("axia_intake_items")
        .insert({
          user_id: userId,
          obra_id: itemObraId,
          voice_command_id: cmd.id,
          item_type: item.type,
          title: item.title,
          summary: item.summary ?? null,
          extracted_data: item.data ?? {},
          confidence: conf,
          status: intakeStatus,
          missing_fields: item.missing_fields ?? [],
          axia_questions: item.questions ?? [],
        })
        .select("id")
        .single();
      if (intakeErr) {
        console.error("intake insert error", intakeErr);
        continue;
      }

      // Criar entidade-rascunho conforme regras
      if (item.type === "financial_record") {
        const amount = Number(item.data?.amount ?? 0);
        if (amount > 0) {
          const intake_status = !itemObraId ? "missing_project" : "pending_review";
          const { data: cf, error: cfErr } = await admin
            .from("contas_financeiras")
            .insert({
              user_id: userId,
              obra_id: itemObraId,
              tipo: "pagar",
              origem: "outros",
              valor: amount,
              descricao: String(item.data?.description ?? item.title),
              data_vencimento: new Date().toISOString().split("T")[0],
              pago: false,
              created_from: "voice_axia",
              source_voice_command_id: cmd.id,
              source_axia_intake_item_id: intake.id,
              intake_status,
            })
            .select("id")
            .single();
          if (!cfErr && cf) {
            await admin
              .from("axia_intake_items")
              .update({
                target_entity_type: "financial_record",
                target_entity_id: cf.id,
                status: itemObraId ? "pending_review" : "needs_more_info",
              })
              .eq("id", intake.id);
            created_items.push({ type: "financial_record", id: cf.id, status: intake_status });
          }
        }
      } else if (item.type === "rdo" && itemObraId && conf >= 0.5) {
        const data = (item.data ?? {}) as any;
        const reportDate = (data.date as string) ?? new Date().toISOString().split("T")[0];
        const summary = item.summary ?? "RDO criado por voz Axia";
        const activities = Array.isArray(data.activities_done) ? (data.activities_done as string[]) : [];
        const materials = Array.isArray(data.materials_missing) ? (data.materials_missing as string[]) : [];

        // upsert por (obra_id, data)
        const { data: existing } = await admin
          .from("relatorios_diarios")
          .select("id")
          .eq("obra_id", itemObraId)
          .eq("data", reportDate)
          .maybeSingle();

        let rdoId: string | null = existing?.id ?? null;
        if (!rdoId) {
          const { data: rdo, error: rdoErr } = await admin
            .from("relatorios_diarios")
            .insert({
              user_id: userId,
              obra_id: itemObraId,
              data: reportDate,
              status: "rascunho",
              trabalhos_executados: activities.join(", "),
              observacoes: summary,
              criado_por: userId,
              created_from: "voice_axia",
              source_voice_command_id: cmd.id,
              source_axia_intake_item_id: intake.id,
            })
            .select("id")
            .single();
          if (rdoErr) {
            console.error("rdo insert", rdoErr);
          } else {
            rdoId = rdo.id;
          }
        }

        if (rdoId) {
          for (const act of activities) {
            await admin.from("daily_report_activities").insert({
              user_id: userId,
              obra_id: itemObraId,
              daily_report_id: rdoId,
              description: act,
              source: "axia_voice",
              voice_command_id: cmd.id,
              confidence: conf,
            });
          }
          for (const mat of materials) {
            await admin.from("daily_report_material_needs").insert({
              user_id: userId,
              daily_report_id: rdoId,
              material_name: mat,
              urgency: "normal",
              status: "open",
              source: "axia_voice",
              voice_command_id: cmd.id,
            });
          }
          await admin
            .from("axia_intake_items")
            .update({
              target_entity_type: "rdo",
              target_entity_id: rdoId,
              status: "pending_review",
            })
            .eq("id", intake.id);
          created_items.push({ type: "rdo", id: rdoId, status: "pending_review" });
        }
      } else if (item.type === "pre_budget" && conf >= 0.5) {
        const data = (item.data ?? {}) as any;
        const { data: pb, error: pbErr } = await admin
          .from("pre_budgets")
          .insert({
            user_id: userId,
            obra_id: itemObraId,
            title: item.title,
            description: item.summary ?? null,
            status: "pending_review",
            created_from: "voice_axia",
            source_voice_command_id: cmd.id,
            source_axia_intake_item_id: intake.id,
            confidence: conf,
            axia_summary: axia.explanation,
            axia_missing_info: item.missing_fields ?? [],
          })
          .select("id")
          .single();
        if (!pbErr && pb) {
          const items = Array.isArray(data.items) ? (data.items as any[]) : [];
          for (let i = 0; i < items.length; i++) {
            const it = items[i];
            await admin.from("pre_budget_items").insert({
              user_id: userId,
              pre_budget_id: pb.id,
              description: String(it.description ?? "Item"),
              quantity: it.quantity != null ? Number(it.quantity) : null,
              unit: it.unit ?? null,
              source: "axia",
              confidence: conf,
              needs_review: true,
              ordem: i,
            });
          }
          await admin
            .from("axia_intake_items")
            .update({
              target_entity_type: "pre_budget",
              target_entity_id: pb.id,
              status: "pending_review",
            })
            .eq("id", intake.id);
          created_items.push({ type: "pre_budget", id: pb.id, status: "pending_review" });
        }
      } else if (item.type === "material_need") {
        // sem RDO/obra: fica só no intake (já criado)
        if (intakeStatus === "pending_review") {
          await admin.from("axia_intake_items").update({ status: "pending_review" }).eq("id", intake.id);
        }
      }
    }

    // Contar alertas criados (resultado dos triggers)
    const { count } = await admin
      .from("dashboard_alerts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", new Date(startedAt - 1000).toISOString());
    alerts_created = count ?? 0;

    await admin
      .from("voice_commands")
      .update({
        processing_status: "processed",
        processed_at: new Date().toISOString(),
        detected_intent: axia.intent,
        confidence: axia.confidence,
        axia_result: axia as unknown as Record<string, unknown>,
      })
      .eq("id", cmd.id);

    await admin.from("axia_processing_logs").insert({
      user_id: userId,
      process_type: "voice_command",
      source_entity_type: "voice_command",
      source_entity_id: cmd.id,
      input_summary: cmd.transcript.substring(0, 500),
      output_summary: axia.explanation?.substring(0, 500),
      model_used: MODEL,
      prompt_version: PROMPT_VERSION,
      status: "success",
      latency_ms: Date.now() - startedAt,
    });

    return new Response(
      JSON.stringify({ status: "processed", created_items, alerts_created }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("process-voice-command error:", message);

    try {
      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const body = await req.clone().json().catch(() => ({}));
      if (body?.voice_command_id) {
        await admin
          .from("voice_commands")
          .update({ processing_status: "failed", error_message: message })
          .eq("id", body.voice_command_id);
      }
      if (userId) {
        await admin.from("axia_processing_logs").insert({
          user_id: userId,
          process_type: "voice_command",
          status: "failed",
          error_message: message,
          model_used: MODEL,
          prompt_version: PROMPT_VERSION,
          latency_ms: Date.now() - startedAt,
        });
      }
    } catch (logErr) {
      console.error("log error", logErr);
    }

    const status = message === "RATE_LIMIT" ? 429 : message === "PAYMENT_REQUIRED" ? 402 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
