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
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

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

    // ── Fetch all operational data in parallel ──────────────
    const [
      obrasRes, orcamentosRes, tarefasRes, insightsRes,
      scheduleRes, contasRes, autosMedicaoRes, equipaRes, rdosRes,
    ] = await Promise.all([
      supabase.from("obras")
        .select("id, nome, cliente, status, progresso, valor_previsto, data_inicio, data_fim, orcamento_total, custo_atual, arquivada")
        .eq("arquivada", false)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase.from("orcamentos")
        .select("id, titulo, codigo, status, valor_total, margem_lucro, created_at, updated_at, cliente_nome")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase.from("tarefas")
        .select("id, titulo, estado, prioridade, obra_id, data_limite, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("ai_budget_insights")
        .select("id, title, message, type, severity, status, budget_id, created_at")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase.from("project_schedule_tasks")
        .select("id, obra_id, name, task_type, wbs_code, status_flag, planned_start, planned_end, forecast_end, actual_start, actual_end, planned_progress_percent, actual_progress_percent, delay_classification, criticality, weight_financial, planned_duration_days, remaining_duration_days")
        .in("status_flag", ["in_progress", "started", "suspended", "not_started"])
        .order("updated_at", { ascending: false })
        .limit(50),
      supabase.from("contas_financeiras")
        .select("id, obra_id, descricao, tipo, valor, data, categoria, status")
        .order("data", { ascending: false })
        .limit(100),
      supabase.from("autos_medicao")
        .select("id, obra_id, numero_auto, estado, valor_medido_atual, valor_previsto, percentagem_global, data_emissao")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("equipa_membros")
        .select("id, nome, cargo, ativo, obra_atual_id")
        .eq("ativo", true)
        .limit(50),
      supabase.from("rdos")
        .select("id, obra_id, data, status, clima, mao_obra_total, created_at")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const obras = obrasRes.data || [];
    const orcamentos = orcamentosRes.data || [];
    const tarefas = tarefasRes.data || [];
    const insights = insightsRes.data || [];
    const scheduleTasks = scheduleRes.data || [];
    const contas = contasRes.data || [];
    const autos = autosMedicaoRes.data || [];
    const equipa = equipaRes.data || [];
    const rdos = rdosRes.data || [];

    // ── Pre-compute data for context ────────────────────────
    const obrasEmCurso = obras.filter((o: any) => o.status === "em_curso");
    const now = new Date();

    // Schedule delays
    const tasksWithDelay = scheduleTasks
      .filter((t: any) => t.planned_end && t.forecast_end)
      .map((t: any) => ({
        ...t,
        delay_days: Math.ceil((new Date(t.forecast_end).getTime() - new Date(t.planned_end).getTime()) / (1000 * 60 * 60 * 24)),
      }))
      .filter((t: any) => t.delay_days !== 0);

    // Financial data per obra
    const obraFinancials: Record<string, { receitas: number; despesas: number }> = {};
    for (const c of contas) {
      const oid = (c as any).obra_id;
      if (!oid) continue;
      if (!obraFinancials[oid]) obraFinancials[oid] = { receitas: 0, despesas: 0 };
      const val = (c as any).valor || 0;
      if ((c as any).tipo === "receita") obraFinancials[oid].receitas += val;
      else obraFinancials[oid].despesas += val;
    }

    // Tarefas atrasadas
    const tarefasAtrasadas = tarefas.filter((t: any) =>
      t.data_limite && new Date(t.data_limite) < now && t.estado !== "concluida"
    );

    // Budgets pending approval
    const orcamentosAntigos = orcamentos.filter((o: any) => {
      if (o.status !== "rascunho") return false;
      const daysSinceCreation = Math.ceil((now.getTime() - new Date(o.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceCreation > 7;
    });

    // ── Build comprehensive context for AI ──────────────────
    const contextBlock = `
## DADOS OPERACIONAIS REAIS (${new Date().toISOString()})

### OBRAS (${obras.length} total, ${obrasEmCurso.length} em curso)
${obras.map((o: any) => {
  const fin = obraFinancials[o.id] || { receitas: 0, despesas: 0 };
  const desvio = o.valor_previsto ? ((fin.despesas - o.valor_previsto) / o.valor_previsto * 100).toFixed(1) : "N/A";
  return `- "${o.nome}" | Cliente: ${o.cliente || "N/D"} | Status: ${o.status} | Progresso: ${o.progresso || 0}% | Valor previsto: €${(o.valor_previsto || 0).toLocaleString("pt-PT")} | Despesas reais: €${fin.despesas.toLocaleString("pt-PT")} | Desvio: ${desvio}% | Início: ${o.data_inicio || "N/D"} | Fim: ${o.data_fim || "N/D"}`;
}).join("\n")}

### ORÇAMENTOS (${orcamentos.length})
${orcamentos.map((o: any) => {
  const age = Math.ceil((now.getTime() - new Date(o.created_at).getTime()) / (1000*60*60*24));
  return `- ${o.codigo || "S/C"} "${o.titulo}" | Cliente: ${o.cliente_nome || "N/D"} | Status: ${o.status} | Valor: €${(o.valor_total || 0).toLocaleString("pt-PT")} | Margem: ${o.margem_lucro || 0}% | Idade: ${age}d`;
}).join("\n")}

### TAREFAS (${tarefas.length} total, ${tarefasAtrasadas.length} atrasadas)
${tarefasAtrasadas.slice(0, 10).map((t: any) => {
  const diasAtraso = Math.ceil((now.getTime() - new Date(t.data_limite).getTime()) / (1000*60*60*24));
  return `- [ATRASADA ${diasAtraso}d] "${t.titulo}" | Prioridade: ${t.prioridade} | Estado: ${t.estado}`;
}).join("\n")}

### CRONOGRAMA - DESVIOS (${tasksWithDelay.length} tarefas com desvio)
${tasksWithDelay.slice(0, 15).map((t: any) => 
  `- [${t.wbs_code || '-'}] "${t.name}" | Atraso: ${t.delay_days}d | Progresso real: ${t.actual_progress_percent}% vs planeado: ${t.planned_progress_percent}% | Criticidade: ${t.criticality} | Classificação: ${t.delay_classification || 'N/A'}`
).join("\n")}

### ALERTAS AI EXISTENTES (${insights.length} abertos)
${insights.map((i: any) => `- [${i.severity}] ${i.title}: ${i.message}`).join("\n")}

### AUTOS DE MEDIÇÃO (${autos.length})
${autos.slice(0, 10).map((a: any) => `- Auto #${a.numero_auto} | Estado: ${a.estado} | Valor medido: €${(a.valor_medido_atual || 0).toLocaleString("pt-PT")} | Previsto: €${(a.valor_previsto || 0).toLocaleString("pt-PT")} | Progresso: ${a.percentagem_global || 0}%`).join("\n")}

### EQUIPA ATIVA (${equipa.length} membros)
${equipa.slice(0, 10).map((e: any) => `- ${e.nome} | Cargo: ${e.cargo || "N/D"} | Obra: ${e.obra_atual_id ? "Alocado" : "Disponível"}`).join("\n")}

### RDOs RECENTES (${rdos.length})
${rdos.slice(0, 10).map((r: any) => `- Data: ${r.data} | Status: ${r.status} | Clima: ${r.clima || "N/D"} | Mão-de-obra: ${r.mao_obra_total || 0}h`).join("\n")}

### ORÇAMENTOS SEM REVISÃO (${orcamentosAntigos.length})
${orcamentosAntigos.map((o: any) => `- ${o.codigo || "S/C"} "${o.titulo}" | Idade: ${Math.ceil((now.getTime() - new Date(o.created_at).getTime()) / (1000*60*60*24))}d`).join("\n")}
`.trim();

    const systemPrompt = `Tu és a Axia, o motor de inteligência da plataforma ObraSys. Analisa os dados operacionais reais fornecidos e gera uma análise estruturada COMPLETA.

REGRAS ABSOLUTAS:
- Usa APENAS dados reais fornecidos. NUNCA inventes nomes de obras, valores ou situações.
- Se não existirem dados suficientes para uma secção, retorna array vazio para essa secção.
- Valores monetários em formato numérico (sem símbolos).
- Prioridades: "critical", "high", "medium", "low".
- Sê específico: menciona nomes de obras, códigos de orçamento, valores concretos.
- Cada item deve ter contexto suficiente para o utilizador agir.
- Responde APENAS com o JSON da tool call, nada mais.

${contextBlock}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Analisa todos os dados operacionais e gera a análise completa para o painel da Central de Inteligência. Preenche TODAS as secções com dados reais. Se alguma secção não tem dados relevantes, retorna array vazio." },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_axia_analysis",
              description: "Gera a análise completa da Central de Inteligência Axia com dados reais",
              parameters: {
                type: "object",
                properties: {
                  sugestoes: {
                    type: "array",
                    description: "Sugestões automáticas para otimizar operações (max 6)",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string", description: "Título curto da sugestão" },
                        detail: { type: "string", description: "Descrição detalhada com valores concretos" },
                        priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
                        category: { type: "string", enum: ["preco", "margem", "eficiencia", "falta", "otimizacao", "prazo"] },
                      },
                      required: ["label", "detail", "priority", "category"],
                      additionalProperties: false,
                    },
                  },
                  alertas_orcamento: {
                    type: "array",
                    description: "Riscos e alertas identificados nos orçamentos (max 6)",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string", description: "Título do alerta" },
                        detail: { type: "string", description: "Descrição com dados concretos" },
                        severity: { type: "string", enum: ["critical", "warn", "info"] },
                      },
                      required: ["label", "detail", "severity"],
                      additionalProperties: false,
                    },
                  },
                  alertas_prazo: {
                    type: "array",
                    description: "Obras/tarefas com desvios de prazo (max 6)",
                    items: {
                      type: "object",
                      properties: {
                        obra: { type: "string", description: "Nome da obra" },
                        dias: { type: "number", description: "Dias de atraso (positivo) ou adiantamento (negativo)" },
                        tipo: { type: "string", enum: ["atraso", "adiantado"] },
                        detail: { type: "string", description: "Contexto adicional" },
                      },
                      required: ["obra", "dias", "tipo"],
                      additionalProperties: false,
                    },
                  },
                  inconsistencias: {
                    type: "array",
                    description: "Erros e anomalias encontrados nos dados (max 6)",
                    items: {
                      type: "object",
                      properties: {
                        desc: { type: "string", description: "Descrição da inconsistência" },
                        tipo: { type: "string", enum: ["preço", "duplicado", "unidade", "margem", "dados", "prazo"] },
                      },
                      required: ["desc", "tipo"],
                      additionalProperties: false,
                    },
                  },
                  previsao_desvios: {
                    type: "array",
                    description: "Previsão de desvios financeiros por obra (max 6)",
                    items: {
                      type: "object",
                      properties: {
                        obra: { type: "string", description: "Nome da obra" },
                        desvio_percent: { type: "number", description: "Desvio percentual (positivo = acima, negativo = abaixo)" },
                        valor: { type: "number", description: "Desvio em euros" },
                        detail: { type: "string", description: "Explicação do desvio" },
                      },
                      required: ["obra", "desvio_percent", "valor"],
                      additionalProperties: false,
                    },
                  },
                  insights_obra: {
                    type: "array",
                    description: "Observações inteligentes sobre obras ativas (max 6)",
                    items: {
                      type: "object",
                      properties: {
                        obra: { type: "string", description: "Nome da obra" },
                        insight: { type: "string", description: "Observação concreta e acionável" },
                        tipo: { type: "string", enum: ["produtividade", "custo", "positivo", "risco", "prazo"] },
                      },
                      required: ["obra", "insight", "tipo"],
                      additionalProperties: false,
                    },
                  },
                  resumo_executivo: {
                    type: "string",
                    description: "Resumo executivo de 2-3 frases sobre o estado geral das operações",
                  },
                },
                required: ["sugestoes", "alertas_orcamento", "alertas_prazo", "inconsistencias", "previsao_desvios", "insights_obra", "resumo_executivo"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_axia_analysis" } },
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
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
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

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in AI response:", JSON.stringify(aiResult));
      return new Response(JSON.stringify({ error: "Resposta da IA inválida" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let analysis;
    try {
      analysis = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } catch (e) {
      console.error("Failed to parse AI arguments:", toolCall.function.arguments);
      return new Response(JSON.stringify({ error: "Erro ao processar análise" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("axia-analysis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
