// MCE — Axia analysis edge function
// Reads MCE map + suppliers + items + prices and produces alerts + summary
// using Lovable AI Gateway (Gemini 2.5 Pro) with strict JSON tool calling.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { rateLimitOrg } from '../_shared/rateLimitOrg.ts';
import { logAxiaCall } from '../_shared/axia/logCall.ts';
import {
  MCE_AXIA_ANALYZE_PROMPT_ID,
  MCE_AXIA_ANALYZE_PROMPT_VERSION,
} from '../_shared/axia/prompts.ts';



const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Alert {
  level: 'info' | 'warning' | 'critical';
  message: string;
  code?: string;
}

interface Result {
  summary: string;
  alerts: Alert[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { mce_id } = await req.json();
    if (!mce_id || typeof mce_id !== 'string') {
      return json({ error: 'mce_id obrigatório' }, 400);
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Não autenticado' }, 401);
    const limited = await rateLimitOrg(user.id, {
      module: 'mce_axia', windowSeconds: 60, maxCalls: 10, corsHeaders,
    });
    if (limited) return limited;

    const [mapR, supR, itemsR, pricesR] = await Promise.all([
      supabase.from('mce_maps').select('*').eq('id', mce_id).maybeSingle(),
      supabase.from('mce_suppliers').select('*').eq('mce_id', mce_id),
      supabase.from('mce_items').select('*').eq('mce_id', mce_id),
      supabase.from('mce_supplier_item_prices').select('*').eq('mce_id', mce_id),
    ]);

    if (mapR.error || !mapR.data) return json({ error: 'MCE não encontrado' }, 404);

    const map = mapR.data;
    const suppliers = supR.data ?? [];
    const items = itemsR.data ?? [];
    const prices = pricesR.data ?? [];

    // --- Deterministic alerts ---
    const alerts: Alert[] = [];

    const validTotals = suppliers
      .map((s: any) => Number(s.proposal_total ?? 0))
      .filter((v: number) => v > 0);
    const lowest = validTotals.length ? Math.min(...validTotals) : 0;
    const drySeco = Number(map.dry_budget_total ?? 0);

    const selected = suppliers.find((s: any) => s.is_selected);
    if (!selected) {
      alerts.push({ level: 'warning', code: 'NO_SELECTION', message: 'Nenhum fornecedor está marcado como selecionado.' });
    } else {
      if (!selected.nif) alerts.push({ level: 'warning', code: 'NIF_MISSING', message: `Fornecedor ${selected.supplier_name_snapshot ?? ''} sem NIF.` });
      if (!selected.license_number) alerts.push({ level: 'info', code: 'LICENSE_MISSING', message: `Fornecedor ${selected.supplier_name_snapshot ?? ''} sem alvará.` });
      if (!selected.retention) alerts.push({ level: 'info', code: 'RETENTION_MISSING', message: `Sem retenção definida para ${selected.supplier_name_snapshot ?? ''}.` });
      if (lowest > 0 && Number(selected.proposal_total) > lowest * 1.01) {
        alerts.push({
          level: 'warning',
          code: 'NOT_LOWEST',
          message: `Fornecedor selecionado não é o de menor preço (€${Number(selected.proposal_total).toFixed(2)} vs €${lowest.toFixed(2)}). Justificação obrigatória.`,
        });
      }
      if (drySeco > 0 && Number(selected.proposal_total) > drySeco * 1.05) {
        alerts.push({
          level: 'critical',
          code: 'ABOVE_SECO',
          message: `Proposta selecionada (€${Number(selected.proposal_total).toFixed(2)}) excede o orçamento seco em mais de 5% (€${drySeco.toFixed(2)}).`,
        });
      }
    }

    if (suppliers.length < 3) {
      alerts.push({ level: 'info', code: 'FEW_SUPPLIERS', message: `Apenas ${suppliers.length} fornecedor(es). Recomendado consultar pelo menos 3.` });
    }

    const incomplete = suppliers.filter((s: any) => {
      const c = prices.filter((p: any) => p.mce_supplier_id === s.id).length;
      return c > 0 && c < items.length;
    });
    if (incomplete.length) {
      alerts.push({
        level: 'warning',
        code: 'INCOMPLETE_PROPOSALS',
        message: `${incomplete.length} fornecedor(es) com propostas incompletas (preços em falta).`,
      });
    }

    // --- AI summary (best-effort, fallback to deterministic) ---
    let summary = `MCE "${map.title}" com ${suppliers.length} fornecedor(es) e ${items.length} linha(s). Orçamento seco €${drySeco.toFixed(2)}, menor proposta €${lowest.toFixed(2)}, verba ${(drySeco - lowest).toFixed(2)} €.`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const adminClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    if (LOVABLE_API_KEY) {
      const t0 = Date.now();
      const aiModel = 'google/gemini-2.5-pro';
      try {
        const ctx = {

          title: map.title,
          dry_budget_total: drySeco,
          lowest_total: lowest,
          selected_total: selected ? Number(selected.proposal_total) : null,
          selected_supplier: selected?.supplier_name_snapshot ?? null,
          suppliers: suppliers.map((s: any) => ({
            name: s.supplier_name_snapshot,
            total: Number(s.proposal_total),
            nif: s.nif,
            license: s.license_number,
          })),
          items_count: items.length,
          alerts_so_far: alerts,
        };
        const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-pro',
            messages: [
              {
                role: 'system',
                content:
                  'És a Axia, assistente de compras da Obra Sys. Analisa o MCE em PT-PT e devolve um resumo executivo curto (2-3 frases) + alertas adicionais relevantes. Não inventes valores. Usa tool call.',
              },
              { role: 'user', content: JSON.stringify(ctx) },
            ],
            tools: [{
              type: 'function',
              function: {
                name: 'mce_analysis',
                description: 'Resumo e alertas adicionais do MCE',
                parameters: {
                  type: 'object',
                  properties: {
                    summary: { type: 'string' },
                    extra_alerts: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          level: { type: 'string', enum: ['info', 'warning', 'critical'] },
                          message: { type: 'string' },
                        },
                        required: ['level', 'message'],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ['summary', 'extra_alerts'],
                  additionalProperties: false,
                },
              },
            }],
            tool_choice: { type: 'function', function: { name: 'mce_analysis' } },
          }),
        });

        if (aiResp.ok) {
          const aiJson = await aiResp.json();
          const call = aiJson.choices?.[0]?.message?.tool_calls?.[0];
          if (call?.function?.arguments) {
            const parsed = JSON.parse(call.function.arguments);
            if (parsed.summary) summary = parsed.summary;
            if (Array.isArray(parsed.extra_alerts)) {
              for (const a of parsed.extra_alerts) {
                alerts.push({ level: a.level, message: a.message });
              }
            }
          }
        } else if (aiResp.status === 429 || aiResp.status === 402) {
          alerts.push({
            level: 'info',
            message: aiResp.status === 429 ? 'Axia atingiu o limite. Resumo determinístico devolvido.' : 'Sem créditos Axia. Resumo determinístico devolvido.',
          });
        }
      } catch (e) {
        console.error('Axia AI fallback:', e);
      }
    }

    // Persist
    await supabase.from('mce_maps').update({
      axia_summary: summary,
      axia_alerts: alerts,
      updated_at: new Date().toISOString(),
    }).eq('id', mce_id);

    const result: Result = { summary, alerts };
    return json(result, 200);
  } catch (e) {
    console.error('mce-axia-analyze error', e);
    return json({ error: e instanceof Error ? e.message : 'Erro' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
