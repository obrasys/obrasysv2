import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveChain } from "../_shared/axia/model-router.ts";
import { scrubMessages } from "../_shared/scrubPII.ts";
import { checkAxiaRateLimit } from "../_shared/axiaRateLimit.ts";
import { buildAxiaChatSystemPrompt } from "../_shared/axia/prompts.ts";
import { logAxiaCall } from "../_shared/axia/logCall.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { question, history } = await req.json();
    if (!question || typeof question !== "string") {
      return new Response(JSON.stringify({ error: "Pergunta em falta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Rate-limit por organização (Fase 2 hardening) ──────
    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: orgRow } = await adminClient
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("member_status", "active")
      .maybeSingle();
    const orgId = orgRow?.organization_id as string | undefined;
    if (orgId) {
      const rl = await checkAxiaRateLimit(adminClient, {
        organizationId: orgId,
        userId: user.id,
        module: "axia_chat",
        windowSeconds: 60,
        maxCalls: 20,
      });
      if (!rl.allowed) {
        return new Response(JSON.stringify({ error: rl.message }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }


    // ── Gather operational context ──────────────────────────
    const [obrasRes, orcamentosRes, rdosRes, tarefasRes, insightsRes, autosMedicaoRes, scheduleTasksRes, contasRes, equipaRes] =
      await Promise.all([
        supabase
          .from("obras")
          .select("id, nome, cliente, status, progresso, valor_previsto, data_inicio, data_fim, orcamento_total, custo_atual, arquivada")
          .eq("arquivada", false)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("orcamentos")
          .select("id, titulo, codigo, status, valor_total, margem_lucro, created_at, updated_at, cliente_nome")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("relatorios_diarios")
          .select("id, obra_id, data, status, condicoes_meteorologicas, mao_de_obra_presente, created_at")
          .order("created_at", { ascending: false })
          .limit(15),
        supabase
          .from("tarefas")
          .select("id, titulo, estado, prioridade, obra_id, data_limite")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("ai_budget_insights")
          .select("id, title, message, type, severity, status")
          .eq("status", "open")
          .limit(15),
        supabase
          .from("autos_medicao")
          .select("id, obra_id, numero_auto, estado, valor_medido_atual, valor_previsto, percentagem_global")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("project_schedule_tasks")
          .select("id, obra_id, name, task_type, wbs_code, status_flag, planned_start, planned_end, forecast_end, actual_start, actual_end, planned_progress_percent, actual_progress_percent, delay_classification, criticality, weight_financial")
          .in("status_flag", ["in_progress", "started", "suspended", "not_started"])
          .order("updated_at", { ascending: false })
          .limit(30),
        supabase
          .from("contas_financeiras")
          .select("id, obra_id, descricao, tipo, valor, data_vencimento, categoria_id")
          .order("data_vencimento", { ascending: false })
          .limit(80),
        supabase
          .from("equipa_membros")
          .select("id, nome, cargo, ativo, obra_atual_id")
          .eq("ativo", true)
          .limit(30),
      ]);

    const obras = obrasRes.data || [];
    const orcamentos = orcamentosRes.data || [];
    const rdos = rdosRes.data || [];
    const tarefas = tarefasRes.data || [];
    const insights = insightsRes.data || [];
    const autos = autosMedicaoRes.data || [];
    const scheduleTasks = scheduleTasksRes.data || [];
    const contas = contasRes.data || [];
    const equipa = equipaRes.data || [];

    // ── Build context summary ───────────────────────────────
    const obrasEmCurso = obras.filter((o: any) => o.status === "em_curso");
    const obrasConcluidas = obras.filter((o: any) => o.status === "concluida");
    const valorTotalPrevisto = obras.reduce((s: number, o: any) => s + (o.valor_previsto || 0), 0);
    const progressoMedio = obras.length > 0
      ? Math.round(obras.reduce((s: number, o: any) => s + (o.progresso || 0), 0) / obras.length)
      : 0;

    const tarefasPendentes = tarefas.filter((t: any) => t.estado === "pendente" || t.estado === "em_progresso");
    const tarefasAtrasadas = tarefas.filter((t: any) => {
      if (!t.data_limite) return false;
      return new Date(t.data_limite) < new Date() && t.estado !== "concluida";
    });

    // Financial aggregation per obra
    const obraFinancials: Record<string, { receitas: number; despesas: number }> = {};
    for (const c of contas) {
      const oid = (c as any).obra_id;
      if (!oid) continue;
      if (!obraFinancials[oid]) obraFinancials[oid] = { receitas: 0, despesas: 0 };
      const val = (c as any).valor || 0;
      if ((c as any).tipo === "receita") obraFinancials[oid].receitas += val;
      else obraFinancials[oid].despesas += val;
    }

    const contextBlock = `
## DADOS OPERACIONAIS REAIS (${new Date().toISOString()})

### Obras (${obras.length} total, ${obrasEmCurso.length} em curso, ${obrasConcluidas.length} concluídas)
Progresso médio: ${progressoMedio}%
Valor total previsto: €${valorTotalPrevisto.toLocaleString("pt-PT")}
${obras.map((o: any) => {
  const fin = obraFinancials[o.id] || { receitas: 0, despesas: 0 };
  return `- "${o.nome}" | Cliente: ${o.cliente || "N/D"} | Status: ${o.status} | Progresso: ${o.progresso || 0}% | Valor previsto: €${(o.valor_previsto || 0).toLocaleString("pt-PT")} | Despesas reais: €${fin.despesas.toLocaleString("pt-PT")} | Receitas: €${fin.receitas.toLocaleString("pt-PT")} | Início: ${o.data_inicio || "N/D"} | Fim: ${o.data_fim || "N/D"}`;
}).join("\n")}

### Orçamentos (${orcamentos.length} registados)
${orcamentos.map((o: any) => `- ${o.codigo || "S/C"} "${o.titulo}" | Cliente: ${o.cliente_nome || "N/D"} | Status: ${o.status} | Valor: €${(o.valor_total || 0).toLocaleString("pt-PT")} | Margem: ${o.margem_lucro || 0}%`).join("\n")}

### Tarefas (${tarefas.length} total, ${tarefasPendentes.length} pendentes, ${tarefasAtrasadas.length} atrasadas)
${tarefas.slice(0, 10).map((t: any) => `- "${t.titulo}" | Estado: ${t.estado} | Prioridade: ${t.prioridade} | Limite: ${t.data_limite || "N/D"}`).join("\n")}

### RDOs (${rdos.length} registados)
${rdos.slice(0, 5).map((r: any) => `- Data: ${r.data} | Status: ${r.status} | Clima: ${r.condicoes_meteorologicas || "N/D"} | MO: ${r.mao_de_obra_presente || 0}`).join("\n")}

### Alertas Axia Abertos (${insights.length})
${insights.map((i: any) => `- [${i.severity}] ${i.title}: ${i.message}`).join("\n")}

### Autos de Medição (${autos.length})
${autos.slice(0, 5).map((a: any) => `- Auto #${a.numero_auto} | Estado: ${a.estado} | Medido: €${(a.valor_medido_atual || 0).toLocaleString("pt-PT")} | Previsto: €${((a as any).valor_previsto || 0).toLocaleString("pt-PT")} | Progresso: ${a.percentagem_global || 0}%`).join("\n")}

### Equipa Ativa (${equipa.length} membros)
${equipa.slice(0, 15).map((e: any) => `- ${e.nome} | Cargo: ${e.cargo || "N/D"} | ${e.obra_atual_id ? "Alocado a obra" : "Disponível"}`).join("\n")}

### Cronograma (${scheduleTasks.length} tarefas ativas)
${scheduleTasks.slice(0, 15).map((t: any) => {
  const delay = t.planned_end && t.forecast_end ? Math.max(0, Math.ceil((new Date(t.forecast_end).getTime() - new Date(t.planned_end).getTime()) / (1000*60*60*24))) : 0;
  return `- [${t.wbs_code || '-'}] "${t.name}" | Estado: ${t.status_flag} | Real: ${t.actual_progress_percent}% vs Plan: ${t.planned_progress_percent}% | Atraso: ${delay}d | Criticidade: ${t.criticality}`;
}).join("\n")}
`.trim();

    const systemPrompt = buildAxiaChatSystemPrompt({ contextBlock });

    // ── Build messages array ────────────────────────────────
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    if (Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    messages.push({ role: "user", content: question });

    // ── Fase 2 hardening: filtrar PII (NIF, IBAN, email, telefone, salário)
    // do histórico e da pergunta antes de qualquer provedor externo.
    // O contexto operacional (system prompt) é interno à plataforma e fica intacto.
    const scrubbedMessages = [
      messages[0],
      ...scrubMessages(messages.slice(1)),
    ];


    // ── NVIDIA via gateway (feature-flagged, reversible) ────
    const useGateway = (Deno.env.get("AXIA_USE_GATEWAY") ?? "").toLowerCase() === "true";
    const nvidiaEnabled = (Deno.env.get("AXIA_NVIDIA_ENABLED") ?? "").toLowerCase() === "true";
    if (useGateway && nvidiaEnabled) {
      try {
        const nvidiaKey = Deno.env.get("NVIDIA_API_KEY");
        const nvidiaBase = (Deno.env.get("NVIDIA_BASE_URL") || "https://integrate.api.nvidia.com/v1").replace(/\/$/, "");
        const nvidiaModel = Deno.env.get("AXIA_DEFAULT_MODEL");
        if (!nvidiaKey || !nvidiaModel) throw new Error("NVIDIA not configured");

        const nvRes = await fetch(`${nvidiaBase}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${nvidiaKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            model: nvidiaModel,
            temperature: 0.2,
            max_tokens: 1200,
            messages: scrubbedMessages,

          }),
        });
        if (!nvRes.ok) {
          const detail = (await nvRes.text().catch(() => "")).slice(0, 200);
          throw new Error(`NVIDIA ${nvRes.status}: ${detail}`);
        }
        const nvJson = await nvRes.json();
        const content: string = nvJson?.choices?.[0]?.message?.content ?? "";

        // internal log only — no provider/model leaks to the client
        try {
          const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
          await admin.from("axia_ai_logs").insert({
            user_id: user.id,
            module: "axia_chat",
            task_type: "simple_chat",
            provider_used: "nvidia",
            model_used: nvJson?.model ?? nvidiaModel,
            status: "ok",
          });
        } catch (_) { /* ignore */ }

        // Emit SSE in the same shape the frontend already consumes
        const stream = new ReadableStream({
          start(controller) {
            const enc = new TextEncoder();
            const chunkSize = 240;
            for (let i = 0; i < content.length; i += chunkSize) {
              const piece = content.slice(i, i + chunkSize);
              const payload = JSON.stringify({ choices: [{ delta: { content: piece } }] });
              controller.enqueue(enc.encode(`data: ${payload}\n\n`));
            }
            controller.enqueue(enc.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });
        return new Response(stream, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
          },
        });
      } catch (e) {
        console.warn("axia-chat: NVIDIA path failed, falling back to Lovable AI:", (e as Error).message);
        try {
          const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
          await admin.from("axia_ai_logs").insert({
            user_id: user.id,
            module: "axia_chat",
            task_type: "simple_chat",
            provider_used: "nvidia",
            status: "error",
            error_message: (e as Error).message.slice(0, 500),
          });
        } catch (_) { /* ignore */ }
        // fall through to existing Lovable streaming path
      }
    }

    // ── Call Lovable AI Gateway (streaming) ─────────────────
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: resolveChain("simple_chat").primary,
        messages: scrubbedMessages,
        stream: true,
      }),
    });


    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de pedidos excedido. Tente novamente em breve." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos nas definições." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResponse.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    console.error("axia-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
