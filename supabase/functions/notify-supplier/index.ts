import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { quote_request_id, supplier_ids } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey);

    // Get quote request details
    const { data: qr } = await supabase
      .from("quote_requests")
      .select("*, quote_request_categories(supplier_categories(name))")
      .eq("id", quote_request_id)
      .single();

    if (!qr) throw new Error("Quote request not found");

    const cats = qr.quote_request_categories?.map((c: any) => c.supplier_categories?.name).filter(Boolean).join(", ") || "Geral";

    // Get supplier emails from auth users
    if (!supplier_ids || supplier_ids.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: supplierProfiles } = await supabase
      .from("supplier_profiles")
      .select("user_id, legal_name, trade_name")
      .in("id", supplier_ids);

    if (!supplierProfiles || supplierProfiles.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let sent = 0;
    for (const sp of supplierProfiles) {
      const { data: userData } = await supabase.auth.admin.getUserById(sp.user_id);
      const email = userData?.user?.email;
      if (!email) continue;

      const name = sp.trade_name || sp.legal_name || "Fornecedor";
      const portalUrl = `${req.headers.get("origin") || "https://obrasysv2.lovable.app"}/fornecedor/pedidos`;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "ObraSys <noreply@obrasys.pt>",
          to: [email],
          subject: `Novo pedido de cotação — ${cats}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
              <h2 style="color:#00679d;">Novo Pedido de Cotação</h2>
              <p>Olá <strong>${name}</strong>,</p>
              <p>Recebeu um novo pedido de cotação através da Rede de Fornecedores ObraSys.</p>
              <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
                <p><strong>Categorias:</strong> ${cats}</p>
                ${qr.location_district ? `<p><strong>Local:</strong> ${qr.location_district}${qr.location_municipality ? `, ${qr.location_municipality}` : ""}</p>` : ""}
                ${qr.requested_deadline ? `<p><strong>Prazo para resposta:</strong> ${qr.requested_deadline}</p>` : ""}
              </div>
              <a href="${portalUrl}" style="display:inline-block;background:#00679d;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
                Ver Pedido no Portal
              </a>
              <p style="color:#888;margin-top:24px;font-size:12px;">ObraSys — Rede de Fornecedores Certificados</p>
            </div>
          `,
        }),
      });
      sent++;
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-supplier error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
