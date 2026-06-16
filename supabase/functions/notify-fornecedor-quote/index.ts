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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const quoteRequestId = String(body?.quote_request_id || "");
    if (!quoteRequestId) throw new Error("quote_request_id em falta");

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: qr, error: qrErr } = await admin
      .from("quote_requests")
      .select("id, builder_user_id, fornecedor_id, requested_deadline, message_to_suppliers, terms, delivery_location, organization_id")
      .eq("id", quoteRequestId)
      .single();
    if (qrErr || !qr) throw new Error("Pedido não encontrado");
    if (qr.builder_user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!qr.fornecedor_id) throw new Error("Pedido sem fornecedor associado");

    const { data: forn } = await admin
      .from("fornecedores")
      .select("nome, email")
      .eq("id", qr.fornecedor_id)
      .single();
    if (!forn?.email) throw new Error("Fornecedor sem email configurado");

    const { data: items } = await admin
      .from("quote_request_items")
      .select("descricao, unidade, quantidade, codigo, capitulo")
      .eq("quote_request_id", quoteRequestId)
      .order("created_at");

    const { data: org } = await admin
      .from("organizations")
      .select("name")
      .eq("id", qr.organization_id!)
      .maybeSingle();
    const tenantName = org?.name || "ObraSys";
    const portalUrl = `${req.headers.get("origin") || "https://obrasysv2.lovable.app"}/fornecedor/pedidos`;

    const rowsHtml = (items || []).map((it: any) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;">${it.codigo || ""}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;">${it.descricao}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${it.unidade || "un"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">${Number(it.quantidade).toLocaleString("pt-PT")}</td>
      </tr>
    `).join("");

    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "ObraSys <noreply@obrasys.pt>",
          to: [forn.email],
          subject: `Novo pedido de cotação de ${tenantName}`,
          html: `
            <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#0f172a;">
              <h2 style="color:#0F4C5C;margin:0 0 12px;">Pedido de Cotação</h2>
              <p>Olá <strong>${forn.nome}</strong>,</p>
              <p>A empresa <strong>${tenantName}</strong> enviou-lhe um pedido de cotação através do ObraSys.</p>
              <div style="background:#f1f5f9;padding:14px 16px;border-radius:8px;margin:14px 0;">
                ${qr.requested_deadline ? `<p style="margin:4px 0;"><strong>Prazo para resposta:</strong> ${qr.requested_deadline}</p>` : ""}
                ${qr.delivery_location ? `<p style="margin:4px 0;"><strong>Local de entrega:</strong> ${qr.delivery_location}</p>` : ""}
                ${qr.message_to_suppliers ? `<p style="margin:4px 0;"><strong>Mensagem:</strong> ${qr.message_to_suppliers}</p>` : ""}
              </div>
              ${items && items.length > 0 ? `
                <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
                  <thead>
                    <tr style="background:#0F4C5C;color:white;">
                      <th style="padding:8px;text-align:left;">Código</th>
                      <th style="padding:8px;text-align:left;">Descrição</th>
                      <th style="padding:8px;">Unid.</th>
                      <th style="padding:8px;text-align:right;">Qtd.</th>
                    </tr>
                  </thead>
                  <tbody>${rowsHtml}</tbody>
                </table>
              ` : ""}
              <p style="margin-top:20px;">
                <a href="${portalUrl}" style="display:inline-block;background:#0F4C5C;color:white;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">
                  Responder no Portal
                </a>
              </p>
              <p style="color:#64748b;margin-top:24px;font-size:12px;">Email automático enviado via ObraSys.</p>
            </div>
          `,
        }),
      });
    }

    await admin
      .from("quote_requests")
      .update({ status: "sent" })
      .eq("id", quoteRequestId);

    return new Response(JSON.stringify({ ok: true, email_sent: !!resendKey }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-fornecedor-quote error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
