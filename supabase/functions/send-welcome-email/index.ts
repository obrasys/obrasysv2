import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  nome: string;
}

// Fallback template if not found in database
const getFallbackHtmlContent = (nome: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: bold; color: #2563eb; }
    h1 { color: #1e3a5f; font-size: 24px; }
    .highlight { background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; }
    .features { margin: 20px 0; }
    .feature-item { padding: 8px 0; padding-left: 25px; position: relative; }
    .feature-item:before { content: "✓"; position: absolute; left: 0; color: #22c55e; font-weight: bold; }
    .next-steps { background-color: #fef3c7; border-radius: 8px; padding: 20px; margin: 25px 0; }
    .next-steps h3 { margin-top: 0; color: #92400e; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
    .signature { margin-top: 30px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">ObraSys</div>
  </div>

  <p>Olá${nome ? ` ${nome}` : ''},</p>

  <h1>Bem-vindo(a) ao ObraSys 👷‍♂️📊</h1>
  <p>É um prazer ter-te connosco.</p>

  <div class="highlight">
    <p>Criámos o ObraSys para resolver um problema real da construção civil: <strong>falta de controlo sobre custos, orçamentos e decisões ao longo da obra.</strong></p>
  </div>

  <p>Aqui vais poder:</p>
  
  <div class="features">
    <div class="feature-item">Criar orçamentos estruturados e rastreáveis</div>
    <div class="feature-item">Trabalhar com uma base de preços mais clara e consistente</div>
    <div class="feature-item">Ter maior visibilidade sobre custos e desvios</div>
    <div class="feature-item">Centralizar informação da obra num só lugar</div>
  </div>

  <p>Estamos a construir o ObraSys de forma sólida e prática, focados em quem trabalha com obras reais como tu.</p>

  <div class="next-steps">
    <h3>👉 Próximo passo</h3>
    <p>Aceda à plataforma e comece por:</p>
    <ul>
      <li>Explorar a Base de Preços</li>
      <li>Criar o teu primeiro orçamento</li>
      <li>Familiarizar-te com a estrutura de materiais e custos</li>
    </ul>
  </div>

  <p>Se tiveres dúvidas, sugestões ou precisares de ajuda, estamos desse lado.<br>
  Este produto também cresce com o feedback dos utilizadores.</p>

  <div class="signature">
    <p>Obrigado por confiares no ObraSys.<br>
    <strong>Vamos construir com mais controlo, obra após obra.</strong></p>

    <p>Com os melhores cumprimentos,<br>
    <strong>Equipa ObraSys</strong></p>
  </div>

  <div class="footer">
    <p>—<br>
    Se não foste tu a criar esta conta, podes ignorar este email.</p>
  </div>
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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, nome }: WelcomeEmailRequest = await req.json();

    console.log("Sending welcome email to:", email, "Name:", nome);

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Setup Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // URLs for template
    const appUrl = "https://obrasysv2.lovable.app";
    const logoUrl = `${supabaseUrl}/storage/v1/object/public/brand-assets/logo.png`;
    const ano = new Date().getFullYear().toString();

    // Try to fetch template from database
    let htmlContent: string;
    let subject = "Bem-vindo(a) ao ObraSys 👷‍♂️📊";

    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("assunto, html_content")
      .eq("slug", "welcome")
      .eq("ativo", true)
      .single();

    if (templateError || !template) {
      console.log("Using fallback template, error:", templateError?.message);
      htmlContent = getFallbackHtmlContent(nome || "");
    } else {
      console.log("Using database template for welcome email");
      subject = template.assunto;
      htmlContent = replaceVariables(template.html_content, {
        "{{nome}}": nome || "",
        "{{email}}": email,
        "{{appUrl}}": appUrl,
        "{{logoUrl}}": logoUrl,
        "{{ano}}": ano,
      });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ObraSys <noreply@obrasys.pt>",
        to: [email],
        subject: subject,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const emailResponse = await response.json();
    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending welcome email:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
