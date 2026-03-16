import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth check: require valid JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is a super admin using anon key (so auth.uid() is set from JWT)
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: isAdmin } = await userClient.rpc("is_super_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: super admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { users } = await req.json() as { users: V1User[] };

    if (!users || !Array.isArray(users) || users.length === 0) {
      return new Response(
        JSON.stringify({ error: "Lista de utilizadores inválida ou vazia" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = users.filter(u => !emailRegex.test(u.email));
    
    if (invalidEmails.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: "Emails inválidos encontrados", 
          invalidEmails: invalidEmails.map(u => u.email) 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing emails in migrated_users
    const emails = users.map(u => u.email.toLowerCase());
    const { data: existingMigrated } = await supabase
      .from("migrated_users")
      .select("email")
      .in("email", emails);

    const existingMigratedEmails = new Set((existingMigrated || []).map(e => e.email.toLowerCase()));

    // Check for existing emails in profiles (already registered)
    const { data: existingProfiles } = await supabase
      .from("profiles")
      .select("email")
      .in("email", emails);

    const existingProfileEmails = new Set((existingProfiles || []).map(e => e.email?.toLowerCase()));

    // Filter out already existing users
    const newUsers = users.filter(u => {
      const emailLower = u.email.toLowerCase();
      return !existingMigratedEmails.has(emailLower) && !existingProfileEmails.has(emailLower);
    });

    const skipped = users.length - newUsers.length;

    if (newUsers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Todos os utilizadores já existem no sistema",
          imported: 0,
          skipped,
          alreadyRegistered: existingProfileEmails.size
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert new users
    const usersToInsert = newUsers.map(u => ({
      email: u.email.toLowerCase(),
      nome: u.nome || null,
      empresa: u.empresa || null,
      nif: u.nif || null,
      telefone: u.telefone || null,
      v1_user_id: u.v1_user_id || null,
      status: "pendente"
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("migrated_users")
      .insert(usersToInsert)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao inserir utilizadores", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Imported ${inserted?.length || 0} users from V1`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `${inserted?.length || 0} utilizadores importados com sucesso`,
        imported: inserted?.length || 0,
        skipped,
        alreadyRegistered: existingProfileEmails.size
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in import-v1-users:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Erro interno", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
