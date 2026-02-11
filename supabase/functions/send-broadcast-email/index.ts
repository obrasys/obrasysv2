import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BroadcastEmailRequest {
  to: string[];
  subject: string;
  html: string;
}

const replaceVariables = (html: string, variables: Record<string, string>) => {
  let result = html;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value);
  }
  return result;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create a client that can both verify permissions and send emails.
    // We forward the user's JWT so database functions using auth.uid() work correctly.
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: isSuperAdmin, error: adminErr } = await supabase.rpc(
      "is_super_admin",
    );

    if (adminErr) {
      console.error("is_super_admin rpc error:", adminErr);
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const payload: BroadcastEmailRequest = await req.json();
    const to = Array.isArray(payload?.to) ? payload.to : [];
    const subject = (payload?.subject ?? "").trim();
    const html = payload?.html ?? "";

    if (to.length === 0) throw new Error("Missing recipients");
    if (!subject) throw new Error("Missing subject");
    if (!html) throw new Error("Missing html");

    if (to.length > 100) {
      throw new Error("Too many recipients (max 100 per request)");
    }

    const appUrl = "https://obrasysv2.lovable.app";
    const logoUrl = `${supabaseUrl}/storage/v1/object/public/brand-assets/logo.png`;
    const ano = new Date().getFullYear().toString();

    // Pre-fetch profiles for personalization (nome + user_id for survey tokens)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("user_id, email, nome")
      .in("email", to);

    const profileMap = new Map<string, { user_id: string; nome: string }>();
    if (profiles) {
      for (const p of profiles) {
        profileMap.set(p.email.toLowerCase(), { user_id: p.user_id, nome: p.nome });
      }
    }

    const results = await Promise.all(
      to.map(async (email) => {
        const profile = profileMap.get(email.toLowerCase());
        const nome = profile?.nome || email.split("@")[0];
        const userId = profile?.user_id || "";

        // Generate survey token: base64(userId:email)
        const surveyToken = btoa(`${userId}:${email}`);
        const pesquisaUrl = `${appUrl}/pesquisa?token=${encodeURIComponent(surveyToken)}`;

        const htmlContent = replaceVariables(html, {
          "{{email}}": email,
          "{{nome}}": nome,
          "{{appUrl}}": appUrl,
          "{{logoUrl}}": logoUrl,
          "{{ano}}": ano,
          "{{pesquisaUrl}}": pesquisaUrl,
        });

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "ObraSys <noreply@obrasys.pt>",
            to: [email],
            subject,
            html: htmlContent,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error("Resend API error:", errText);
          return { email, ok: false, error: errText };
        }

        const data = await res.json();
        return { email, ok: true, data };
      }),
    );

    const sent = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;

    return new Response(JSON.stringify({ sent, failed, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-broadcast-email:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
