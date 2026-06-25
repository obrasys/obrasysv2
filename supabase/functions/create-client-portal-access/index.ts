import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generatePassword(length = 12): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (v) => chars[v % chars.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const caller = { id: claimsData.claims.sub as string };

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

      // Ownership check: caller must own the orcamento (or be in same org)
      if (orc.user_id !== caller.id) {
        // Check org membership as fallback
        const { data: orgCheck } = await supabaseAuth.rpc("get_org_member_ids");
        const orgMembers: string[] = orgCheck || [];
        if (!orgMembers.includes(orc.user_id)) {
          return new Response(
            JSON.stringify({ error: "Sem permissão para este orçamento" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
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
      // No client email - skip portal access creation silently
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          message: "Sem email de cliente associado - acesso ao portal não criado",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get obra name and verify ownership
    const { data: obraData } = await supabaseAdmin
      .from("obras")
      .select("user_id, nome")
      .eq("id", obraIdFinal)
      .single();

    if (!obraData) {
      return new Response(
        JSON.stringify({ error: "Obra não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ownership check: caller must own the obra (or be in same org)
    if (obraData.user_id !== caller.id) {
      const { data: orgCheck } = await supabaseAuth.rpc("get_org_member_ids");
      const orgMembers: string[] = orgCheck || [];
      if (!orgMembers.includes(obraData.user_id)) {
        return new Response(
          JSON.stringify({ error: "Sem permissão para esta obra" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    obraNome = obraData.nome || "Obra";

    // Check if user already exists with this email
    let clientUserId: string | null = null;
    let isNewUser = false;

    // Try to create user first (without a password — they'll set one via recovery link);
    // if email exists, look them up
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: clienteEmail!,
        email_confirm: true,
        user_metadata: { nome: clienteNome, role: "cliente" },
      });

    if (createError) {
      if (createError.message?.includes("already been registered")) {
        // User exists - find them by email
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .eq("email", clienteEmail!.toLowerCase())
          .maybeSingle();

        if (profile) {
          clientUserId = profile.user_id;
        } else {
          // Fallback: iterate users (paginated)
          let page = 1;
          let found = false;
          while (!found) {
            const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
            if (!usersPage?.users?.length) break;
            const match = usersPage.users.find(
              (u: any) => u.email?.toLowerCase() === clienteEmail?.toLowerCase()
            );
            if (match) { clientUserId = match.id; found = true; }
            if (usersPage.users.length < 100) break;
            page++;
          }
        }

        if (!clientUserId) {
          return new Response(
            JSON.stringify({ error: "Utilizador existe mas não foi possível encontrá-lo" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: `Erro ao criar utilizador: ${createError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      clientUserId = newUser.user.id;
      isNewUser = true;
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
        const origin = req.headers.get("origin") || "https://obrasysv2.lovable.app";
        const loginUrl = `${origin}/auth`;
        const logoUrl = `${origin}/logo.png`;

        // For new users, mint a one-time recovery link so they set their own password
        // instead of receiving a plaintext temporary password by email.
        let setupUrl = loginUrl;
        if (isNewUser) {
          try {
            const { data: linkData, error: linkError } =
              await supabaseAdmin.auth.admin.generateLink({
                type: "recovery",
                email: clienteEmail!,
                options: { redirectTo: `${origin}/auth/reset-password` },
              });
            if (!linkError && linkData?.properties?.action_link) {
              setupUrl = linkData.properties.action_link;
            } else if (linkError) {
              console.error("generateLink error:", linkError.message);
            }
          } catch (linkErr) {
            console.error("generateLink threw:", linkErr);
          }
        }

        const templateSlug = isNewUser ? "convite-portal-cliente" : "convite-portal-cliente-existente";

        // Get the email template
        const { data: template } = await supabaseAdmin
          .from("email_templates")
          .select("html_content, assunto")
          .eq("slug", templateSlug)
          .eq("ativo", true)
          .single();

        // Fallback templates (no plaintext password — magic recovery link only)
        const fallbackNew = `
          <p>Olá ${clienteNome},</p>
          <p>A sua obra <strong>${obraNome}</strong> já está no ObraSys.</p>
          <p>Para concluir o acesso, defina a sua palavra-passe através do link abaixo:</p>
          <p><a href="${setupUrl}">Definir palavra-passe e aceder ao Portal</a></p>
          <p>Este link é pessoal e expira após a primeira utilização.</p>
        `;
        const fallbackExisting = `
          <p>Olá ${clienteNome},</p>
          <p>Tem agora acesso à obra <strong>${obraNome}</strong> no ObraSys.</p>
          <p><a href="${loginUrl}">Aceder ao Portal</a></p>
        `;

        let htmlContent = template?.html_content || (isNewUser ? fallbackNew : fallbackExisting);

        // Replace variables. {{senha}} is intentionally removed — any stored template
        // referencing it is replaced with an empty string so credentials are never sent.
        htmlContent = htmlContent
          .replace(/\{\{nome\}\}/g, clienteNome || "")
          .replace(/\{\{obraName\}\}/g, obraNome || "")
          .replace(/\{\{loginUrl\}\}/g, isNewUser ? setupUrl : loginUrl)
          .replace(/\{\{setupUrl\}\}/g, setupUrl)
          .replace(/\{\{email\}\}/g, clienteEmail || "")
          .replace(/\{\{senha\}\}/g, "")
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
    const msg = error instanceof Error ? error.message : "Erro interno";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
