import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate caller is super admin
    const userClient = createClient(url, serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: isSuperAdmin, error: adminErr } = await userClient.rpc("is_super_admin");
    if (adminErr || !isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId required" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const svc = createClient(url, serviceKey);

    const count = (tbl: string) =>
      svc.from(tbl).select("id", { count: "exact", head: true }).eq("user_id", userId);

    const [
      profile, subscriber, engagement, mfa,
      obrasCount, orcCount, rdosCount, contasCount, autosCount,
      obrasList, orcList, tickets, devices,
      memberships, alocacoes,
    ] = await Promise.all([
      svc.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      svc.from("subscribers").select("*").eq("user_id", userId).maybeSingle(),
      svc.from("user_engagement_status").select("*").eq("user_id", userId).maybeSingle(),
      svc.from("user_mfa_settings").select("*").eq("user_id", userId).maybeSingle(),
      count("obras"),
      count("orcamentos"),
      count("relatorios_diarios"),
      count("contas_financeiras"),
      count("autos_medicao"),
      svc.from("obras").select("id, nome, status, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
      svc.from("orcamentos").select("id, titulo, status, valor_total, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
      svc.from("support_tickets").select("id, titulo, status, prioridade, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
      svc.from("mfa_trusted_devices").select("id, device_label, last_used_at, created_at").eq("user_id", userId).order("last_used_at", { ascending: false }).limit(5),
      svc.from("organization_members").select("organization_id, role, member_status").eq("user_id", userId),
      svc.from("alocacoes_obra").select("id", { count: "exact", head: true }).eq("membro_id", userId),
    ]);

    // Org info
    let orgInfo: any = null;
    const orgIds = (memberships.data || []).map((m: any) => m.organization_id).filter(Boolean);
    if (orgIds.length) {
      const { data: org } = await svc.from("organizations").select("nome").eq("id", orgIds[0]).maybeSingle();
      const { count: memberCount } = await svc.from("organization_members").select("user_id", { count: "exact", head: true }).eq("organization_id", orgIds[0]).eq("member_status", "active");
      orgInfo = { name: (org as any)?.nome || "—", memberCount: memberCount || 1, role: (memberships.data?.[0] as any)?.role };
    }

    // Auth metadata (last sign in, providers)
    const { data: authUser } = await svc.auth.admin.getUserById(userId);

    return new Response(JSON.stringify({
      profile: profile.data,
      subscriber: subscriber.data,
      engagement: engagement.data,
      mfa: mfa.data,
      authMeta: authUser?.user ? {
        last_sign_in_at: authUser.user.last_sign_in_at,
        email_confirmed_at: authUser.user.email_confirmed_at,
        providers: authUser.user.app_metadata?.providers || [],
        created_at: authUser.user.created_at,
      } : null,
      orgInfo,
      counts: {
        obras: obrasCount.count || 0,
        orcamentos: orcCount.count || 0,
        rdos: rdosCount.count || 0,
        contas: contasCount.count || 0,
        autos: autosCount.count || 0,
        alocacoes: alocacoes.count || 0,
      },
      obras: obrasList.data || [],
      orcamentos: orcList.data || [],
      tickets: tickets.data || [],
      devices: devices.data || [],
    }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (err: any) {
    console.error("admin-get-user-detail error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
