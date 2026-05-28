import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: require valid user JWT (called from app) OR cron secret (for scheduled runs)
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    const providedSecret = req.headers.get('x-cron-secret');
    const isCron = !!cronSecret && providedSecret === cronSecret;

    let callerUserId: string | null = null;
    if (!isCron) {
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace('Bearer ', '');
      const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
      if (claimsErr || !claims?.claims?.sub) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      callerUserId = claims.claims.sub as string;
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { obra_id } = await req.json();

    // If user-invoked, ensure they have access to this obra
    if (callerUserId && obra_id) {
      const { data: obra } = await supabase
        .from('obras')
        .select('id, user_id')
        .eq('id', obra_id)
        .maybeSingle();
      if (!obra) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: orgIds } = await supabase.rpc('get_org_member_ids');
      const allowed = Array.isArray(orgIds) ? (orgIds as string[]).includes(obra.user_id) : obra.user_id === callerUserId;
      if (!allowed && obra.user_id !== callerUserId) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    if (!obra_id) {
      return new Response(JSON.stringify({ error: 'obra_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get milestones
    const { data: milestones } = await supabase
      .from('financial_milestones')
      .select('*')
      .eq('obra_id', obra_id)
      .in('status', ['planned', 'forecasted']);

    // Get latest project snapshot for progress
    const { data: snapshot } = await supabase
      .from('project_progress_snapshots')
      .select('*')
      .eq('obra_id', obra_id)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date();
    const alerts: Array<{
      user_id: string;
      obra_id: string;
      related_milestone_id: string | null;
      alert_type: string;
      severity: string;
      title: string;
      message: string;
      explanation_json: Record<string, unknown>;
      dedupe_key: string;
    }> = [];

    for (const m of (milestones || [])) {
      const plannedDate = m.planned_date ? new Date(m.planned_date) : null;
      const forecastDate = m.forecast_date ? new Date(m.forecast_date) : null;
      const effectiveDate = forecastDate || plannedDate;

      if (!effectiveDate) continue;

      const daysUntil = Math.ceil((effectiveDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Alert: milestone approaching (7 days)
      if (daysUntil <= 7 && daysUntil > 0) {
        const dedupeKey = `approaching_${m.id}_${effectiveDate.toISOString().slice(0, 10)}`;
        alerts.push({
          user_id: m.user_id,
          obra_id,
          related_milestone_id: m.id,
          alert_type: 'milestone_approaching',
          severity: daysUntil <= 3 ? 'critical' : 'warning',
          title: `Marco financeiro em ${daysUntil} dia(s)`,
          message: `${m.description} - ${new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(m.planned_amount)} previsto para ${effectiveDate.toLocaleDateString('pt-PT')}`,
          explanation_json: {
            milestone_type: m.milestone_type,
            days_until: daysUntil,
            amount: m.planned_amount,
            trigger: m.trigger_mode,
          },
          dedupe_key: dedupeKey,
        });
      }

      // Alert: milestone overdue
      if (daysUntil < 0) {
        const dedupeKey = `overdue_${m.id}`;
        alerts.push({
          user_id: m.user_id,
          obra_id,
          related_milestone_id: m.id,
          alert_type: 'milestone_overdue',
          severity: 'critical',
          title: `Marco financeiro em atraso (${Math.abs(daysUntil)} dias)`,
          message: `${m.description} estava previsto para ${effectiveDate.toLocaleDateString('pt-PT')}`,
          explanation_json: {
            milestone_type: m.milestone_type,
            days_overdue: Math.abs(daysUntil),
            amount: m.planned_amount,
          },
          dedupe_key: dedupeKey,
        });
      }

      // Alert: progress-triggered milestone at risk
      if (m.trigger_mode === 'progress' && m.trigger_progress_percent && snapshot) {
        const currentProgress = snapshot.actual_global_progress;
        const progressGap = m.trigger_progress_percent - currentProgress;

        if (progressGap > 0 && progressGap < 10 && plannedDate && daysUntil <= 14) {
          const dedupeKey = `progress_gap_${m.id}_${Math.floor(progressGap)}`;
          alerts.push({
            user_id: m.user_id,
            obra_id,
            related_milestone_id: m.id,
            alert_type: 'progress_gap_risk',
            severity: progressGap < 5 ? 'warning' : 'info',
            title: `Progresso insuficiente para ativar marco`,
            message: `${m.description} requer ${m.trigger_progress_percent}% de progresso. Atual: ${currentProgress.toFixed(1)}%. Faltam ${progressGap.toFixed(1)}pp.`,
            explanation_json: {
              required_progress: m.trigger_progress_percent,
              current_progress: currentProgress,
              gap: progressGap,
              planned_date: m.planned_date,
            },
            dedupe_key: dedupeKey,
          });
        }
      }
    }

    // Check for payment concentration (multiple payments within 7 days)
    const upcomingPayments = (milestones || []).filter(m =>
      m.milestone_type === 'supplier_payment' &&
      m.planned_date &&
      Math.ceil((new Date(m.planned_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) <= 14 &&
      Math.ceil((new Date(m.planned_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) > 0
    );

    if (upcomingPayments.length >= 3) {
      const totalAmount = upcomingPayments.reduce((s, m) => s + (m.planned_amount || 0), 0);
      const dedupeKey = `payment_concentration_${obra_id}_${now.toISOString().slice(0, 10)}`;
      alerts.push({
        user_id: upcomingPayments[0].user_id,
        obra_id,
        related_milestone_id: null,
        alert_type: 'payment_concentration',
        severity: 'warning',
        title: `Concentração de ${upcomingPayments.length} pagamentos nos próximos 14 dias`,
        message: `Total de ${new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(totalAmount)} em pagamentos concentrados.`,
        explanation_json: {
          payment_count: upcomingPayments.length,
          total_amount: totalAmount,
          payments: upcomingPayments.map(p => ({
            description: p.description,
            amount: p.planned_amount,
            date: p.planned_date,
          })),
        },
        dedupe_key: dedupeKey,
      });
    }

    // Insert alerts with deduplication
    let inserted = 0;
    for (const alert of alerts) {
      // Check if dedupe_key already exists and is still open
      const { data: existing } = await supabase
        .from('financial_alerts')
        .select('id')
        .eq('dedupe_key', alert.dedupe_key)
        .in('status', ['open', 'acknowledged'])
        .limit(1);

      if (!existing?.length) {
        await supabase.from('financial_alerts').insert({
          ...alert,
          detected_at: now.toISOString(),
          status: 'open',
        });
        inserted++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      alerts_generated: alerts.length,
      alerts_inserted: inserted,
      alerts_deduplicated: alerts.length - inserted,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('generate-financial-alerts error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
