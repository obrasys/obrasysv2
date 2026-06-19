import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Require authenticated caller to prevent unauthenticated email abuse
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { quote_request_id, supplier_name: _ignoredSupplierName, total_amount } = await req.json();

    if (typeof quote_request_id !== "string" || !/^[0-9a-f-]{36}$/i.test(quote_request_id)) {
      return new Response(JSON.stringify({ error: "quote_request_id inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const totalAmountNum = typeof total_amount === "number" && isFinite(total_amount) && total_amount >= 0
      ? total_amount
      : null;

    const supabase = createClient(supabaseUrl, serviceKey);

    // SECURITY: verify caller is a supplier on this quote request.
    // 1) Find caller's supplier_profile
    const { data: supplierProfile } = await supabase
      .from("supplier_profiles")
      .select("id, company_name")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!supplierProfile) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Confirm the supplier is linked to this quote request
    const { data: supplierLink } = await supabase
      .from("quote_request_suppliers")
      .select("id")
      .eq("quote_request_id", quote_request_id)
      .eq("supplier_id", supplierProfile.id)
      .maybeSingle();

    if (!supplierLink) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get quote request with categories
    const { data: qr } = await supabase
      .from("quote_requests")
      .select("*, quote_request_categories(supplier_categories(name))")
      .eq("id", quote_request_id)
      .single();

    if (!qr) throw new Error("Quote request not found");

    // Source supplier name from DB (never trust client input) and escape for HTML
    const escapeHtml = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    const supplierNameSafe = escapeHtml(
      (supplierProfile.company_name || "Fornecedor").toString().slice(0, 200)
    );

    // Get builder email from auth
    const { data: builderData } = await supabase.auth.admin.getUserById(qr.builder_user_id);
    const builderEmail = builderData?.user?.email;
    if (!builderEmail) throw new Error("Builder email not found");

    // Get builder name from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome")
      .eq("user_id", qr.builder_user_id)
      .single();

    const builderNameRaw = profile?.nome || "Utilizador";
    const builderName = escapeHtml(builderNameRaw.toString().slice(0, 200));
    const catsRaw = qr.quote_request_categories?.map((c: any) => c.supplier_categories?.name).filter(Boolean).join(", ") || "Geral";
    const cats = escapeHtml(catsRaw.toString().slice(0, 500));
    const portalUrl = `${req.headers.get("origin") || "https://obrasysv2.lovable.app"}/rede-fornecedores`;

    const formattedTotal = totalAmountNum !== null
      ? new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(totalAmountNum)
      : null;

    const district = qr.location_district ? escapeHtml(qr.location_district.toString().slice(0, 200)) : "";
    const municipality = qr.location_municipality ? escapeHtml(qr.location_municipality.toString().slice(0, 200)) : "";

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "ObraSys <noreply@obrasys.pt>",
        to: [builderEmail],
        subject: `Nova proposta recebida - ${cats}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#00679d;">Nova Proposta de Cotação</h2>
            <p>Olá <strong>${builderName}</strong>,</p>
            <p>Recebeu uma nova proposta de cotação de um fornecedor da Rede ObraSys.</p>
            <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
              <p><strong>Fornecedor:</strong> ${supplierNameSafe}</p>
              <p><strong>Categorias:</strong> ${cats}</p>
              ${formattedTotal ? `<p><strong>Valor total:</strong> ${formattedTotal}</p>` : ""}
              ${district ? `<p><strong>Local:</strong> ${district}${municipality ? `, ${municipality}` : ""}</p>` : ""}
            </div>
            <a href="${portalUrl}" style="display:inline-block;background:#00679d;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
              Ver Proposta na Plataforma
            </a>
            <p style="color:#888;margin-top:24px;font-size:12px;">ObraSys - Rede de Fornecedores Certificados</p>
          </div>
        `,
      }),
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-builder error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
