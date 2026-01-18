import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrabalhoQuantificado {
  descricao: string;
  quantidade: number;
  unidade: string;
}

interface RDO {
  id: string;
  data: string;
  trabalhos_executados: string | null;
  trabalhos_quantificados: TrabalhoQuantificado[];
  ocorrencias: string | null;
  status: string;
}

interface ObraProgressTracking {
  id: string;
  descricao: string;
  quantidade_prevista: number;
  quantidade_executada: number;
  unidade: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { obra_id } = await req.json();
    console.log("Calculating progress for obra:", obra_id);

    if (!obra_id) {
      console.error("Missing obra_id parameter");
      return new Response(
        JSON.stringify({ error: "obra_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Autorização necessária" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Configuração da API de IA não encontrada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch obra details
    const { data: obra, error: obraError } = await supabase
      .from("obras")
      .select("id, nome, status, progresso, valor_previsto")
      .eq("id", obra_id)
      .single();

    if (obraError || !obra) {
      console.error("Error fetching obra:", obraError);
      return new Response(
        JSON.stringify({ error: "Obra não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Obra found:", obra.nome);

    // Fetch all RDOs for this obra
    const { data: rdos, error: rdosError } = await supabase
      .from("relatorios_diarios")
      .select("id, data, trabalhos_executados, trabalhos_quantificados, ocorrencias, status")
      .eq("obra_id", obra_id)
      .eq("status", "aprovado")
      .order("data", { ascending: true });

    if (rdosError) {
      console.error("Error fetching RDOs:", rdosError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar relatórios diários" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${rdos?.length || 0} approved RDOs`);

    // Fetch progress tracking items
    const { data: progressItems, error: progressError } = await supabase
      .from("obra_progress_tracking")
      .select("id, descricao, quantidade_prevista, quantidade_executada, unidade")
      .eq("obra_id", obra_id);

    if (progressError) {
      console.error("Error fetching progress tracking:", progressError);
    }

    console.log(`Found ${progressItems?.length || 0} progress tracking items`);

    // Parse trabalhos_quantificados from RDOs
    const allTrabalhosQuantificados: Array<TrabalhoQuantificado & { data: string }> = [];
    rdos?.forEach((rdo: RDO) => {
      if (rdo.trabalhos_quantificados && Array.isArray(rdo.trabalhos_quantificados)) {
        rdo.trabalhos_quantificados.forEach((trabalho: TrabalhoQuantificado) => {
          allTrabalhosQuantificados.push({
            ...trabalho,
            data: rdo.data,
          });
        });
      }
    });

    console.log(`Total quantified works from RDOs: ${allTrabalhosQuantificados.length}`);

    // Build context for AI analysis
    const context = {
      obra: {
        nome: obra.nome,
        status: obra.status,
        progressoAtual: obra.progresso,
      },
      rdos: rdos?.map((rdo: RDO) => ({
        data: rdo.data,
        trabalhosExecutados: rdo.trabalhos_executados,
        trabalhoQuantificados: rdo.trabalhos_quantificados,
        ocorrencias: rdo.ocorrencias,
      })) || [],
      progressTracking: progressItems || [],
      trabalhosQuantificadosTotal: allTrabalhosQuantificados,
    };

    // Create the prompt for AI analysis
    const systemPrompt = `Você é um especialista em gestão de obras de construção civil. 
Sua tarefa é analisar os dados fornecidos e calcular o progresso real da obra baseado nos relatórios diários (RDOs) e trabalhos quantificados.

IMPORTANTE:
- Analise todos os trabalhos quantificados nos RDOs aprovados
- Compare com os itens de acompanhamento de progresso (se existirem)
- Considere o histórico de ocorrências que possam impactar o progresso
- Calcule uma percentagem de progresso realista (0-100)
- Forneça uma justificativa clara para o cálculo

Responda APENAS com o JSON estruturado, sem texto adicional.`;

    const userPrompt = `Analise os seguintes dados da obra "${obra.nome}" e calcule o progresso:

Dados da Obra:
${JSON.stringify(context, null, 2)}

Calcule o progresso geral da obra considerando:
1. Total de trabalhos quantificados executados
2. Comparação com quantidades previstas (se disponíveis)
3. Evolução temporal dos trabalhos
4. Impacto de ocorrências registadas`;

    console.log("Calling AI Gateway for progress calculation...");

    // Call AI Gateway
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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "calculate_progress",
              description: "Retorna o cálculo do progresso da obra",
              parameters: {
                type: "object",
                properties: {
                  progresso: {
                    type: "number",
                    description: "Percentagem de progresso da obra (0-100)",
                  },
                  justificativa: {
                    type: "string",
                    description: "Explicação detalhada do cálculo",
                  },
                  resumo_trabalhos: {
                    type: "string",
                    description: "Resumo dos principais trabalhos executados",
                  },
                  alertas: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lista de alertas ou preocupações identificadas",
                  },
                  sugestoes: {
                    type: "array",
                    items: { type: "string" },
                    description: "Sugestões para melhorar o acompanhamento",
                  },
                },
                required: ["progresso", "justificativa"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "calculate_progress" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente mais tarde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Por favor, adicione créditos à sua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erro ao processar análise de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");

    // Extract the tool call result
    let result;
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Error parsing tool call arguments:", e);
      }
    }

    if (!result) {
      console.error("Could not extract result from AI response");
      return new Response(
        JSON.stringify({ error: "Erro ao processar resposta da IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Calculated progress:", result.progresso);

    // Update obra progress in database
    const { error: updateError } = await supabase
      .from("obras")
      .update({ 
        progresso: Math.min(100, Math.max(0, result.progresso)),
        updated_at: new Date().toISOString(),
      })
      .eq("id", obra_id);

    if (updateError) {
      console.error("Error updating obra progress:", updateError);
      // Don't fail the request, just log the error
    } else {
      console.log("Obra progress updated successfully");
    }

    return new Response(
      JSON.stringify({
        success: true,
        progresso: result.progresso,
        justificativa: result.justificativa,
        resumo_trabalhos: result.resumo_trabalhos,
        alertas: result.alertas || [],
        sugestoes: result.sugestoes || [],
        dados_analisados: {
          total_rdos: rdos?.length || 0,
          total_trabalhos_quantificados: allTrabalhosQuantificados.length,
          itens_progresso: progressItems?.length || 0,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
