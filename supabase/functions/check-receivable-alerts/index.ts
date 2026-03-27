import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();

    // Find pending alerts that should be sent (scheduled_for <= now)
    const { data: alerts, error: alertsError } = await supabase
      .from("receivable_alerts")
      .select(`
        *,
        receivable:receivables(*)
      `)
      .eq("status", "pending")
      .lte("scheduled_for", now)
      .limit(100);

    if (alertsError) throw alertsError;

    let processed = 0;

    for (const alert of alerts || []) {
      const receivable = alert.receivable;
      if (!receivable || receivable.status === "paid") {
        // Skip paid receivables, mark alert as cancelled
        await supabase
          .from("receivable_alerts")
          .update({ status: "cancelled", sent_at: now })
          .eq("id", alert.id);
        continue;
      }

      // Create in-app notification
      await supabase.from("user_notifications").insert({
        user_id: alert.user_id,
        type: "payment_due_soon",
        title: "Pagamento a vencer em breve",
        message: `A parcela "${receivable.title}" no valor de €${receivable.amount.toFixed(2)} vence em ${receivable.due_date}.`,
        data: {
          receivable_id: receivable.id,
          obra_id: receivable.obra_id,
          amount: receivable.amount,
          due_date: receivable.due_date,
        },
        read: false,
      });

      // Mark alert as sent
      await supabase
        .from("receivable_alerts")
        .update({ status: "sent", sent_at: now })
        .eq("id", alert.id);

      processed++;
    }

    return new Response(
      JSON.stringify({ success: true, processed }),
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
