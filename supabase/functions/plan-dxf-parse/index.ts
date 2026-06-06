// Fase 4 — Pipeline DXF vetorial (sem IA visual).
// Parsing determinístico de DXF com dxf-parser (npm:), classificação por layer
// + heurística geométrica. Devolve o mesmo formato que `icf-plant-analysis`
// (paredes / fundacoes / lajes) + cria snapshot em plan_analysis_versions e
// regista eventos em plan_analysis_logs.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
// dxf-parser é puro JS, sem dependências nativas — compatível com Deno via esm.sh.
import DxfParser from "https://esm.sh/dxf-parser@1.1.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer classification
// ─────────────────────────────────────────────────────────────────────────────

type LayerKind =
  | "wall"
  | "door"
  | "window"
  | "room"
  | "dimension"
  | "structure"
  | "foundation"
  | "slab"
  | "other";

const LAYER_PATTERNS: Array<{ kind: LayerKind; re: RegExp }> = [
  { kind: "wall", re: /(^|[_\-])(wall|walls|parede|paredes|arq_parede|icf|muro|alvenaria)([_\-]|$)/i },
  { kind: "door", re: /(^|[_\-])(door|doors|porta|portas)([_\-]|$)/i },
  { kind: "window", re: /(^|[_\-])(window|windows|janela|janelas|vao|vaos|vao_jan)([_\-]|$)/i },
  { kind: "room", re: /(^|[_\-])(room|rooms|compartim|space|espaco|areas)([_\-]|$)/i },
  { kind: "dimension", re: /(^|[_\-])(dim|dimension|cota|cotas|medida)([_\-]|$)/i },
  { kind: "foundation", re: /(^|[_\-])(fund|foundation|fundac|sapata|sapatas|footing)([_\-]|$)/i },
  { kind: "slab", re: /(^|[_\-])(laje|lajes|slab|floor_slab)([_\-]|$)/i },
  { kind: "structure", re: /(^|[_\-])(structure|estrutura|pilar|pilares|viga|vigas|beam|column)([_\-]|$)/i },
];

function classifyLayer(layer: string | undefined): LayerKind {
  if (!layer) return "other";
  for (const { kind, re } of LAYER_PATTERNS) {
    if (re.test(layer)) return kind;
  }
  return "other";
}

// ─────────────────────────────────────────────────────────────────────────────
// Units: convert from $INSUNITS to a "meters per unit" factor
// 0 = unitless (assume mm), 1 = inches, 4 = mm, 5 = cm, 6 = m, 14 = dm
// ─────────────────────────────────────────────────────────────────────────────

function metersPerUnit(insUnits: number | undefined): { factor: number; assumed: boolean; unit: string } {
  switch (insUnits) {
    case 1: return { factor: 0.0254, assumed: false, unit: "in" };
    case 4: return { factor: 0.001, assumed: false, unit: "mm" };
    case 5: return { factor: 0.01, assumed: false, unit: "cm" };
    case 6: return { factor: 1, assumed: false, unit: "m" };
    case 14: return { factor: 0.1, assumed: false, unit: "dm" };
    default: return { factor: 0.001, assumed: true, unit: "mm (assumido)" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Geometry helpers
// ─────────────────────────────────────────────────────────────────────────────

type Pt = { x: number; y: number };
type Segment = { a: Pt; b: Pt; layer: string };

function dist(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function segLength(s: Segment) {
  return dist(s.a, s.b);
}

function angleOf(s: Segment): number {
  // Returns [0, π)
  let a = Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x);
  if (a < 0) a += Math.PI;
  if (a >= Math.PI) a -= Math.PI;
  return a;
}

function perpendicularDistance(s: Segment, p: Pt): number {
  const dx = s.b.x - s.a.x;
  const dy = s.b.y - s.a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) return dist(s.a, p);
  const cross = (p.x - s.a.x) * dy - (p.y - s.a.y) * dx;
  return Math.abs(cross) / Math.sqrt(len2);
}

function midpoint(s: Segment): Pt {
  return { x: (s.a.x + s.b.x) / 2, y: (s.a.y + s.b.y) / 2 };
}

// Extract LINE-equivalent segments from entities (LINE, LWPOLYLINE, POLYLINE)
function extractSegments(entities: any[]): Segment[] {
  const out: Segment[] = [];
  for (const e of entities ?? []) {
    const layer = e.layer || "0";
    if (e.type === "LINE" && e.vertices?.length >= 2) {
      out.push({
        a: { x: e.vertices[0].x, y: e.vertices[0].y },
        b: { x: e.vertices[1].x, y: e.vertices[1].y },
        layer,
      });
    } else if ((e.type === "LWPOLYLINE" || e.type === "POLYLINE") && Array.isArray(e.vertices)) {
      const v = e.vertices;
      for (let i = 0; i < v.length - 1; i++) {
        out.push({
          a: { x: v[i].x, y: v[i].y },
          b: { x: v[i + 1].x, y: v[i + 1].y },
          layer,
        });
      }
      if (e.shape && v.length > 2) {
        out.push({
          a: { x: v[v.length - 1].x, y: v[v.length - 1].y },
          b: { x: v[0].x, y: v[0].y },
          layer,
        });
      }
    }
  }
  return out;
}

// Heuristic: pair near-parallel segments at thickness 0.05–0.60 m into a single wall axis
function pairWalls(
  segments: Segment[],
  toMeters: (n: number) => number,
): { walls: Array<{ length_m: number; thickness_m: number; layer: string; paired: boolean }> } {
  const MIN_THICK = 0.05;
  const MAX_THICK = 0.6;
  const ANGLE_TOL = (3 * Math.PI) / 180; // 3°
  const OVERLAP_TOL = 0.3; // 30% length difference tolerated

  const wallSegs = segments.filter((s) => {
    const len = toMeters(segLength(s));
    return len >= 0.3 && len <= 60;
  });

  const used = new Array(wallSegs.length).fill(false);
  const walls: Array<{ length_m: number; thickness_m: number; layer: string; paired: boolean }> = [];

  for (let i = 0; i < wallSegs.length; i++) {
    if (used[i]) continue;
    const a = wallSegs[i];
    const aAng = angleOf(a);
    const aLen = segLength(a);
    let pairedIdx = -1;
    let bestThick = Infinity;

    for (let j = i + 1; j < wallSegs.length; j++) {
      if (used[j]) continue;
      const b = wallSegs[j];
      const bAng = angleOf(b);
      let dAng = Math.abs(aAng - bAng);
      if (dAng > Math.PI / 2) dAng = Math.PI - dAng;
      if (dAng > ANGLE_TOL) continue;

      const thickRaw = perpendicularDistance(a, midpoint(b));
      const thick = toMeters(thickRaw);
      if (thick < MIN_THICK || thick > MAX_THICK) continue;

      const bLen = segLength(b);
      const lenRatio = Math.abs(aLen - bLen) / Math.max(aLen, bLen);
      if (lenRatio > OVERLAP_TOL) continue;

      if (thick < bestThick) {
        bestThick = thick;
        pairedIdx = j;
      }
    }

    if (pairedIdx >= 0) {
      used[i] = true;
      used[pairedIdx] = true;
      const avgLen = (segLength(a) + segLength(wallSegs[pairedIdx])) / 2;
      walls.push({
        length_m: Number(toMeters(avgLen).toFixed(2)),
        thickness_m: Number(bestThick.toFixed(3)),
        layer: a.layer,
        paired: true,
      });
    } else {
      used[i] = true;
      walls.push({
        length_m: Number(toMeters(aLen).toFixed(2)),
        thickness_m: 0.2, // assumido — review obrigatório
        layer: a.layer,
        paired: false,
      });
    }
  }

  return { walls };
}

// Detect openings (door/window) as INSERT blocks or LWPOLYLINE on door/window layers
function extractOpenings(
  entities: any[],
  toMeters: (n: number) => number,
): { doors: Array<{ width_m: number; height_m: number }>; windows: Array<{ width_m: number; height_m: number }> } {
  const doors: Array<{ width_m: number; height_m: number }> = [];
  const windows: Array<{ width_m: number; height_m: number }> = [];

  for (const e of entities ?? []) {
    const kind = classifyLayer(e.layer);
    if (kind !== "door" && kind !== "window") continue;

    let width = 0;
    let height = 0;

    if (e.type === "INSERT") {
      // Default assumed sizes per kind (DXF blocks raramente carregam dimensão real)
      width = kind === "door" ? 0.9 : 1.2;
      height = kind === "door" ? 2.1 : 1.2;
    } else if ((e.type === "LWPOLYLINE" || e.type === "POLYLINE") && Array.isArray(e.vertices)) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const v of e.vertices) {
        if (v.x < minX) minX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.x > maxX) maxX = v.x;
        if (v.y > maxY) maxY = v.y;
      }
      width = toMeters(Math.abs(maxX - minX));
      height = kind === "door" ? 2.1 : 1.2;
    } else {
      continue;
    }

    const entry = { width_m: Number(width.toFixed(2)), height_m: Number(height.toFixed(2)) };
    if (kind === "door") doors.push(entry);
    else windows.push(entry);
  }

  return { doors, windows };
}

// ─────────────────────────────────────────────────────────────────────────────
// Logging helper
// ─────────────────────────────────────────────────────────────────────────────

async function logPlanAnalysisEvent(
  client: any,
  payload: {
    plan_import_id?: string | null;
    plan_analysis_version_id?: string | null;
    organization_id: string;
    obra_id?: string | null;
    user_id?: string | null;
    event_type: string;
    status?: "info" | "success" | "warning" | "error";
    message?: string;
    metadata?: Record<string, unknown>;
  },
) {
  try {
    await client.from("plan_analysis_logs").insert({
      plan_import_id: payload.plan_import_id ?? null,
      plan_analysis_version_id: payload.plan_analysis_version_id ?? null,
      organization_id: payload.organization_id,
      obra_id: payload.obra_id ?? null,
      user_id: payload.user_id ?? null,
      event_type: payload.event_type,
      status: payload.status ?? "info",
      message: payload.message ?? null,
      metadata: payload.metadata ?? {},
    });
  } catch (err) {
    console.warn("plan_analysis_logs insert failed:", (err as Error)?.message ?? err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

const MAX_DXF_BYTES = 20 * 1024 * 1024;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido" }, 405);

  let logCtx: {
    supabase?: any;
    organization_id?: string;
    user_id?: string;
    plan_import_id?: string | null;
    obra_id?: string | null;
  } = {};

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) return jsonResponse({ error: "Não autenticado" }, 401);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(token);
    if (authErr || !user) return jsonResponse({ error: "Não autenticado" }, 401);

    let body: any = {};
    try {
      const raw = await req.text();
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return jsonResponse({ error: "Corpo do pedido inválido (JSON malformado)" }, 400);
    }
    const { file_path, obra_id, configuracao_id, espessura_nucleo, unit_override } = body;
    if (!file_path || !configuracao_id) {
      return jsonResponse({ error: "Campos obrigatórios em falta: file_path, configuracao_id" }, 400);
    }
    const VALID_OVERRIDES = ["mm", "cm", "m", "in", "dm"] as const;
    type UnitOverride = typeof VALID_OVERRIDES[number];
    const unitOverride: UnitOverride | null =
      typeof unit_override === "string" && (VALID_OVERRIDES as readonly string[]).includes(unit_override)
        ? (unit_override as UnitOverride)
        : null;

    // Authorization: org membership
    const { data: userMembership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("member_status", "active")
      .maybeSingle();
    if (!userMembership?.organization_id) return jsonResponse({ error: "Sem acesso" }, 403);

    // Plan import + ownership check (anti-IDOR)
    const { data: planImport } = await supabase
      .from("plan_imports")
      .select("id, user_id, obra_id, file_type")
      .eq("file_path", file_path)
      .maybeSingle();
    if (!planImport) return jsonResponse({ error: "Planta não encontrada" }, 404);

    const { data: importerMembership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", planImport.user_id)
      .eq("member_status", "active")
      .maybeSingle();
    if (!importerMembership || importerMembership.organization_id !== userMembership.organization_id) {
      return jsonResponse({ error: "Sem acesso a esta planta." }, 403);
    }
    if (obra_id && planImport.obra_id && planImport.obra_id !== obra_id) {
      return jsonResponse({ error: "Planta não pertence à obra indicada." }, 403);
    }

    logCtx = {
      supabase,
      organization_id: userMembership.organization_id,
      user_id: user.id,
      plan_import_id: planImport.id,
      obra_id: obra_id ?? planImport.obra_id ?? null,
    };

    await logPlanAnalysisEvent(supabase, {
      plan_import_id: planImport.id,
      organization_id: userMembership.organization_id,
      obra_id: logCtx.obra_id,
      user_id: user.id,
      event_type: "analise_iniciada",
      status: "info",
      message: "Análise DXF iniciada",
      metadata: { configuracao_id, file_path, method: "dxf-parser" },
    });

    // Download
    const { data: fileData, error: dlErr } = await supabase.storage.from("plan-files").download(file_path);
    if (dlErr || !fileData) return jsonResponse({ error: "Erro ao descarregar ficheiro" }, 404);

    const buf = await fileData.arrayBuffer();
    if (buf.byteLength > MAX_DXF_BYTES) {
      return jsonResponse({ error: "Ficheiro DXF demasiado grande (>20 MB)." }, 413);
    }
    const dxfText = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    if (!/SECTION/i.test(dxfText) || !/EOF/i.test(dxfText)) {
      return jsonResponse({ error: "Ficheiro não parece um DXF válido (faltam SECTION/EOF)." }, 415);
    }

    // Parse
    let dxf: any;
    try {
      // @ts-ignore — dxf-parser is CJS-shaped
      const parser = new (DxfParser as any)();
      dxf = parser.parseSync(dxfText);
    } catch (err) {
      const msg = (err as Error)?.message ?? "Erro a interpretar DXF";
      return jsonResponse({ error: `Não foi possível ler o DXF: ${msg.slice(0, 240)}` }, 422);
    }

    const insUnits = dxf?.header?.$INSUNITS;
    const unit = metersPerUnit(insUnits);
    const toMeters = (n: number) => n * unit.factor;

    const entities: any[] = Array.isArray(dxf?.entities) ? dxf.entities : [];
    const segments = extractSegments(entities);

    // Layer inventory for audit
    const layerInventory: Record<string, { count: number; kind: LayerKind }> = {};
    for (const e of entities) {
      const l = e.layer || "0";
      if (!layerInventory[l]) layerInventory[l] = { count: 0, kind: classifyLayer(l) };
      layerInventory[l].count++;
    }

    // Walls: filter to wall-like layers, otherwise fall back to ALL segments with low confidence
    const wallLayerSegments = segments.filter((s) => classifyLayer(s.layer) === "wall");
    const usedFallback = wallLayerSegments.length === 0 && segments.length > 0;
    const candidate = usedFallback ? segments : wallLayerSegments;
    const { walls } = pairWalls(candidate, toMeters);

    // Openings
    const openings = extractOpenings(entities, toMeters);
    const totalDoors = openings.doors.length;
    const totalWindows = openings.windows.length;

    // Convert walls → paredes (formato icf-plant-analysis)
    const defaultHeight = 2.7;
    const defaultThickness = Number(espessura_nucleo) || 0.15;
    const baseConfidence = unit.assumed ? 0.45 : usedFallback ? 0.5 : 0.7;

    // Distribute openings round-robin pelos primeiros panos (heurística — review obrigatória)
    const vaosPorParede: Array<Array<{ tipo_vao: string; largura: number; altura: number; quantidade: number }>> =
      walls.map(() => []);
    [...openings.doors.map((d) => ({ ...d, tipo: "porta" })), ...openings.windows.map((w) => ({ ...w, tipo: "janela" }))]
      .forEach((o, idx) => {
        if (walls.length === 0) return;
        vaosPorParede[idx % walls.length].push({
          tipo_vao: o.tipo,
          largura: o.width_m,
          altura: o.height_m,
          quantidade: 1,
        });
      });

    const paredes = walls.map((w, i) => {
      const conf = w.paired ? baseConfidence : Math.min(baseConfidence, 0.45);
      const notas = [
        w.paired ? "[lido] par de linhas paralelas detetado" : "[estimado] linha única — espessura assumida",
        usedFallback ? "[inferido] layer de paredes não identificada — usados todos os segmentos" : null,
        unit.assumed ? "[inferido] unidade não declarada no DXF — assumido mm" : null,
      ].filter(Boolean).join(" | ");
      return {
        referencia: `DXF-${String(i + 1).padStart(3, "0")}`,
        comprimento: w.length_m,
        altura_util: defaultHeight,
        espessura_nucleo: w.paired ? w.thickness_m : defaultThickness,
        piso_inicial: null,
        piso_final: null,
        vaos: vaosPorParede[i] ?? [],
        confianca: conf,
        metodo_medicao: w.paired ? "cota" : "estimativa_visual",
        notas_validacao: notas,
      };
    });

    const extracted: any = {
      paredes,
      fundacoes: [],
      lajes: [],
      notas: [
        "Quantitativos extraídos por leitura vetorial do DXF.",
        unit.assumed ? "Unidade do ficheiro não declarada — assumido milímetros." : `Unidade detetada: ${unit.unit}.`,
        usedFallback ? "Nenhuma layer de paredes reconhecida — confirmar cada pano." : null,
        "Altura útil 2.70 m e descontos de vãos por confirmar na revisão humana.",
      ].filter(Boolean).join(" "),
      totais: {
        comprimento_paredes_m: Number(paredes.reduce((s, p) => s + p.comprimento, 0).toFixed(2)),
        total_vaos: totalDoors + totalWindows,
        total_portas: totalDoors,
        total_janelas: totalWindows,
      },
      validacao: {
        metodo: "dxf-parser",
        unidade_dxf: unit.unit,
        unidade_assumida: unit.assumed,
        layers_inventario: layerInventory,
        fallback_sem_layer_paredes: usedFallback,
        segmentos_totais: segments.length,
        paredes_emparelhadas: walls.filter((w) => w.paired).length,
        paredes_unicas_sem_par: walls.filter((w) => !w.paired).length,
        requer_revisao_humana: true, // v1 DXF: revisão sempre obrigatória
      },
    };

    // Snapshot versionado
    let planAnalysisVersionId: string | null = null;
    try {
      const { data: lastVersion } = await supabase
        .from("plan_analysis_versions")
        .select("version")
        .eq("plan_import_id", logCtx.plan_import_id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextVersion = (lastVersion?.version ?? 0) + 1;

      const confidences = paredes.map((p) => p.confianca).filter((n) => Number.isFinite(n));
      const avgConfidence = confidences.length
        ? Number((confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(3))
        : null;

      const { data: versionRow, error: versionErr } = await supabase
        .from("plan_analysis_versions")
        .insert({
          plan_import_id: logCtx.plan_import_id,
          organization_id: logCtx.organization_id!,
          obra_id: logCtx.obra_id,
          version: nextVersion,
          created_by: logCtx.user_id!,
          source: "plan-dxf-parse",
          analysis_payload: extracted,
          summary: {
            paredes: paredes.length,
            comprimento_total_m: extracted.totais.comprimento_paredes_m,
            portas: totalDoors,
            janelas: totalWindows,
            unidade: unit.unit,
          },
          confidence: avgConfidence,
          requires_review: true,
          human_reviewed: false,
        })
        .select("id")
        .single();
      if (versionErr) console.warn("plan_analysis_versions insert failed:", versionErr.message);
      else planAnalysisVersionId = versionRow?.id ?? null;
    } catch (err) {
      console.warn("plan_analysis_versions insert exception:", (err as Error)?.message ?? err);
    }

    await logPlanAnalysisEvent(supabase, {
      plan_import_id: logCtx.plan_import_id,
      plan_analysis_version_id: planAnalysisVersionId,
      organization_id: logCtx.organization_id!,
      obra_id: logCtx.obra_id,
      user_id: logCtx.user_id,
      event_type: "analise_concluida_com_revisao",
      status: "warning",
      message: `DXF analisado (${paredes.length} paredes, ${totalDoors + totalWindows} vãos)`,
      metadata: {
        metodo: "dxf-parser",
        unidade: unit.unit,
        unidade_assumida: unit.assumed,
        fallback_sem_layer_paredes: usedFallback,
      },
    });

    return jsonResponse({
      success: true,
      data: extracted,
      audit: extracted.validacao,
      plan_import_id: logCtx.plan_import_id,
      plan_analysis_version_id: planAnalysisVersionId,
    });
  } catch (e) {
    console.error("plan-dxf-parse error:", e);
    if (logCtx.supabase && logCtx.organization_id) {
      await logPlanAnalysisEvent(logCtx.supabase, {
        plan_import_id: logCtx.plan_import_id,
        organization_id: logCtx.organization_id,
        obra_id: logCtx.obra_id,
        user_id: logCtx.user_id,
        event_type: "erro",
        status: "error",
        message: (e as Error)?.message?.slice(0, 500) ?? "Erro interno",
      });
    }
    return jsonResponse({ error: "Erro interno ao processar o DXF" }, 500);
  }
});
