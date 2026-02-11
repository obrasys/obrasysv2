import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, nota, comentario } = await req.json();

    if (!token || !nota || nota < 1 || nota > 5) {
      return new Response(
        JSON.stringify({ error: "Token e nota (1-5) são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if token already used
    const { data: existing } = await supabaseAdmin
      .from("feedback_pesquisa")
      .select("id, trial_extendido")
      .eq("token", token)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Esta pesquisa já foi respondida.", already_submitted: true }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode token to get user info (token = base64(userId:email))
    let userId: string | null = null;
    let email = "";
    let nome: string | null = null;

    try {
      const decoded = atob(token);
      const parts = decoded.split(":");
      userId = parts[0] || null;
      email = parts[1] || "";
    } catch {
      return new Response(
        JSON.stringify({ error: "Token inválido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user name from profile
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("nome")
        .eq("user_id", userId)
        .maybeSingle();
      nome = profile?.nome || null;
    }

    // Insert feedback
    const { error: insertError } = await supabaseAdmin
      .from("feedback_pesquisa")
      .insert({
        user_id: userId,
        email,
        nome,
        nota,
        comentario: comentario?.trim() || null,
        token,
        trial_extendido: false,
      });

    if (insertError) throw insertError;

    // Extend trial by 30 days
    let trialExtended = false;
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("trial_end")
        .eq("user_id", userId)
        .maybeSingle();

      if (profile) {
        const currentEnd = new Date(profile.trial_end);
        const newEnd = new Date(currentEnd.getTime() + 30 * 24 * 60 * 60 * 1000);

        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            trial_end: newEnd.toISOString(),
            trial_expired: false,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (!updateError) {
          trialExtended = true;
          // Mark feedback as trial extended
          await supabaseAdmin
            .from("feedback_pesquisa")
            .update({ trial_extendido: true })
            .eq("token", token);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, trial_extended: trialExtended }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in submit-feedback:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
