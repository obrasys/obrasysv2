import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { logAxiaCall } from "../_shared/axia/logCall.ts";
import {
  SUPPORT_CHAT_PROMPT_ID,
  SUPPORT_CHAT_PROMPT_VERSION,
} from "../_shared/axia/prompts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o Assistente Oficial do ObraSys, um software de gestão de obras e construção civil.

Seu papel é ajudar os utilizadores com:
- Dúvidas sobre como usar o ObraSys (orçamentos, obras, RDOs, tarefas, clientes, base de preços)
- Resolução de problemas técnicos
- Boas práticas de gestão de obras
- Explicações sobre funcionalidades do sistema

Diretrizes:
- Responda sempre em português de Portugal
- Seja educado, profissional e conciso
- Se não souber a resposta, sugira contactar o suporte via email ou WhatsApp
- Use formatação simples (sem markdown complexo)
- Foque em ser útil e prático

Funcionalidades principais do ObraSys:
1. Orçamentos - Criação e gestão de orçamentos de obras com capítulos e artigos
2. Obras - Gestão de projetos de construção com acompanhamento de progresso
3. RDOs - Relatórios Diários de Obra para documentação diária
4. Tarefas - Gestão de cronogramas e tarefas com dependências
5. Clientes - Base de dados de clientes e contactos
6. Base de Preços - Catálogo centralizado de preços de materiais
7. Conformidade - Documentos e checklists de conformidade legal`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Não autorizado. Faça login para usar o chat de suporte." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client and verify user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const admin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error("Authentication failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Sessão inválida. Faça login novamente." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", user.id);

    const { messages: rawMessages } = await req.json();

    // Sanitize client-supplied history to prevent prompt injection:
    // - drop any role other than user/assistant (no client-supplied system/tool messages)
    // - enforce per-message length cap
    // - cap total history depth
    const safeMessages = Array.isArray(rawMessages)
      ? rawMessages
          .filter(
            (m: any) =>
              m &&
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string" &&
              m.content.length <= 4000,
          )
          .slice(-20)
          .map((m: any) => ({ role: m.role, content: m.content }))
      : [];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Sending request to AI Gateway...");
    console.log("Messages count:", safeMessages.length);

    const t0 = Date.now();
    const aiModel = "google/gemini-3-flash-preview";
    const logBase = {
      module: SUPPORT_CHAT_PROMPT_ID,
      task_type: `${SUPPORT_CHAT_PROMPT_ID}@${SUPPORT_CHAT_PROMPT_VERSION}`,
      provider_used: "lovable",
      model_used: aiModel,
      user_id: user.id,
    };
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...safeMessages,
        ],
        stream: true,
      }),
    });


    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      await logAxiaCall(admin, {
        ...logBase,
        status: response.status === 429 ? "rate_limited" : "error",
        latency_ms: Date.now() - t0,
        error_message: `AI ${response.status}: ${errorText.slice(0, 200)}`,
      });

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de pedidos excedido. Por favor, tente novamente mais tarde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Por favor, contacte o suporte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erro no serviço de IA. Por favor, tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Streaming response from AI...");

    // Stream begins OK — log once latency-to-first-byte is measured.
    await logAxiaCall(admin, {
      ...logBase,
      status: "ok",
      latency_ms: Date.now() - t0,
    });

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Support chat error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});