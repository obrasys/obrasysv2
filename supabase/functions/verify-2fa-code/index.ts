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

function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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

    const body = await req.json().catch(() => ({}));
    const code: string | undefined = body.code;
    const trustDevice: boolean = !!body.trustDevice;
    const deviceLabel: string = (body.deviceLabel ?? "Dispositivo desconhecido").toString().slice(0, 200);
    const deviceTokenIn: string | undefined = body.deviceToken;

    const supabase = createClient(supabaseUrl, serviceKey);

    // Trusted device fast-path (no code required)
    if (deviceTokenIn && !code) {
      const tokenHash = await sha256(deviceTokenIn);
      const { data: device } = await supabase
        .from("mfa_trusted_devices")
        .select("id, expires_at")
        .eq("user_id", userId)
        .eq("device_token_hash", tokenHash)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (!device) {
        // Not an error — caller will fall back to sending an OTP code.
        return new Response(JSON.stringify({ verified: false, trustedDevice: false }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabase.from("mfa_trusted_devices").update({ last_used_at: new Date().toISOString() }).eq("id", device.id);
      return new Response(JSON.stringify({ verified: true, trustedDevice: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!code || !/^\d{6}$/.test(code)) {
      return new Response(JSON.stringify({ error: "Código inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const codeHash = await sha256(code);

    const { data: otp } = await supabase
      .from("mfa_otp_codes")
      .select("id, code_hash, expires_at, consumed_at, attempts")
      .eq("user_id", userId)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otp) {
      return new Response(JSON.stringify({ error: "Código expirado ou inexistente. Peça novo código." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (otp.attempts >= 5) {
      await supabase.from("mfa_otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", otp.id);
      return new Response(JSON.stringify({ error: "Demasiadas tentativas. Peça novo código." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (otp.code_hash !== codeHash) {
      await supabase.from("mfa_otp_codes").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
      return new Response(JSON.stringify({ error: "Código incorreto", attempts_left: 4 - otp.attempts }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sucesso - consumir código
    await supabase.from("mfa_otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", otp.id);

    let deviceToken: string | null = null;
    if (trustDevice) {
      deviceToken = generateToken();
      const tokenHash = await sha256(deviceToken);
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("mfa_trusted_devices").insert({
        user_id: userId,
        device_token_hash: tokenHash,
        device_label: deviceLabel,
        expires_at: expires,
      });
    }

    return new Response(
      JSON.stringify({ verified: true, deviceToken }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("verify-2fa-code erro:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
