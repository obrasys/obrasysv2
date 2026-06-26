// Axia Budget Audit edge function
// Runs deterministic + semantic audits on an orçamento and writes findings to
// axia_budget_review_items so the human reviewer can validate before saving.
// No provider/model is exposed to the client — the AI call (if any) goes
// through the internal axia-ai-gateway.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://esm.sh/zod@3.23.8';
import { rateLimitOrg } from '../_shared/rateLimitOrg.ts';


const BodySchema = z.object({
  orcamento_id: z.string().uuid(),
  budget_version_id: z.string().uuid().nullish(),
});

type ReviewInsert = {
  organization_id: string;
  orcamento_id: string;
  budget_version_id?: string | null;
  artigo_id?: string | null;
  capitulo_id?: string | null;
  item_type:
    | 'missing_price'
    | 'suspect_quantity'
    | 'ambiguous_unit'
    | 'doc_mismatch'
    | 'human_question'
    | 'missing_chapter'
    | 'other';
  severity: 'info' | 'warning' | 'critical';
  status: 'pending';
  title: string;
  description?: string | null;
  axia_suggestion?: unknown;
  original_value?: unknown;
  created_by?: string | null;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Auth
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return jsonResponse(401, { error: 'Missing authorization' });

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return jsonResponse(401, { error: 'Invalid session' });
  const userId = userData.user.id;
  const limited = await rateLimitOrg(userId, {
    module: 'axia_budget_audit', windowSeconds: 60, maxCalls: 10, corsHeaders,
  });
  if (limited) return limited;


  // Validate input
  let payload: z.infer<typeof BodySchema>;
  try {
    payload = BodySchema.parse(await req.json());
  } catch (e) {
    return jsonResponse(400, { error: 'Invalid body', details: (e as Error).message });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Resolve organization for the caller
  const { data: orgId, error: orgErr } = await admin.rpc('get_user_org_id', { _user_id: userId });
  if (orgErr || !orgId) return jsonResponse(403, { error: 'No organization for user' });

  // Load orçamento + structure
  const { data: orc, error: orcErr } = await admin
    .from('orcamentos')
    .select('id, titulo, status, user_id')
    .eq('id', payload.orcamento_id)
    .maybeSingle();
  if (orcErr || !orc) return jsonResponse(404, { error: 'Orçamento not found' });

  // Caller must belong to same org as orçamento owner
  const { data: ownerOrg } = await admin.rpc('get_user_org_id', { _user_id: orc.user_id });
  if (ownerOrg !== orgId) return jsonResponse(403, { error: 'Forbidden' });

  const { data: capitulos } = await admin
    .from('capitulos_orcamento')
    .select('id, numero, titulo, ordem')
    .eq('orcamento_id', payload.orcamento_id)
    .order('ordem', { ascending: true });

  const capituloIds = (capitulos ?? []).map((c) => c.id);
  const { data: artigos } = capituloIds.length
    ? await admin
        .from('artigos_orcamento')
        .select('id, capitulo_id, codigo, descricao, unidade, quantidade, preco_unitario, valor_total')
        .in('capitulo_id', capituloIds)
    : { data: [] as any[] };

  // Replace previous audit-generated pending items for this orçamento
  await admin
    .from('axia_budget_review_items')
    .delete()
    .eq('orcamento_id', payload.orcamento_id)
    .eq('status', 'pending');

  const findings: ReviewInsert[] = [];

  if (!capitulos || capitulos.length === 0) {
    findings.push({
      organization_id: orgId as string,
      orcamento_id: payload.orcamento_id,
      budget_version_id: payload.budget_version_id ?? null,
      item_type: 'missing_chapter',
      severity: 'critical',
      status: 'pending',
      title: 'Orçamento sem capítulos',
      description: 'Não foram encontrados capítulos. Estrutura o orçamento antes de adjudicar.',
      created_by: userId,
    });
  }

  for (const a of artigos ?? []) {
    const desc = a.descricao || a.codigo || 'Artigo';
    if (a.preco_unitario == null || Number(a.preco_unitario) === 0) {
      findings.push({
        organization_id: orgId as string,
        orcamento_id: payload.orcamento_id,
        budget_version_id: payload.budget_version_id ?? null,
        artigo_id: a.id,
        capitulo_id: a.capitulo_id,
        item_type: 'missing_price',
        severity: 'critical',
        status: 'pending',
        title: `Preço em falta: ${desc}`,
        description: 'O artigo não tem preço unitário definido.',
        original_value: { preco_unitario: a.preco_unitario },
        created_by: userId,
      });
    }
    if (a.quantidade == null || Number(a.quantidade) <= 0) {
      findings.push({
        organization_id: orgId as string,
        orcamento_id: payload.orcamento_id,
        budget_version_id: payload.budget_version_id ?? null,
        artigo_id: a.id,
        capitulo_id: a.capitulo_id,
        item_type: 'suspect_quantity',
        severity: 'warning',
        status: 'pending',
        title: `Quantidade inválida: ${desc}`,
        description: 'A quantidade é zero ou negativa.',
        original_value: { quantidade: a.quantidade },
        created_by: userId,
      });
    }
    if (!a.unidade || String(a.unidade).trim() === '') {
      findings.push({
        organization_id: orgId as string,
        orcamento_id: payload.orcamento_id,
        budget_version_id: payload.budget_version_id ?? null,
        artigo_id: a.id,
        capitulo_id: a.capitulo_id,
        item_type: 'ambiguous_unit',
        severity: 'warning',
        status: 'pending',
        title: `Unidade em falta: ${desc}`,
        description: 'O artigo não tem unidade de medida.',
        created_by: userId,
      });
    }
  }

  // Empty chapters
  const articleCountByChapter = new Map<string, number>();
  for (const a of artigos ?? []) {
    articleCountByChapter.set(a.capitulo_id, (articleCountByChapter.get(a.capitulo_id) ?? 0) + 1);
  }
  for (const c of capitulos ?? []) {
    if ((articleCountByChapter.get(c.id) ?? 0) === 0) {
      findings.push({
        organization_id: orgId as string,
        orcamento_id: payload.orcamento_id,
        budget_version_id: payload.budget_version_id ?? null,
        capitulo_id: c.id,
        item_type: 'other',
        severity: 'info',
        status: 'pending',
        title: `Capítulo sem artigos: ${c.titulo ?? c.numero ?? ''}`.trim(),
        description: 'Capítulo declarado mas sem artigos associados.',
        created_by: userId,
      });
    }
  }

  let inserted = 0;
  if (findings.length > 0) {
    const { error: insErr, count } = await admin
      .from('axia_budget_review_items')
      .insert(findings, { count: 'exact' });
    if (insErr) return jsonResponse(500, { error: 'Failed to insert findings', details: insErr.message });
    inserted = count ?? findings.length;
  }

  // Log
  await admin.from('axia_ai_logs').insert({
    organization_id: orgId,
    user_id: userId,
    module: 'orcamentos',
    task_type: 'budget_audit',
    status: 'success',
    latency_ms: 0,
  } as any).then(() => {}, () => {});

  return jsonResponse(200, {
    ok: true,
    orcamento_id: payload.orcamento_id,
    inserted,
    summary: {
      total_findings: findings.length,
      critical: findings.filter((f) => f.severity === 'critical').length,
      warnings: findings.filter((f) => f.severity === 'warning').length,
      info: findings.filter((f) => f.severity === 'info').length,
    },
  });
});
