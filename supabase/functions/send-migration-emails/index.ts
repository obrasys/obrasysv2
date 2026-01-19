import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MigrationEmailRequest {
  limit?: number;
  testMode?: boolean;
  testEmail?: string;
}

const getMigrationEmailHtml = (nome: string, appUrl: string) => `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ObraSys 2.0 está aqui!</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">
                🚀 ObraSys 2.0
              </h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">
                A nova geração de gestão de obras
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #18181b; margin: 0 0 20px; font-size: 24px;">
                Olá${nome ? ` ${nome}` : ''}! 👋
              </h2>
              
              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Temos o prazer de anunciar o lançamento do <strong>ObraSys 2.0</strong>! Esta nova versão foi completamente redesenhada para oferecer uma experiência mais poderosa e intuitiva.
              </p>
              
              <div style="background-color: #fef3c7; border-left: 4px solid #f97316; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h3 style="color: #92400e; margin: 0 0 15px; font-size: 18px;">
                  ✨ Novidades da Versão 2.0
                </h3>
                <ul style="color: #78350f; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li><strong>Base de Preços Colaborativa</strong> - Preços atualizados com auditoria completa</li>
                  <li><strong>Cadernos de Encargos com IA</strong> - Importação inteligente de PDF/DOCX</li>
                  <li><strong>Módulo Financeiro</strong> - Gestão de contas e fornecedores</li>
                  <li><strong>Conformidade Digital</strong> - Livro de Obra e documentação</li>
                  <li><strong>Orçamentos Paramétricos</strong> - Cálculos automáticos por medições</li>
                </ul>
              </div>
              
              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                Para continuar a usar o ObraSys, basta criar a sua conta na nova plataforma. É rápido e simples!
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.4);">
                      Aceder ao ObraSys 2.0
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #a1a1aa; font-size: 14px; text-align: center; margin: 25px 0 0;">
                Se o botão não funcionar, copie e cole este link no seu navegador:<br>
                <a href="${appUrl}" style="color: #f97316;">${appUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f4f4f5; padding: 25px 30px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="color: #71717a; font-size: 14px; margin: 0 0 10px;">
                Tem dúvidas? Responda a este email que teremos todo o gosto em ajudar.
              </p>
              <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} ObraSys. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { limit = 50, testMode = false, testEmail } = await req.json() as MigrationEmailRequest;

    // App URL for the CTA button
    const appUrl = "https://obrasysv2.lovable.app";

    // In test mode, just send to the test email
    if (testMode && testEmail) {
      console.log(`Test mode: sending migration email to ${testEmail}`);
      
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "ObraSys <onboarding@resend.dev>",
          to: [testEmail],
          subject: "🚀 ObraSys 2.0 está aqui! Conheça a nova versão",
          html: getMigrationEmailHtml("Utilizador Teste", appUrl),
        }),
      });

      const emailData = await emailRes.json();
      
      if (!emailRes.ok) {
        console.error("Resend error:", emailData);
        return new Response(
          JSON.stringify({ error: "Erro ao enviar email de teste", details: emailData }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email de teste enviado com sucesso",
          testEmail 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get pending users
    const { data: pendingUsers, error: fetchError } = await supabase
      .from("migrated_users")
      .select("*")
      .eq("status", "pendente")
      .limit(limit);

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar utilizadores", details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pendingUsers || pendingUsers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Não há utilizadores pendentes para enviar email",
          sent: 0 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending migration emails to ${pendingUsers.length} users`);

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as { email: string; error: string }[]
    };

    // Send emails one by one (to avoid rate limits and track individual failures)
    for (const user of pendingUsers) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "ObraSys <onboarding@resend.dev>",
            to: [user.email],
            subject: "🚀 ObraSys 2.0 está aqui! Conheça a nova versão",
            html: getMigrationEmailHtml(user.nome || "", appUrl),
          }),
        });

        const emailData = await emailRes.json();

        if (emailRes.ok) {
          // Update status to email_sent
          await supabase
            .from("migrated_users")
            .update({ 
              status: "email_enviado", 
              email_sent_at: new Date().toISOString(),
              error_message: null
            })
            .eq("id", user.id);

          results.sent++;
          console.log(`Email sent to ${user.email}`);
        } else {
          // Mark as error
          await supabase
            .from("migrated_users")
            .update({ 
              status: "erro",
              error_message: JSON.stringify(emailData)
            })
            .eq("id", user.id);

          results.failed++;
          results.errors.push({ email: user.email, error: emailData.message || "Unknown error" });
          console.error(`Failed to send email to ${user.email}:`, emailData);
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        results.failed++;
        results.errors.push({ email: user.email, error: errorMessage });
        console.error(`Error sending email to ${user.email}:`, error);

        await supabase
          .from("migrated_users")
          .update({ 
            status: "erro",
            error_message: errorMessage
          })
          .eq("id", user.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `${results.sent} emails enviados, ${results.failed} falharam`,
        ...results
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-migration-emails:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Erro interno", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
