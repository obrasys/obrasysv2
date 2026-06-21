import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // --- AUTH: require valid JWT ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authenticatedUserId = claimsData.claims.sub as string;

    const { obra_id, budget_id, awarded_amount, awarded_at } = await req.json();
    // SECURITY: derive user_id from JWT, never trust body
    const user_id = authenticatedUserId;

    if (!obra_id || !budget_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = createClient(supabaseUrl, supabaseKey);

    // Authorization: verify caller can read this budget + obra under RLS
    const [{ data: budgetRow, error: budgetAccessError }, { data: obraRow, error: obraAccessError }] =
      await Promise.all([
        userClient.from("orcamentos").select("id").eq("id", budget_id).maybeSingle(),
        userClient.from("obras").select("id").eq("id", obra_id).maybeSingle(),
      ]);

    if (budgetAccessError || obraAccessError || !budgetRow || !obraRow) {
      return new Response(JSON.stringify({ error: "Forbidden: no access to budget or obra" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // 1. Fetch budget chapters + articles
    const { data: capitulos, error: capError } = await client
      .from("capitulos_orcamento")
      .select("id, numero, titulo, valor_total, ordem")
      .eq("orcamento_id", budget_id)
      .order("ordem");

    if (capError) throw capError;
    if (!capitulos || capitulos.length === 0) {
      return new Response(JSON.stringify({ error: "No chapters found for this budget" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const capIds = capitulos.map((c: any) => c.id);
    const { data: artigos, error: artError } = await client
      .from("artigos_orcamento")
      .select("id, capitulo_id, codigo, descricao, unidade, quantidade, preco_unitario, valor_total, ordem")
      .in("capitulo_id", capIds)
      .order("ordem");

    if (artError) throw artError;

    // Build structured input for Axia
    const budgetSummary = capitulos.map((cap: any) => {
      const capArtigos = (artigos || []).filter((a: any) => a.capitulo_id === cap.id);
      return {
        chapter_id: cap.id,
        number: cap.numero,
        title: cap.titulo,
        total_value: cap.valor_total || 0,
        articles: capArtigos.map((a: any) => ({
          id: a.id,
          code: a.codigo,
          description: a.descricao,
          unit: a.unidade,
          quantity: a.quantidade,
          unit_price: a.preco_unitario,
          total: a.valor_total,
        })),
      };
    });

    const totalBudget = capitulos.reduce((s: number, c: any) => s + (c.valor_total || 0), 0);

    // 2. Call Axia (Lovable AI Gateway) for schedule generation
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aiPrompt = `Você é a Axia™, motor de inteligência para planeamento de obras de construção civil em Portugal.

Dado o orçamento adjudicado abaixo, gere um cronograma estimado (planeamento) realista.

ORÇAMENTO (valor total: €${totalBudget.toFixed(2)}):
${JSON.stringify(budgetSummary, null, 2)}

REGRAS:
1. Crie UMA fase (phase) para cada capítulo do orçamento
2. Dentro de cada fase, crie tarefas relevantes agrupando artigos similares (não crie uma tarefa por artigo se forem muitos - agrupe logicamente)
3. Estime durações realistas em dias úteis baseado no tipo de trabalho e quantidades
4. A sequência deve seguir a lógica construtiva (ex: demolições antes de construção, estrutura antes de acabamentos)
5. Os pesos financeiros (weight_financial) de cada fase devem ser proporcionais ao valor do capítulo vs total
6. wbs_code deve seguir formato "1", "1.1", "1.2", "2", "2.1", etc.
7. Cada fase deve ter entre 1 e 5 tarefas (agrupe artigos quando necessário)
8. Durações mínimas: fase = soma das suas tarefas, tarefa = mínimo 1 dia

Responda APENAS com o JSON usando esta estrutura exata, sem markdown:`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are Axia™, a construction project planning AI. Always respond with valid JSON only, no markdown fences." },
          {
            role: "user",
            content: aiPrompt,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_schedule",
              description: "Generate an estimated construction schedule from a budget",
              parameters: {
                type: "object",
                properties: {
                  phases: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        wbs_code: { type: "string" },
                        duration_days: { type: "number" },
                        sort_order: { type: "number" },
                        budget_chapter_id: { type: "string" },
                        weight_financial: { type: "number", description: "0 to 1, proportional to chapter value" },
                        tasks: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              wbs_code: { type: "string" },
                              duration_days: { type: "number" },
                              sort_order: { type: "number" },
                            },
                            required: ["name", "wbs_code", "duration_days", "sort_order"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["name", "wbs_code", "duration_days", "sort_order", "budget_chapter_id", "weight_financial", "tasks"],
                      additionalProperties: false,
                    },
                  },
                  dependencies: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        from_wbs: { type: "string" },
                        to_wbs: { type: "string" },
                        type: { type: "string", enum: ["FS"] },
                        lag: { type: "number" },
                      },
                      required: ["from_wbs", "to_wbs", "type", "lag"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["phases", "dependencies"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_schedule" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const schedule = JSON.parse(toolCall.function.arguments);
    const { phases, dependencies } = schedule;

    if (!phases || phases.length === 0) {
      throw new Error("AI returned empty schedule");
    }

    // 3. Calculate dates from awarded_at
    const startDate = new Date(awarded_at || new Date().toISOString().split("T")[0]);

    function addBusinessDays(date: Date, days: number): Date {
      const result = new Date(date);
      let added = 0;
      while (added < days) {
        result.setDate(result.getDate() + 1);
        const dow = result.getDay();
        if (dow !== 0 && dow !== 6) added++;
      }
      return result;
    }

    function formatDate(d: Date): string {
      return d.toISOString().split("T")[0];
    }

    // Build phase date ranges sequentially
    let currentDate = new Date(startDate);
    const phaseSchedules: Array<{
      phase: any;
      planned_start: string;
      planned_end: string;
      taskSchedules: Array<{ task: any; planned_start: string; planned_end: string }>;
    }> = [];

    for (const phase of phases) {
      const phaseStart = new Date(currentDate);
      let taskDate = new Date(phaseStart);
      const taskSchedules: Array<{ task: any; planned_start: string; planned_end: string }> = [];

      for (const task of phase.tasks || []) {
        const taskStart = new Date(taskDate);
        const taskEnd = addBusinessDays(taskStart, Math.max(1, task.duration_days));
        taskSchedules.push({
          task,
          planned_start: formatDate(taskStart),
          planned_end: formatDate(taskEnd),
        });
        taskDate = new Date(taskEnd);
      }

      const phaseEnd = taskSchedules.length > 0
        ? new Date(taskSchedules[taskSchedules.length - 1].planned_end)
        : addBusinessDays(phaseStart, Math.max(1, phase.duration_days));

      phaseSchedules.push({
        phase,
        planned_start: formatDate(phaseStart),
        planned_end: formatDate(phaseEnd),
        taskSchedules,
      });

      currentDate = new Date(phaseEnd);
    }

    const projectEndDate = phaseSchedules.length > 0
      ? phaseSchedules[phaseSchedules.length - 1].planned_end
      : formatDate(startDate);

    // 4. Check for existing Axia-generated version and get next version number
    const { data: existingAxiaVersion } = await client
      .from("project_schedule_versions")
      .select("id")
      .eq("obra_id", obra_id)
      .eq("generated_by_type", "axia")
      .eq("source_budget_id", budget_id)
      .limit(1);

    if (existingAxiaVersion && existingAxiaVersion.length > 0) {
      // Already has an Axia schedule for this budget - skip
      return new Response(
        JSON.stringify({ success: true, message: "Schedule already exists", version_id: existingAxiaVersion[0].id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existingVersions } = await client
      .from("project_schedule_versions")
      .select("version_no")
      .eq("obra_id", obra_id)
      .order("version_no", { ascending: false })
      .limit(1);
    const nextVersionNo = (existingVersions?.[0]?.version_no || 0) + 1;

    const { data: version, error: vError } = await client
      .from("project_schedule_versions")
      .insert({
        user_id,
        obra_id,
        version_no: nextVersionNo,
        type: "estimated",
        is_baseline: false,
        generated_by_type: "axia",
        source_budget_id: budget_id,
        approval_status: "pending_validation",
        notes: "Cronograma estimado gerado automaticamente pela Axia™ com base no orçamento adjudicado.",
      })
      .select()
      .single();

    if (vError) throw vError;

    // 5. Create tasks (phases + sub-tasks)
    const wbsToTaskId: Record<string, string> = {};
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validChapterIds = new Set(capitulos.map((c: any) => c.id));

    for (let i = 0; i < phaseSchedules.length; i++) {
      const ps = phaseSchedules[i];
      const phaseDuration = Math.round(Math.max(1, ps.phase.duration_days));
      const rawChapterId = ps.phase.budget_chapter_id;
      const safeChapterId =
        typeof rawChapterId === "string" && UUID_RE.test(rawChapterId) && validChapterIds.has(rawChapterId)
          ? rawChapterId
          : (capitulos[i]?.id ?? null);

      const { data: phaseTask, error: ptError } = await client
        .from("project_schedule_tasks")
        .insert({
          user_id,
          obra_id,
          schedule_version_id: version.id,
          name: ps.phase.name,
          task_type: "phase",
          wbs_code: ps.phase.wbs_code,
          budget_chapter_id: safeChapterId,
          planned_start: ps.planned_start,
          planned_end: ps.planned_end,
          planned_duration_days: phaseDuration,
          weight_financial: ps.phase.weight_financial,
          weight_physical: ps.phase.weight_financial,
          progress_method: "manual_structured",
          planned_progress_curve_type: "linear",
          planned_progress_percent: 0,
          actual_progress_percent: 0,
          projected_progress_percent: 0,
          schedule_float_days: 0,
          criticality: "non_critical",
          status_flag: "not_started",
          sort_order: Math.round(ps.phase.sort_order),
        })
        .select()
        .single();

      if (ptError) throw ptError;
      wbsToTaskId[ps.phase.wbs_code] = phaseTask.id;

      // Sub-tasks
      for (const ts of ps.taskSchedules) {
        const taskDuration = Math.round(Math.max(1, ts.task.duration_days));
        const { data: subTask, error: stError } = await client
          .from("project_schedule_tasks")
          .insert({
            user_id,
            obra_id,
            schedule_version_id: version.id,
            parent_task_id: phaseTask.id,
            name: ts.task.name,
            task_type: "task",
            wbs_code: ts.task.wbs_code,
            planned_start: ts.planned_start,
            planned_end: ts.planned_end,
            planned_duration_days: taskDuration,
            remaining_duration_days: taskDuration,
            weight_physical: 1,
            progress_method: "manual_structured",
            planned_progress_curve_type: "linear",
            planned_progress_percent: 0,
            actual_progress_percent: 0,
            projected_progress_percent: 0,
            schedule_float_days: 0,
            criticality: "non_critical",
            status_flag: "not_started",
            sort_order: Math.round(ts.task.sort_order),
          })
          .select()
          .single();

        if (stError) throw stError;
        wbsToTaskId[ts.task.wbs_code] = subTask.id;
      }
    }

    // 6. Create dependencies
    if (dependencies && dependencies.length > 0) {
      const depsToInsert = dependencies
        .filter((d: any) => wbsToTaskId[d.from_wbs] && wbsToTaskId[d.to_wbs])
        .map((d: any) => ({
          user_id,
          obra_id,
          predecessor_task_id: wbsToTaskId[d.from_wbs],
          successor_task_id: wbsToTaskId[d.to_wbs],
          dependency_type: d.type || "FS",
          lag_days: d.lag || 0,
        }));

      if (depsToInsert.length > 0) {
        const { error: depError } = await client
          .from("project_schedule_dependencies")
          .insert(depsToInsert);
        if (depError) console.error("Dependencies insert error:", depError);
      }
    }

    // 7. Create milestones (start + end)
    const firstPhaseTaskId = phaseSchedules.length > 0
      ? wbsToTaskId[phaseSchedules[0].phase.wbs_code]
      : null;
    const lastPhaseTaskId = phaseSchedules.length > 0
      ? wbsToTaskId[phaseSchedules[phaseSchedules.length - 1].phase.wbs_code]
      : null;

    const milestones = [
      {
        user_id,
        obra_id,
        name: "Início da Obra",
        planned_date: formatDate(startDate),
        status: "planned",
        risk_level: "low",
        related_task_id: firstPhaseTaskId,
      },
      {
        user_id,
        obra_id,
        name: "Conclusão da Obra",
        planned_date: projectEndDate,
        status: "planned",
        risk_level: "low",
        related_task_id: lastPhaseTaskId,
      },
    ];

    const { error: mError } = await client.from("project_milestones").insert(milestones);
    if (mError) console.error("Milestones insert error:", mError);

    return new Response(
      JSON.stringify({
        success: true,
        version_id: version.id,
        phases_count: phases.length,
        total_tasks: Object.keys(wbsToTaskId).length,
        project_end_date: projectEndDate,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-estimated-schedule error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
