import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, "0");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (!resendKey) {
      return new Response(JSON.stringify({ error: "Email service não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await anonClient.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    const supabase = createClient(supabaseUrl, serviceKey);

    // Rate limit: max 3 envios nos últimos 10 min
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("mfa_otp_codes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", tenMinAgo);

    if ((count ?? 0) >= 3) {
      return new Response(
        JSON.stringify({ error: "Demasiados pedidos. Tente novamente em alguns minutos." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Buscar nome do utilizador
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome")
      .eq("user_id", userId)
      .maybeSingle();

    const code = generateCode();
    const codeHash = await sha256(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    // Invalidar códigos anteriores ainda ativos
    await supabase
      .from("mfa_otp_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("consumed_at", null);

    const { error: insertError } = await supabase.from("mfa_otp_codes").insert({
      user_id: userId,
      code_hash: codeHash,
      expires_at: expiresAt,
      ip_address: ip,
    });

    if (insertError) {
      console.error("Erro a guardar código:", insertError);
      return new Response(JSON.stringify({ error: "Erro interno" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nome = profile?.nome ?? "Utilizador";

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <tr><td style="background:#0F4C5C;padding:32px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:600;">ObraSys — Código de Verificação</h1>
        </td></tr>
        <tr><td style="padding:40px 32px;">
          <p style="font-size:16px;color:#1a1a1a;margin:0 0 16px;">Olá ${nome},</p>
          <p style="font-size:15px;color:#444;line-height:1.5;margin:0 0 24px;">
            Para concluir o seu login na ObraSys, utilize o seguinte código de verificação:
          </p>
          <div style="text-align:center;background:#f0f4f5;border:2px solid #0F4C5C;border-radius:10px;padding:24px;margin:24px 0;">
            <div style="font-size:36px;font-weight:700;letter-spacing:10px;color:#0F4C5C;font-family:monospace;">${code}</div>
          </div>
          <p style="font-size:14px;color:#666;margin:0 0 8px;">⏱️ Este código expira em <strong>5 minutos</strong>.</p>
          <p style="font-size:14px;color:#666;margin:0 0 24px;">🔒 Se não foi você que pediu este código, ignore este email e altere imediatamente a sua password.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
          <p style="font-size:13px;color:#888;margin:0;">
            António Cavalcanti<br>
            Fundador — ObraSys
          </p>
        </td></tr>
        <tr><td style="background:#fafafa;padding:16px;text-align:center;font-size:12px;color:#999;">
          © ${new Date().getFullYear()} ObraSys. Email automático — não responder.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const emailResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ObraSys <noreply@obrasys.pt>",
        to: [userEmail],
        subject: `🔐 Código de verificação: ${code}`,
        html,
      }),
    });

    if (!emailResp.ok) {
      const errBody = await emailResp.text();
      console.error("Resend erro:", errBody);
      return new Response(JSON.stringify({ error: "Falha ao enviar email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, expires_in: 300 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-2fa-code erro:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
