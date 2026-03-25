import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generatePassword(length = 12): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { orcamento_id, obra_id, client_email, client_name } = await req.json();

    if (!orcamento_id && !obra_id) {
      return new Response(
        JSON.stringify({ error: "orcamento_id ou obra_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the orcamento with cliente info
    let clienteEmail: string | null = client_email || null;
    let clienteNome: string | null = client_name || null;
    let obraIdFinal: string | null = obra_id || null;
    let obraNome: string | null = null;

    if (orcamento_id) {
      const { data: orc, error: orcError } = await supabaseAdmin
        .from("orcamentos")
        .select("*, cliente:clientes(id, nome, email)")
        .eq("id", orcamento_id)
        .maybeSingle();

      if (orcError || !orc) {
        return new Response(
          JSON.stringify({ error: "Orçamento não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (orc.cliente && orc.cliente.email) {
        clienteEmail = orc.cliente.email;
        clienteNome = orc.cliente.nome;
      }
      obraIdFinal = orc.obra_id;
    }

    if (!obraIdFinal) {
      return new Response(
        JSON.stringify({ error: "Obra não encontrada para este orçamento" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!clienteEmail) {
      return new Response(
        JSON.stringify({ error: "Email do cliente é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get obra name
    const { data: obraData } = await supabaseAdmin
      .from("obras")
      .select("nome")
      .eq("id", obraIdFinal)
      .single();

    obraNome = obraData?.nome || "Obra";

    // Check if user already exists with this email
    let clientUserId: string | null = null;
    let tempPassword: string | null = null;
    let isNewUser = false;

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === clienteEmail?.toLowerCase()
    );

    if (existingUser) {
      clientUserId = existingUser.id;
    } else {
      // Create new user with temporary password
      tempPassword = generatePassword();
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: clienteEmail!,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { nome: clienteNome },
        });

      if (createError) {
        return new Response(
          JSON.stringify({ error: `Erro ao criar utilizador: ${createError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      clientUserId = newUser.user.id;
      isNewUser = true;

      // Update profile role to 'client'
      await supabaseAdmin
        .from("profiles")
        .update({ role: "client" })
        .eq("user_id", clientUserId);
    }

    // Check if access already exists
    const { data: existingAccess } = await supabaseAdmin
      .from("client_obra_access")
      .select("id")
      .eq("client_user_id", clientUserId!)
      .eq("obra_id", obraIdFinal)
      .maybeSingle();

    if (!existingAccess) {
      // Insert client_obra_access
      const { error: accessError } = await supabaseAdmin
        .from("client_obra_access")
        .insert({
          client_user_id: clientUserId,
          obra_id: obraIdFinal,
          granted_by: caller.id,
          client_email: clienteEmail,
          client_name: clienteNome,
        });

      if (accessError) {
        console.error("Error creating access:", accessError);
      }
    }

    // Send invitation email via Resend (for both new and existing users)
    if (resendApiKey) {
      try {
        const loginUrl = `${req.headers.get("origin") || "https://obrasysv2.lovable.app"}/auth`;
        const logoUrl = `${req.headers.get("origin") || "https://obrasysv2.lovable.app"}/logo.png`;

        const templateSlug = isNewUser ? "convite-portal-cliente" : "convite-portal-cliente-existente";

        // Get the email template
        const { data: template } = await supabaseAdmin
          .from("email_templates")
          .select("html_content, assunto")
          .eq("slug", templateSlug)
          .eq("ativo", true)
          .single();

        // Fallback templates
        const fallbackNew = `
          <p>Olá ${clienteNome},</p>
          <p>A sua obra <strong>${obraNome}</strong> já está no ObraSys.</p>
          <p>Email: ${clienteEmail}<br>Senha: ${tempPassword}</p>
          <p><a href="${loginUrl}">Aceder ao Portal</a></p>
        `;
        const fallbackExisting = `
          <p>Olá ${clienteNome},</p>
          <p>Tem agora acesso à obra <strong>${obraNome}</strong> no ObraSys.</p>
          <p><a href="${loginUrl}">Aceder ao Portal</a></p>
        `;

        let htmlContent = template?.html_content || (isNewUser ? fallbackNew : fallbackExisting);

        // Replace variables
        htmlContent = htmlContent
          .replace(/\{\{nome\}\}/g, clienteNome || "")
          .replace(/\{\{obraName\}\}/g, obraNome || "")
          .replace(/\{\{loginUrl\}\}/g, loginUrl)
          .replace(/\{\{email\}\}/g, clienteEmail || "")
          .replace(/\{\{senha\}\}/g, tempPassword || "")
          .replace(/\{\{logoUrl\}\}/g, logoUrl)
          .replace(/\{\{ano\}\}/g, new Date().getFullYear().toString());

        const assunto = (template?.assunto || (isNewUser ? "A sua obra já está no ObraSys" : `Novo acesso: ${obraNome}`))
          .replace(/\{\{obraName\}\}/g, obraNome || "");

        const fromEmail = Deno.env.get("RESEND_FROM") || "ObraSys <noreply@obrasys.pt>";

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [clienteEmail],
            subject: assunto,
            html: htmlContent,
          }),
        });

        const emailBody = await emailResponse.text();
        console.log(`Resend response: status=${emailResponse.status} body=${emailBody}`);

        if (!emailResponse.ok) {
          console.error(`Resend error: ${emailResponse.status} - ${emailBody}`);
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
    } else {
      console.warn("RESEND_API_KEY not configured, skipping email");
    }

    return new Response(
      JSON.stringify({
        success: true,
        isNewUser,
        clientUserId,
        message: isNewUser
          ? "Utilizador criado e acesso concedido"
          : "Acesso concedido ao utilizador existente",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
