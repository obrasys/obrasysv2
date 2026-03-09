import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is super admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: isSuperAdmin, error: adminErr } = await userClient.rpc("is_super_admin");
    if (adminErr || !isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = await req.json();
    const { action, userId, email, nome, role } = body;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // ─── CREATE USER ───
    if (action === "create_user") {
      if (!email) {
        return new Response(JSON.stringify({ error: "Email é obrigatório" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Generate a temporary random password
      const tempPassword = crypto.randomUUID().slice(0, 16) + "Aa1!";

      // Create user via Supabase Auth Admin
      const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          nome: nome || email.split("@")[0],
          role: role || "gestor",
        },
      });

      if (createError) {
        console.error("Create user error:", createError);
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Update profile role if needed
      if (newUser?.user?.id && role) {
        await serviceClient
          .from("profiles")
          .update({ role, nome: nome || email.split("@")[0] })
          .eq("user_id", newUser.user.id);
      }

      // Generate password reset link so user can set their own password
      const { data: resetData, error: resetError } = await serviceClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: "https://obrasysv2.lovable.app/reset-password",
        },
      });

      // Send welcome/access email via Resend
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey && resetData?.properties?.action_link) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "ObraSys <noreply@obrasys.pt>",
              to: [email],
              subject: "Bem-vindo ao ObraSys - Instruções de Acesso",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2>Bem-vindo ao ObraSys!</h2>
                  <p>Olá${nome ? ` ${nome}` : ""},</p>
                  <p>A sua conta foi criada no ObraSys. Para começar a usar a plataforma, defina a sua password clicando no botão abaixo:</p>
                  <p style="margin: 24px 0;">
                    <a href="${resetData.properties.action_link}" 
                       style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                      Definir Password e Aceder
                    </a>
                  </p>
                  <p style="color: #666; font-size: 14px;">Após definir a sua password, poderá aceder ao ObraSys em <a href="https://app.obrasys.pt">app.obrasys.pt</a></p>
                  <p style="color: #666; font-size: 14px;">Se não esperava receber este email, pode ignorá-lo.</p>
                </div>
              `,
            }),
          });
        } catch (emailErr) {
          console.error("Failed to send welcome email via Resend:", emailErr);
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Utilizador ${email} criado com sucesso. Email de acesso enviado.`,
        userId: newUser?.user?.id,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ─── SEND PASSWORD RESET ───
    if (action === "send_password_reset") {
      if (!email) {
        return new Response(JSON.stringify({ error: "Email is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const { data, error } = await serviceClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: "https://obrasysv2.lovable.app/reset-password",
        },
      });

      if (error) {
        console.error("Password reset error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey && data?.properties?.action_link) {
        try {
          const resendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "ObraSys <noreply@obrasys.pt>",
              to: [email],
              subject: "Redefinir a sua password - ObraSys",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2>Redefinição de Password</h2>
                  <p>Recebeu este email porque um administrador solicitou a redefinição da sua password.</p>
                  <p>Clique no botão abaixo para definir uma nova password:</p>
                  <p style="margin: 24px 0;">
                    <a href="${data.properties.action_link}" 
                       style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                      Redefinir Password
                    </a>
                  </p>
                  <p style="color: #666; font-size: 14px;">Se não solicitou esta alteração, pode ignorar este email.</p>
                </div>
              `,
            }),
          });
          const resendData = await resendRes.json();
          console.log("Resend response:", resendData);
        } catch (emailErr) {
          console.error("Failed to send email via Resend:", emailErr);
        }
      }

      return new Response(JSON.stringify({ success: true, message: "Password reset enviado" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ─── RENEW TRIAL ───
    if (action === "renew_trial") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const newTrialEnd = new Date();
      newTrialEnd.setDate(newTrialEnd.getDate() + 30);

      const { error: updateError } = await serviceClient
        .from("profiles")
        .update({
          trial_end: newTrialEnd.toISOString(),
          trial_expired: false,
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Trial renewal error:", updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      await serviceClient
        .from("subscribers")
        .update({
          subscription_end: newTrialEnd.toISOString(),
          subscription_status: "trialing",
          subscription_tier: "trial",
          subscribed: false,
        })
        .eq("user_id", userId);

      return new Response(JSON.stringify({ success: true, message: "Trial renovado por 30 dias" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("admin-user-actions error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
