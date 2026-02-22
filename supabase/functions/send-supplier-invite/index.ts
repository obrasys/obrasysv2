import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { invite_id } = await req.json();
    if (!invite_id) throw new Error("invite_id is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey);

    // Get invite details
    const { data: invite, error: invError } = await supabase
      .from("supplier_invites")
      .select("*")
      .eq("id", invite_id)
      .single();

    if (invError || !invite) throw new Error("Invite not found");

    const portalUrl = `${req.headers.get("origin") || "https://obrasysv2.lovable.app"}/fornecedor/auth?invite=${invite.token}`;

    // Send email via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ObraSys <noreply@obrasys.pt>",
        to: [invite.email],
        subject: "Convite para a Rede de Fornecedores ObraSys",
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#00679d;">Convite para Fornecedor</h2>
            <p>Olá,</p>
            <p>Foi convidado para fazer parte da <strong>Rede de Fornecedores Certificados ObraSys</strong>.</p>
            <p>Através do portal poderá:</p>
            <ul>
              <li>Receber pedidos de cotação de construtores</li>
              <li>Gerir a sua tabela de preços</li>
              <li>Aumentar a sua visibilidade no mercado</li>
            </ul>
            <div style="margin:24px 0;">
              <a href="${portalUrl}" style="display:inline-block;background:#00679d;color:white;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">
                Aceitar Convite e Criar Conta
              </a>
            </div>
            <p style="color:#888;font-size:12px;">Este convite expira em ${new Date(invite.expires_at).toLocaleDateString("pt-PT")}.</p>
            <p style="color:#888;margin-top:24px;font-size:12px;">ObraSys — Rede de Fornecedores Certificados</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend error:", errText);
      throw new Error(`Resend API error: ${res.status}`);
    }

    await res.json();

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-supplier-invite error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
