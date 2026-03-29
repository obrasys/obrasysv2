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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify user
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { daily_report_id } = await req.json();
    if (!daily_report_id) {
      return new Response(JSON.stringify({ error: 'daily_report_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the report exists and is approved
    const { data: report, error: reportErr } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('id', daily_report_id)
      .single();

    if (reportErr || !report) {
      return new Response(JSON.stringify({ error: 'Report not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (report.status !== 'approved') {
      return new Response(JSON.stringify({ error: 'Report must be approved before processing' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 1: Recalculate task progress from RDO activities
    const { error: recalcErr } = await supabase.rpc('recalculate_task_progress_from_rdo', {
      p_daily_report_id: daily_report_id,
    });
    if (recalcErr) {
      console.error('recalculate_task_progress_from_rdo error:', recalcErr);
    }

    // Step 2: Get affected tasks and propagate dependencies
    const { data: activities } = await supabase
      .from('daily_report_activities')
      .select('schedule_task_id')
      .eq('daily_report_id', daily_report_id)
      .not('schedule_task_id', 'is', null);

    const affectedTaskIds = [...new Set((activities || []).map(a => a.schedule_task_id).filter(Boolean))];

    for (const taskId of affectedTaskIds) {
      // Propagate dependency impact
      await supabase.rpc('propagate_dependency_impact', { p_task_id: taskId });

      // Classify delay
      const { data: classification } = await supabase.rpc('classify_task_delay', { p_task_id: taskId });
      if (classification) {
        await supabase
          .from('project_schedule_tasks')
          .update({ delay_classification: classification })
          .eq('id', taskId);
      }

      // Record reforecast if delay changed
      const { data: task } = await supabase
        .from('project_schedule_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (task && task.forecast_end && task.planned_end && task.forecast_end !== task.planned_end) {
        await supabase.from('task_reforecast').insert({
          user_id: task.user_id,
          obra_id: task.obra_id,
          schedule_task_id: taskId,
          reference_daily_report_id: daily_report_id,
          previous_forecast_end: task.planned_end,
          new_forecast_end: task.forecast_end,
          previous_remaining_duration_days: task.planned_duration_days,
          new_remaining_duration_days: task.remaining_duration_days,
          delay_classification: classification || 'recoverable',
          reason_summary: `Atualizado via RDO de ${report.report_date}`,
        });
      }
    }

    // Step 3: Generate snapshots
    await supabase.rpc('generate_task_snapshots', { p_obra_id: report.obra_id });
    await supabase.rpc('generate_project_snapshot', { p_obra_id: report.obra_id });

    // Step 4: Build impact summary
    const { data: impactedTasks } = await supabase
      .from('project_schedule_tasks')
      .select('id, name, actual_progress_percent, planned_progress_percent, forecast_end, planned_end, delay_classification, criticality, status_flag')
      .eq('obra_id', report.obra_id)
      .in('id', affectedTaskIds);

    const delayedTasks = (impactedTasks || []).filter(t =>
      t.forecast_end && t.planned_end && t.forecast_end > t.planned_end
    );

    const criticalDelayed = delayedTasks.filter(t => t.criticality === 'critical');

    // Get latest project snapshot
    const { data: latestSnapshot } = await supabase
      .from('project_progress_snapshots')
      .select('*')
      .eq('obra_id', report.obra_id)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    return new Response(JSON.stringify({
      success: true,
      summary: {
        tasks_updated: affectedTaskIds.length,
        delayed_tasks: delayedTasks.length,
        critical_delayed: criticalDelayed.length,
        project_progress: latestSnapshot ? {
          planned: latestSnapshot.planned_global_progress,
          actual: latestSnapshot.actual_global_progress,
          deviation: latestSnapshot.physical_deviation,
          health: latestSnapshot.health_status,
          probable_completion: latestSnapshot.probable_completion_date,
        } : null,
        delayed_details: delayedTasks.map(t => ({
          name: t.name,
          delay_days: Math.ceil(
            (new Date(t.forecast_end!).getTime() - new Date(t.planned_end!).getTime()) / (1000 * 60 * 60 * 24)
          ),
          classification: t.delay_classification,
          is_critical: t.criticality === 'critical',
        })),
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('process-daily-report error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
