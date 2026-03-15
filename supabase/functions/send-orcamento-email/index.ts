import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify calling user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { orcamento_id, email, mensagem } = await req.json();

    if (!orcamento_id || !email) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios em falta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch orcamento with chapters and articles
    const { data: orcamento, error: orcError } = await supabase
      .from("orcamentos")
      .select(`
        *,
        capitulos_orcamento (
          *,
          artigos_orcamento (*)
        ),
        clientes (nome, empresa),
        orcamento_contexto_fiscal (taxa_iva)
      `)
      .eq("id", orcamento_id)
      .eq("user_id", user.id)
      .single();

    if (orcError || !orcamento) {
      return new Response(JSON.stringify({ error: "Orçamento não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get sender profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome, empresa, empresa_nome, email, telefone")
      .eq("user_id", user.id)
      .single();

    const senderName = profile?.empresa_nome || profile?.empresa || profile?.nome || "ObrasYS";

    // Format currency
    const fmt = (v: number) =>
      new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

    // Apply global profit margin (same logic as the platform UI)
    const margemGlobal = orcamento.margem_lucro || 0;
    const margemMultiplier = 1 + margemGlobal / 100;

    // Sort chapters by numero, then sort articles by ordem within each chapter
    const capitulos = (orcamento.capitulos_orcamento || [])
      .sort((a: any, b: any) => a.numero - b.numero);

    let itemsHtml = "";
    for (const cap of capitulos) {
      itemsHtml += `<tr style="background:#f3f4f6"><td colspan="5" style="padding:8px;font-weight:bold">${cap.numero}. ${cap.titulo}</td></tr>`;
      const artigos = (cap.artigos_orcamento || [])
        .sort((a: any, b: any) => a.ordem - b.ordem);
      for (const art of artigos) {
        // Apply margin to unit price and total (margin is internal, client sees final price)
        const precoComMargem = art.preco_unitario * margemMultiplier;
        const totalComMargem = (art.valor_total || art.quantidade * art.preco_unitario) * margemMultiplier;
        itemsHtml += `<tr>
          <td style="padding:6px 8px">${art.descricao}</td>
          <td style="padding:6px 8px;text-align:center">${art.unidade}</td>
          <td style="padding:6px 8px;text-align:right">${art.quantidade}</td>
          <td style="padding:6px 8px;text-align:right">${fmt(precoComMargem)}</td>
          <td style="padding:6px 8px;text-align:right">${fmt(totalComMargem)}</td>
        </tr>`;
      }
    }

    // Calculate full total matching the platform logic (with margin applied)
    const subtotalArtigos = orcamento.valor_total || 0;
    const custosIndiretos = orcamento.custos_indiretos as any || {};
    const estaleiro = custosIndiretos.estaleiro || 0;
    const seguros = custosIndiretos.seguros || 0;
    const licenciamento = custosIndiretos.licenciamento || 0;
    const custosIndiretosTotal = estaleiro + seguros + licenciamento;
    const subtotalComIndiretos = subtotalArtigos + custosIndiretosTotal;
    const valorBase = subtotalComIndiretos * margemMultiplier;
    const taxaIva = orcamento.orcamento_contexto_fiscal?.taxa_iva ?? 23;
    const valorIva = valorBase * (taxaIva / 100);
    const valorFinal = valorBase + valorIva;

    // Build custos indiretos HTML
    let custosHtml = "";
    if (custosIndiretosTotal > 0) {
      custosHtml += `<div style="border-top:1px solid #e5e7eb;padding-top:12px;margin-top:12px">`;
      custosHtml += `<div style="display:flex;justify-content:space-between;font-size:14px"><span>Subtotal Artigos</span><span>${fmt(subtotalArtigos)}</span></div>`;
      if (estaleiro > 0) custosHtml += `<div style="display:flex;justify-content:space-between;font-size:13px;padding-left:16px;color:#6b7280"><span>Estaleiro</span><span>${fmt(estaleiro)}</span></div>`;
      if (seguros > 0) custosHtml += `<div style="display:flex;justify-content:space-between;font-size:13px;padding-left:16px;color:#6b7280"><span>Seguros</span><span>${fmt(seguros)}</span></div>`;
      if (licenciamento > 0) custosHtml += `<div style="display:flex;justify-content:space-between;font-size:13px;padding-left:16px;color:#6b7280"><span>Licenciamento</span><span>${fmt(licenciamento)}</span></div>`;
      custosHtml += `</div>`;
    }

    const resumoHtml = `
      <div style="text-align:right;border-top:2px solid #1a56db;padding-top:16px">
        ${custosHtml}
        <div style="display:flex;justify-content:space-between;font-size:14px;margin-top:8px"><span>Subtotal (s/ IVA)</span><span>${fmt(subtotalSemIva)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#6b7280"><span>IVA (${taxaIva}%)</span><span>${fmt(valorIva)}</span></div>
        <p style="font-size:18px;font-weight:bold;color:#1a56db;margin-top:8px">TOTAL: ${fmt(valorFinal)}</p>
      </div>
    `;

    const htmlBody = `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;color:#333">
        <div style="background:#1a56db;padding:24px;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:22px">Orçamento - ${orcamento.titulo}</h1>
          <p style="color:#dbeafe;margin:4px 0 0">${senderName}</p>
        </div>
        <div style="padding:24px;border:1px solid #e5e7eb;border-top:none">
          <p style="white-space:pre-line">${mensagem || ""}</p>
          
          <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:13px">
            <thead>
              <tr style="background:#1a56db;color:#fff">
                <th style="padding:8px;text-align:left">Descrição</th>
                <th style="padding:8px;text-align:center">Un.</th>
                <th style="padding:8px;text-align:right">Qtd.</th>
                <th style="padding:8px;text-align:right">P. Unit.</th>
                <th style="padding:8px;text-align:right">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          
          ${resumoHtml}
          
          <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"/>
          <p style="font-size:12px;color:#6b7280">
            Este orçamento foi gerado automaticamente por ${senderName} através da plataforma Obra Sys.
            ${profile?.telefone ? `Contacto: ${profile.telefone}` : ""}
            ${profile?.email ? ` | Email: ${profile.email}` : ""}
          </p>
        </div>
      </div>
    `;

    if (!resendKey) {
      console.log("RESEND_API_KEY not configured, logging email:");
      console.log(`To: ${email}, Subject: Orçamento - ${orcamento.titulo}`);
      return new Response(
        JSON.stringify({ success: true, message: "Email simulado (RESEND_API_KEY não configurada)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use verified domain obrasys.pt
    const fromEmail = `${senderName} <noreply@obrasys.pt>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        reply_to: [profile?.email || user.email],
        to: [email],
        subject: `Orçamento - ${orcamento.titulo}`,
        html: htmlBody,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("Resend error:", errBody);
      
      // Provide helpful error message
      if (errBody.includes("verify a domain")) {
        throw new Error("Para enviar emails a clientes, é necessário verificar um domínio no Resend. Contacte o suporte para configuração.");
      }
      throw new Error("Erro ao enviar email");
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
