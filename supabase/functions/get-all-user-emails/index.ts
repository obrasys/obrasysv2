import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: isSuperAdmin, error: adminErr } = await supabase.rpc("is_super_admin");
    if (adminErr || !isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Parse optional filter
    let filter = "all";
    try {
      const body = await req.json();
      if (body?.filter) filter = body.filter;
    } catch { /* no body = default "all" */ }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    if (filter === "expired_trials") {
      // Get expired trial users who are NOT subscribed
      const { data: profiles, error: profilesErr } = await serviceClient
        .from("profiles")
        .select("email")
        .lt("trial_end", new Date().toISOString())
        .not("email", "is", null);

      if (profilesErr) throw profilesErr;

      // Exclude users with active subscriptions
      const { data: subscribers } = await serviceClient
        .from("subscribers")
        .select("email")
        .eq("subscribed", true);

      const subscribedEmails = new Set((subscribers || []).map((s: any) => s.email));
      const emails = (profiles || [])
        .map((p: any) => p.email)
        .filter((e: string) => e && !subscribedEmails.has(e));

      return new Response(
        JSON.stringify({ emails, total: emails.length }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Default: all users from auth
    const { data: usersData, error: usersError } = await serviceClient.auth.admin.listUsers({ perPage: 1000 });
    if (usersError) throw usersError;

    const emails = usersData.users
      .map((user) => user.email)
      .filter((email): email is string => !!email);

    return new Response(
      JSON.stringify({ emails, total: emails.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in get-all-user-emails:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
