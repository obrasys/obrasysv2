import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

    // Input validation - token must be a valid UUID
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!token || typeof token !== "string" || !UUID_REGEX.test(token)) {
      return new Response(
        JSON.stringify({ error: "Token inválido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!nota || typeof nota !== "number" || nota < 1 || nota > 5 || !Number.isInteger(nota)) {
      return new Response(
        JSON.stringify({ error: "Token e nota (1-5) são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sanitizedComentario = typeof comentario === "string" ? comentario.trim().slice(0, 2000) : null;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // SECURITY: Validate the token against the survey_tokens table (UUID-based, not base64 encoded)
    // This prevents token forgery since tokens are generated server-side and stored securely.
    const { data: surveyToken, error: tokenError } = await supabaseAdmin
      .from("survey_tokens")
      .select("id, user_id, email, used, expires_at")
      .eq("id", token)
      .maybeSingle();

    if (tokenError || !surveyToken) {
      return new Response(
        JSON.stringify({ error: "Token inválido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check token not already used
    if (surveyToken.used) {
      return new Response(
        JSON.stringify({ error: "Esta pesquisa já foi respondida.", already_submitted: true }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check token not expired
    if (new Date(surveyToken.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Token expirado." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if feedback already submitted for this user/token
    const { data: existingFeedback } = await supabaseAdmin
      .from("feedback_pesquisa")
      .select("id")
      .eq("token", token)
      .maybeSingle();

    if (existingFeedback) {
      return new Response(
        JSON.stringify({ error: "Esta pesquisa já foi respondida.", already_submitted: true }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = surveyToken.user_id;
    const email = surveyToken.email;

    // Get user name from profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("nome")
      .eq("user_id", userId)
      .maybeSingle();
    const nome = profile?.nome || null;

    // Mark token as used atomically before inserting feedback
    const { error: markUsedError } = await supabaseAdmin
      .from("survey_tokens")
      .update({ used: true })
      .eq("id", token)
      .eq("used", false); // Only update if still unused (prevents race conditions)

    if (markUsedError) {
      console.error("Failed to mark token as used:", markUsedError);
      return new Response(
        JSON.stringify({ error: "Ocorreu um erro ao processar o pedido." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert feedback
    const { error: insertError } = await supabaseAdmin
      .from("feedback_pesquisa")
      .insert({
        user_id: userId,
        email,
        nome,
        nota,
        comentario: sanitizedComentario || null,
        token,
        trial_extendido: false,
      });

    if (insertError) throw insertError;

    // Extend trial by 30 days
    let trialExtended = false;
    const { data: userProfile } = await supabaseAdmin
      .from("profiles")
      .select("trial_end")
      .eq("user_id", userId)
      .maybeSingle();

    if (userProfile) {
      const currentEnd = new Date(userProfile.trial_end);
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
        await supabaseAdmin
          .from("feedback_pesquisa")
          .update({ trial_extendido: true })
          .eq("token", token);
      }
    }

    return new Response(
      JSON.stringify({ success: true, trial_extended: trialExtended }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in submit-feedback:", error);
    return new Response(
      JSON.stringify({ error: "Ocorreu um erro ao processar o pedido." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
