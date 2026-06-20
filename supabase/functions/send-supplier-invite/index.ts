import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const invite_id = body?.invite_id;
    if (!invite_id || typeof invite_id !== "string") {
      throw new Error("invite_id is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY missing");

    const supabase = createClient(supabaseUrl, serviceKey);

    // Get invite + org name
    const { data: invite, error: invError } = await supabase
      .from("supplier_invites")
      .select("id, email, token, nome_fornecedor, categoria, mensagem, expires_at, organization_id, status")
      .eq("id", invite_id)
      .single();

    if (invError || !invite) throw new Error("Convite não encontrado");
    if (invite.status !== "pending") throw new Error(`Convite no estado ${invite.status}`);

    let orgName = "Empresa ObraSys";
    if (invite.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("nome")
        .eq("id", invite.organization_id)
        .maybeSingle();
      if (org?.nome) orgName = org.nome;
    }

    const origin =
      req.headers.get("origin") ||
      req.headers.get("referer")?.replace(/\/$/, "") ||
      "https://app.obrasys.pt";
    const acceptUrl = `${origin}/fornecedor/aceitar?token=${invite.token}`;
    const expiresStr = invite.expires_at
      ? new Date(invite.expires_at).toLocaleDateString("pt-PT")
      : "—";

    const safeOrg = String(orgName).replace(/[<>]/g, "");
    const safeCat = invite.categoria ? String(invite.categoria).replace(/[<>]/g, "") : null;
    const safeMsg = invite.mensagem ? String(invite.mensagem).replace(/[<>]/g, "") : null;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937;">
        <h2 style="color:#0F4C5C;margin:0 0 8px;">Convite de fornecedor</h2>
        <p style="margin:0 0 16px;">Olá,</p>
        <p style="margin:0 0 16px;">
          A empresa <strong>${safeOrg}</strong> convidou-o(a) para fazer parte da sua
          rede de fornecedores no <strong>ObraSys</strong>.
        </p>
        ${safeCat ? `<p style="margin:0 0 8px;"><strong>Categoria:</strong> ${safeCat}</p>` : ""}
        ${
          safeMsg
            ? `<blockquote style="margin:12px 0;padding:8px 12px;border-left:3px solid #0F4C5C;color:#374151;background:#f3f4f6;">${safeMsg}</blockquote>`
            : ""
        }
        <p style="margin:16px 0;">Ao aceitar este convite poderá:</p>
        <ul style="margin:0 0 16px;padding-left:20px;color:#374151;">
          <li>Receber e responder a pedidos de cotação desta empresa</li>
          <li>Gerir os seus dados e tabelas de preços</li>
          <li>Manter histórico de propostas e adjudicações</li>
        </ul>
        <div style="text-align:center;margin:28px 0;">
          <a href="${acceptUrl}"
             style="display:inline-block;background:#0F4C5C;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">
            Aceitar convite
          </a>
        </div>
        <p style="font-size:12px;color:#6b7280;margin:24px 0 0;">
          Convite válido até ${expiresStr}. Caso não reconheça este pedido, pode ignorar este email.
        </p>
        <p style="font-size:12px;color:#6b7280;margin-top:24px;">
          ObraSys — Plataforma de gestão de obras
        </p>
      </div>
    `;

    const fromAddress = Deno.env.get("SUPPLIER_INVITE_FROM") || "ObraSys <noreply@obrasys.pt>";
    console.log("Sending invite", { to: invite.email, from: fromAddress, invite_id });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [invite.email],
        subject: `${safeOrg} convidou-o(a) como fornecedor no ObraSys`,
        html,
        reply_to: "antonio@obrasys.pt",
      }),
    });

    const respText = await res.text();
    if (!res.ok) {
      console.error("Resend error:", res.status, respText);
      return new Response(JSON.stringify({
        error: "resend_failed",
        status: res.status,
        details: respText,
        hint: res.status === 403 || res.status === 401
          ? "Domínio do remetente não verificado em Resend. Verifique obrasys.pt em https://resend.com/domains ou defina o secret SUPPLIER_INVITE_FROM com um remetente verificado."
          : undefined,
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("Resend ok:", respText);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("send-supplier-invite error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
