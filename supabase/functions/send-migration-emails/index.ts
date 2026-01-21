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
  userName?: string;
}

// Fallback template if not found in database
const getFallbackMigrationEmailHtml = (nome: string, signupUrl: string, appUrl: string, logoUrl: string) => `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ObraSys 2.0 - Crie a sua palavra-passe</title>
  <link href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'Red Hat Display', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 103, 157, 0.12);">
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #002d44 0%, #00679d 50%, #0088cc 100%); padding: 40px 30px; text-align: center;">
              <img src="${logoUrl}" alt="ObraSys" style="height: 48px; margin-bottom: 16px;" />
              <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 18px; font-weight: 500; letter-spacing: 0.5px;">
                A nova geração de gestão de obras
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #002d44; margin: 0 0 24px; font-size: 26px; font-weight: 700;">
                Olá${nome ? ` ${nome}` : ''}! 👋
              </h2>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 24px;">
                Temos o prazer de anunciar o lançamento do <strong style="color: #00679d;">ObraSys 2.0</strong>! Esta nova versão foi completamente redesenhada para oferecer uma experiência mais poderosa e intuitiva.
              </p>
              
              <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid #00679d; padding: 24px; border-radius: 12px; margin: 28px 0;">
                <h3 style="color: #00679d; margin: 0 0 16px; font-size: 18px; font-weight: 600;">
                  ✨ Novidades da Versão 2.0
                </h3>
                <ul style="color: #0369a1; margin: 0; padding-left: 20px; line-height: 2;">
                  <li><strong>Base de Preços Colaborativa</strong> – Preços atualizados com auditoria completa</li>
                  <li><strong>Cadernos de Encargos com IA</strong> – Importação inteligente de PDF/DOCX</li>
                  <li><strong>Módulo Financeiro</strong> – Gestão de contas e fornecedores</li>
                  <li><strong>Conformidade Digital</strong> – Livro de Obra e documentação</li>
                  <li><strong>Orçamentos Paramétricos</strong> – Cálculos automáticos por medições</li>
                </ul>
              </div>
              
              <p style="color: #002d44; font-size: 16px; line-height: 1.7; margin: 0 0 8px;">
                <strong>Como ativar a sua conta:</strong>
              </p>
              <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 28px;">
                Clique no botão abaixo para criar a sua nova palavra-passe e começar a utilizar o ObraSys 2.0. O seu email já está pré-registado no sistema.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #00679d 0%, #0088cc 100%); color: #ffffff; text-decoration: none; padding: 18px 48px; border-radius: 10px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 16px rgba(0, 103, 157, 0.35); letter-spacing: 0.3px;">
                      Criar Conta
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #94a3b8; font-size: 14px; text-align: center; margin: 28px 0 0;">
                Se o botão não funcionar, copie e cole este link no seu navegador:<br>
                <a href="${signupUrl}" style="color: #00679d; text-decoration: underline;">${signupUrl}</a>
              </p>
              
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 10px; margin: 28px 0 0;">
                <p style="color: #475569; font-size: 14px; margin: 0;">
                  💡 <strong style="color: #00679d;">Dica:</strong> Depois de criar a palavra-passe, pode aceder ao ObraSys em qualquer momento através de <a href="${appUrl}" style="color: #00679d; text-decoration: underline;">${appUrl}</a>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%); padding: 28px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 14px; margin: 0 0 12px;">
                Tem dúvidas? Responda a este email que teremos todo o gosto em ajudar.
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
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

// Replace template variables with actual values
const replaceVariables = (html: string, variables: Record<string, string>) => {
  let result = html;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
  }
  return result;
};

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

    const { limit = 50, testMode = false, testEmail, userName } = await req.json() as MigrationEmailRequest;

    // URLs
    const appUrl = "https://obrasysv2.lovable.app";
    const signupUrl = `${appUrl}/auth`;
    const logoUrl = `${supabaseUrl}/storage/v1/object/public/brand-assets/logo.png`;
    const ano = new Date().getFullYear().toString();

    // Try to fetch template from database
    let emailSubject = "🚀 ObraSys 2.0 - Crie a sua palavra-passe";
    let templateHtml: string | null = null;

    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("assunto, html_content")
      .eq("slug", "migration")
      .eq("ativo", true)
      .single();

    if (!templateError && template) {
      console.log("Using database template for migration email");
      emailSubject = template.assunto;
      templateHtml = template.html_content;
    } else {
      console.log("Using fallback template, error:", templateError?.message);
    }

    // Function to get email HTML for a user
    const getEmailHtml = (nome: string) => {
      if (templateHtml) {
        return replaceVariables(templateHtml, {
          "{{nome}}": nome,
          "{{signupUrl}}": signupUrl,
          "{{appUrl}}": appUrl,
          "{{logoUrl}}": logoUrl,
          "{{ano}}": ano,
        });
      }
      return getFallbackMigrationEmailHtml(nome, signupUrl, appUrl, logoUrl);
    };

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
          from: "ObraSys <noreply@obrasys.pt>",
          to: [testEmail],
          subject: emailSubject,
          html: getEmailHtml(userName || "Utilizador"),
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
            from: "ObraSys <noreply@obrasys.pt>",
            to: [user.email],
            subject: emailSubject,
            html: getEmailHtml(user.nome || ""),
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
