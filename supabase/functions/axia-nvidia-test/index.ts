import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getPrompt } from '../_shared/axia/prompts.ts';
import { logAxiaCall } from '../_shared/axia/logCall.ts';

const SYSTEM_PROMPT = getPrompt('axia-nvidia-test').system;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // SECURITY: require authenticated caller (prevents NVIDIA API credit abuse)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const authHeader = req.headers.get('Authorization');
    if (!supabaseUrl || !anonKey) {
      return new Response(JSON.stringify({ error: 'Configuração inválida' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Restrict to super-admins (test endpoint)
    const { data: isAdmin } = await userClient.rpc('is_super_admin');
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Apenas super-admins' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    const apiKey = Deno.env.get('NVIDIA_API_KEY');
    const baseUrl = Deno.env.get('NVIDIA_BASE_URL') || 'https://integrate.api.nvidia.com/v1';
    const model = Deno.env.get('AXIA_DEFAULT_MODEL');
    const enabled = Deno.env.get('AXIA_NVIDIA_ENABLED');

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'NVIDIA_API_KEY não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!model) {
      return new Response(JSON.stringify({ error: 'AXIA_DEFAULT_MODEL não configurado' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (enabled && enabled.toLowerCase() === 'false') {
      return new Response(JSON.stringify({ error: 'Integração NVIDIA desativada (AXIA_NVIDIA_ENABLED=false)' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: { message?: unknown };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'JSON inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const message = body?.message;
    if (typeof message !== 'string' || message.trim().length === 0 || message.length > 8000) {
      return new Response(JSON.stringify({ error: 'Campo "message" inválido (string 1-8000 chars)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const t0 = Date.now();
    const upstream = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 800,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      // sanitize: never echo headers; trim and avoid leaking
      const safe = text.slice(0, 500);
      console.error('NVIDIA upstream error', upstream.status);
      await logAxiaCall(adminClient, {
        module: 'axia_nvidia_test',
        task_type: 'smoke_test',
        provider_used: 'nvidia',
        model_used: model,
        status: 'error',
        latency_ms: Date.now() - t0,
        user_id: user.id,
        error_message: `HTTP ${upstream.status}: ${safe}`,
      });
      return new Response(JSON.stringify({
        error: 'Falha na chamada à NVIDIA',
        status: upstream.status,
        detail: safe,
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await upstream.json();
    let answer: string = data?.choices?.[0]?.message?.content ?? '';
    const modelUsed = data?.model ?? model;

    // Sanitização: remover tags técnicas que o modelo possa devolver no texto
    const technicalTagPattern = /\s*\**\s*Proposed\s*\/\s*Draft\s*\/\s*Requires[_ ]?Human[_ ]?Review\s*\.?\**\s*$/i;
    const hadTechnicalTag = technicalTagPattern.test(answer);
    answer = answer.replace(technicalTagPattern, '').trimEnd();

    // Heurísticas de revisão humana e avisos
    const lower = answer.toLowerCase();
    const financialKeywords = ['margem', 'custo', 'venda', 'rai', 'eac', 'forecast', 'desvio', 'orçamento', 'lucro', 'financeir'];
    const mentionsFinance = financialKeywords.some((k) => lower.includes(k));
    const lacksData = /sem (esses |estes )?dados|preciso (de |consultar)|não (tenho|possuo) (acesso|dados)|dados (insuficientes|determinístic)/i.test(answer);

    const requiresHumanReview = hadTechnicalTag || mentionsFinance;
    const warnings: string[] = [];
    if (mentionsFinance && lacksData) {
      warnings.push('Dados financeiros insuficientes para um cálculo determinístico.');
    }

    // Garantir frase final amigável quando envolve análise financeira
    if (requiresHumanReview && !/validação humana/i.test(answer)) {
      answer = `${answer}\n\nEsta análise requer validação humana.`;
    }

    await logAxiaCall(adminClient, {
      module: 'axia_nvidia_test',
      task_type: 'smoke_test',
      provider_used: 'nvidia',
      model_used: modelUsed,
      status: 'ok',
      latency_ms: Date.now() - t0,
      user_id: user.id,
    });

    return new Response(JSON.stringify({
      provider_used: 'nvidia',
      model_used: modelUsed,
      answer,
      requires_human_review: requiresHumanReview,
      warnings,
      suggestions: [],
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('axia-nvidia-test error', (err as Error)?.message);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
