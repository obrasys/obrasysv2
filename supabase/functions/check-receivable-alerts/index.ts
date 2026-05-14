import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: require shared CRON_SECRET (this is a scheduled job, not a user-facing endpoint)
    const cronSecret = Deno.env.get("CRON_SECRET");
    const provided = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!cronSecret || provided !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const nowISO = now.toISOString();
    const today = nowISO.split("T")[0];

    // ── PHASE 1: Auto-generate missing alerts for receivables ──
    // Find receivables with status open/pending/partially_paid that are due within 5 days or already overdue
    const { data: receivables, error: recError } = await supabase
      .from("receivables")
      .select("id, user_id, due_date, status, amount, title, obra_id")
      .in("status", ["open", "pending", "partially_paid"]);

    if (recError) throw recError;

    const alertTypes = [
      { type: "due_5_days", daysOffset: -5 },
      { type: "overdue_1_day", daysOffset: 1 },
      { type: "overdue_7_days", daysOffset: 7 },
    ];

    let alertsCreated = 0;

    for (const receivable of receivables || []) {
      const dueDate = new Date(receivable.due_date + "T00:00:00Z");

      for (const alertDef of alertTypes) {
        const scheduledDate = new Date(dueDate);
        scheduledDate.setUTCDate(scheduledDate.getUTCDate() + alertDef.daysOffset);
        const scheduledStr = scheduledDate.toISOString();

        // Only create alerts for dates that haven't passed yet or are today
        if (scheduledDate.toISOString().split("T")[0] < today) continue;

        // Check if alert already exists for this receivable + type
        const { data: existing } = await supabase
          .from("receivable_alerts")
          .select("id")
          .eq("receivable_id", receivable.id)
          .eq("alert_type", alertDef.type)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Create the alert
        await supabase.from("receivable_alerts").insert({
          user_id: receivable.user_id,
          receivable_id: receivable.id,
          alert_type: alertDef.type,
          scheduled_for: scheduledStr,
          status: "pending",
          channel: "in_app",
        });

        alertsCreated++;
      }
    }

    // ── PHASE 2: Process pending alerts that are due ──
    const { data: alerts, error: alertsError } = await supabase
      .from("receivable_alerts")
      .select(`
        *,
        receivable:receivables(*)
      `)
      .eq("status", "pending")
      .lte("scheduled_for", nowISO)
      .limit(200);

    if (alertsError) throw alertsError;

    let processed = 0;

    const alertMessages: Record<string, { title: string; messageTemplate: (r: any) => string; type: string }> = {
      due_5_days: {
        title: "Pagamento a vencer em 5 dias",
        messageTemplate: (r) => `A parcela "${r.title}" no valor de €${r.amount.toFixed(2)} vence em ${r.due_date}.`,
        type: "payment_due_soon",
      },
      due_soon: {
        title: "Pagamento a vencer em breve",
        messageTemplate: (r) => `A parcela "${r.title}" no valor de €${r.amount.toFixed(2)} vence em ${r.due_date}.`,
        type: "payment_due_soon",
      },
      overdue_1_day: {
        title: "Pagamento em atraso (1 dia)",
        messageTemplate: (r) => `A parcela "${r.title}" no valor de €${r.amount.toFixed(2)} venceu em ${r.due_date} e está em atraso.`,
        type: "payment_overdue",
      },
      overdue_7_days: {
        title: "Pagamento em atraso (7 dias)",
        messageTemplate: (r) => `A parcela "${r.title}" no valor de €${r.amount.toFixed(2)} está em atraso há 7 dias (vencimento: ${r.due_date}).`,
        type: "payment_overdue",
      },
    };

    for (const alert of alerts || []) {
      const receivable = alert.receivable;
      if (!receivable || receivable.status === "paid") {
        await supabase
          .from("receivable_alerts")
          .update({ status: "cancelled", sent_at: nowISO })
          .eq("id", alert.id);
        continue;
      }

      const msgConfig = alertMessages[alert.alert_type] || alertMessages["due_5_days"];

      // Create in-app notification
      await supabase.from("user_notifications").insert({
        user_id: alert.user_id,
        type: msgConfig.type,
        title: msgConfig.title,
        message: msgConfig.messageTemplate(receivable),
        link: receivable.obra_id ? `/obras/${receivable.obra_id}/financeiro` : "/financeiro",
        data: {
          receivable_id: receivable.id,
          obra_id: receivable.obra_id,
          amount: receivable.amount,
          due_date: receivable.due_date,
          alert_type: alert.alert_type,
        },
        read: false,
      });

      // Mark alert as sent
      await supabase
        .from("receivable_alerts")
        .update({ status: "sent", sent_at: nowISO })
        .eq("id", alert.id);

      processed++;
    }

    return new Response(
      JSON.stringify({ success: true, alertsCreated, processed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing receivable alerts:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
