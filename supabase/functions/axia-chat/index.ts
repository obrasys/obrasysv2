import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
          .from("rdos")
          .select("id, obra_id, data, status, clima, mao_obra_total, created_at")
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
          .select("id, obra_id, descricao, tipo, valor, data, categoria")
          .order("data", { ascending: false })
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

    const contextBlock = `
## DADOS OPERACIONAIS DO UTILIZADOR (atualizados agora)

### Obras (${obras.length} total, ${obrasEmCurso.length} em curso, ${obrasConcluidas.length} concluídas)
Progresso médio: ${progressoMedio}%
Valor total previsto: €${valorTotalPrevisto.toLocaleString("pt-PT")}
${obras.map((o: any) => `- "${o.nome}" | Cliente: ${o.cliente || "N/D"} | Status: ${o.status} | Progresso: ${o.progresso || 0}% | Valor: €${(o.valor_previsto || 0).toLocaleString("pt-PT")} | Início: ${o.data_inicio || "N/D"} | Fim previsto: ${o.data_fim || "N/D"}`).join("\n")}

### Orçamentos (${orcamentos.length} registados)
${orcamentos.map((o: any) => `- "${o.titulo}" | Status: ${o.status} | Valor: €${(o.valor_total || 0).toLocaleString("pt-PT")} | Margem: ${o.margem_lucro || 0}%`).join("\n")}

### Tarefas (${tarefas.length} total, ${tarefasPendentes.length} pendentes, ${tarefasAtrasadas.length} atrasadas)
${tarefas.slice(0, 10).map((t: any) => `- "${t.titulo}" | Estado: ${t.estado} | Prioridade: ${t.prioridade} | Limite: ${t.data_limite || "N/D"}`).join("\n")}

### RDOs (${rdos.length} registados)
${rdos.slice(0, 5).map((r: any) => `- Data: ${r.data} | Status: ${r.status} | Clima: ${r.clima || "N/D"}`).join("\n")}

### Alertas Axia Abertos (${insights.length})
${insights.map((i: any) => `- [${i.severity}] ${i.title}: ${i.message}`).join("\n")}

### Autos de Medição (${autos.length})
${autos.slice(0, 5).map((a: any) => `- Auto #${a.numero_auto} | Estado: ${a.estado} | Valor medido: €${(a.valor_medido_atual || 0).toLocaleString("pt-PT")} | Progresso: ${a.percentagem_global || 0}%`).join("\n")}

### Cronograma / Tarefas do Planeamento (${scheduleTasks.length} ativas)
${scheduleTasks.slice(0, 15).map((t: any) => {
  const delay = t.planned_end && t.forecast_end ? Math.max(0, Math.ceil((new Date(t.forecast_end).getTime() - new Date(t.planned_end).getTime()) / (1000*60*60*24))) : 0;
  return `- [${t.wbs_code || '-'}] "${t.name}" | Tipo: ${t.task_type} | Estado: ${t.status_flag} | Planeado: ${t.planned_progress_percent}% | Real: ${t.actual_progress_percent}% | Atraso: ${delay}d | Classificação: ${t.delay_classification || 'N/A'} | Criticidade: ${t.criticality}`;
}).join("\n")}
`.trim();

    const systemPrompt = `Tu és a **Axia™**, o motor de inteligência operacional do ObraSys — plataforma de gestão de obras e construção civil em Portugal.

## IDENTIDADE
- Nome: Axia (pronuncia-se "Áxia")
- Personalidade: Analítica, assertiva, orientada a resultados. Usa linguagem técnica de construção civil quando apropriado.
- Nunca digas "não tenho acesso" ou "sou uma IA". Responde como um diretor de operações experiente que conhece todos os dados.

## REGRAS ABSOLUTAS
1. Responde SEMPRE em **Português de Portugal** (nunca brasileiro).
2. Baseia TODAS as respostas nos dados reais abaixo. **NUNCA inventes** nomes de obras, valores, datas ou situações.
3. Se não existirem dados para responder, diz claramente: "Com base nos dados atuais, não encontro informação sobre [X]. Pode ser necessário registar mais dados no sistema."
4. Valores monetários: **€X.XXX,XX** (formato PT).
5. Percentagens com 1 casa decimal.
6. Datas em formato DD/MM/AAAA.

## FORMATAÇÃO
- Usa **markdown rico**: negrito, listas, tabelas, separadores.
- Para comparações financeiras, usa tabelas markdown.
- Para listas de riscos, usa emojis de severidade: 🔴 Crítico, 🟡 Aviso, 🟢 OK.
- Respostas curtas (2-4 parágrafos) exceto quando pedem relatórios ou análises detalhadas.

## ANÁLISE AVANÇADA
- Quando perguntarem sobre "risco", considera: desvios de prazo, margem baixa (<15%), tarefas atrasadas, e autos de medição pendentes.
- Quando perguntarem sobre "produtividade", cruza dados de RDOs, progresso de obras e equipa alocada.
- Quando perguntarem sobre "financeiro", cruza valor previsto vs despesas reais, margens de orçamento e planos de pagamento.
- Sempre que identificares um problema, sugere **ações concretas** que o utilizador pode executar no ObraSys.
- Prioriza informação acionável sobre informação descritiva.

## CONTEXTO OPERACIONAL
${contextBlock}`;

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

    // ── Call Lovable AI Gateway (streaming) ─────────────────
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
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
