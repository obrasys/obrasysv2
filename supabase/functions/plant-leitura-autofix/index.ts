import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UNIT_MAP: Record<string, string> = {
  m2: "m²", "m^2": "m²", "M2": "m²", "M²": "m²",
  m3: "m³", "m^3": "m³", "M3": "m³", "M³": "m³",
  un: "un", uni: "un", unid: "un", unidade: "un", unidades: "un",
  ml: "m", mts: "m", metros: "m",
};

function normalizeUnit(u?: string | null) {
  if (!u) return u;
  const key = u.trim();
  return UNIT_MAP[key] || UNIT_MAP[key.toLowerCase()] || key;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { plant_sheet_id } = await req.json();
    const { data: sheet } = await supabase.from("plant_sheets").select("*").eq("id", plant_sheet_id).maybeSingle();
    if (!sheet) return new Response(JSON.stringify({ error: "Sem acesso" }), { status: 403, headers: corsHeaders });

    const { data: elements } = await service.from("plant_elements").select("*").eq("plant_sheet_id", plant_sheet_id);
    if (!elements) return new Response(JSON.stringify({ fixed: 0 }), { headers: corsHeaders });

    let fixed = 0;
    const seen = new Map<string, any>();
    const toUpdate: any[] = [];
    const toDelete: string[] = [];

    for (const e of elements as any[]) {
      if (["approved", "edited", "ignored"].includes(e.status)) continue;
      const update: any = {};
      const nu = normalizeUnit(e.unit);
      if (nu !== e.unit) update.unit = nu;
      if (!e.category && e.code) {
        const prefix = e.code.split(/[\.\-_ ]/)[0]?.toUpperCase();
        const map: Record<string, string> = { P: "Paredes", V: "Vigas", L: "Lajes", S: "Sapatas", M: "Muros", E: "Instalações elétricas", H: "Instalações hidráulicas" };
        if (prefix && map[prefix]) update.category = map[prefix];
      }
      if (e.quantity !== null && e.quantity <= 0) update.status = "review";

      const dedupKey = `${(e.code || "").trim().toUpperCase()}|${(e.category || "").trim()}|${e.quantity}|${e.unit}`;
      if (e.code && seen.has(dedupKey)) {
        toDelete.push(e.id);
        fixed++;
        continue;
      }
      seen.set(dedupKey, e);

      if (Object.keys(update).length > 0) {
        toUpdate.push({ id: e.id, ...update });
        fixed++;
      }
    }

    for (const u of toUpdate) {
      const { id, ...rest } = u;
      await service.from("plant_elements").update(rest).eq("id", id);
    }
    if (toDelete.length) await service.from("plant_elements").delete().in("id", toDelete);

    await service.from("plant_processing_logs").insert({
      organization_id: sheet.organization_id, obra_id: sheet.obra_id,
      plant_file_id: sheet.plant_file_id, plant_sheet_id: sheet.id,
      step: "autofix", status: "ok", message: `${fixed} correções aplicadas`,
    });

    return new Response(JSON.stringify({ fixed, deleted: toDelete.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
