import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SYSTEM_PROMPT = `És a Axia, assistente do Obra Sys. Responde em português europeu. Ajuda em gestão de obra, orçamento, compras, medições, folha de fecho, MCE, Forecast, EAC, RAI, documentos e apoio ao utilizador.

REGRAS:
- Nunca inventes valores financeiros, margens, RAI, EAC, Forecast, desvios ou totais.
- Quando não tiveres dados determinísticos do sistema, diz claramente que precisas desses dados e indica que fontes do Obra Sys devem ser consultadas (orçamento aprovado, custos registados, vendas previstas/confirmadas, compras/adjudicações, medições, folha de fecho).
- Sugestões financeiras voltam como proposta/draft e devem ser validadas por humano. Termina respostas financeiras com a frase: "Esta análise requer validação humana."
- Nunca escrevas tags técnicas como "Proposed/Draft/Requires_Human_Review" no texto.
- Não reveles dados sensíveis, margem ou RAI a fornecedores ou utilizadores externos.`;

const FALLBACK_MODEL = 'google/gemini-2.5-flash';
const TECHNICAL_TAG = /\s*\**\s*Proposed\s*\/\s*Draft\s*\/\s*Requires[_ ]?Human[_ ]?Review\s*\.?\**\s*$/i;

type Input = {
  organization_id?: string;
  user_id?: string;
  module?: string;
  task_type?: string;
  message?: string;
  obra_id?: string;
  metadata?: Record<string, unknown>;
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function postProcess(rawAnswer: string, taskType: string, providerUsed: string, modelUsed: string) {
  let answer = (rawAnswer ?? '').toString();
  const hadTag = TECHNICAL_TAG.test(answer);
  answer = answer.replace(TECHNICAL_TAG, '').trimEnd();

  const lower = answer.toLowerCase();
  const financialKeywords = ['margem', 'custo', 'venda', 'rai', 'eac', 'forecast', 'desvio', 'orçamento', 'lucro', 'financeir'];
  const mentionsFinance = financialKeywords.some((k) => lower.includes(k));
  const lacksData = /sem (esses |estes )?dados|preciso (de |consultar)|não (tenho|possuo) (acesso|dados)|dados (insuficientes|determinístic)/i.test(answer);

  const requires_human_review = hadTag || mentionsFinance;
  const warnings: string[] = [];
  if (mentionsFinance && lacksData) {
    warnings.push('Dados financeiros insuficientes para um cálculo determinístico.');
  }
  if (requires_human_review && !/validação humana/i.test(answer)) {
    answer = `${answer}\n\nEsta análise requer validação humana.`;
  }

  return {
    answer,
    provider_used: providerUsed,
    model_used: modelUsed,
    task_type: taskType,
    requires_human_review,
    warnings,
    suggestions: [] as unknown[],
  };
}

async function callNvidia(message: string) {
  const apiKey = Deno.env.get('NVIDIA_API_KEY');
  const baseUrl = (Deno.env.get('NVIDIA_BASE_URL') || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '');
  const model = Deno.env.get('AXIA_DEFAULT_MODEL');
  if (!apiKey || !model) throw new Error('NVIDIA não configurada');

  const upstream = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
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
    const detail = (await upstream.text().catch(() => '')).slice(0, 300);
    throw new Error(`NVIDIA ${upstream.status}: ${detail}`);
  }
  const data = await upstream.json();
  return {
    answer: data?.choices?.[0]?.message?.content ?? '',
    model: data?.model ?? model,
  };
}

async function callLovableFallback(message: string) {
  const key = Deno.env.get('LOVABLE_API_KEY');
  if (!key) throw new Error('LOVABLE_API_KEY não configurada');

  const upstream = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: FALLBACK_MODEL,
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
    }),
  });

  if (!upstream.ok) {
    const detail = (await upstream.text().catch(() => '')).slice(0, 300);
    throw new Error(`Lovable AI ${upstream.status}: ${detail}`);
  }
  const data = await upstream.json();
  return {
    answer: data?.choices?.[0]?.message?.content ?? '',
    model: data?.model ?? FALLBACK_MODEL,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  let body: Input;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'JSON inválido' });
  }

  const message = body?.message;
  const task_type = (body?.task_type ?? 'general').toString();
  if (typeof message !== 'string' || message.trim().length === 0 || message.length > 8000) {
    return json(400, { error: 'Campo "message" inválido (string 1-8000 chars)' });
  }

  const nvidiaEnabled = (Deno.env.get('AXIA_NVIDIA_ENABLED') ?? '').toLowerCase() === 'true';
  const errors: string[] = [];

  if (nvidiaEnabled) {
    try {
      const r = await callNvidia(message);
      return json(200, postProcess(r.answer, task_type, 'nvidia', r.model));
    } catch (e) {
      console.error('axia-ai-gateway: NVIDIA failed, falling back', (e as Error).message);
      errors.push(`nvidia_failed: ${(e as Error).message.slice(0, 200)}`);
    }
  }

  try {
    const r = await callLovableFallback(message);
    const result = postProcess(r.answer, task_type, 'fallback', r.model);
    if (errors.length) (result.warnings as string[]).push(...errors);
    return json(200, result);
  } catch (e) {
    console.error('axia-ai-gateway: fallback failed', (e as Error).message);
    return json(502, {
      error: 'Falha em todos os providers',
      details: [...errors, (e as Error).message.slice(0, 200)],
    });
  }
});
