/**
 * Plan Room Analysis
 * -------------------
 * Função pura que cruza compartimentos (PlanRoom), paredes (PlanWall),
 * vãos (PlanOpening) e elementos colocados (PlacedPlantElement) para
 * produzir, por compartimento:
 *   - Área de piso (m²)
 *   - Perímetro (m)
 *   - Rodapé (m) = perímetro − Σ larguras de portas
 *   - Paredes (m²) = perímetro × pé direito − Σ áreas de vãos
 *   - Elementos agrupados por (tipo, largura, altura)
 *
 * E, no agregado:
 *   - Portas / janelas totais por dimensão
 *   - Total de rodapé
 *   - Total de paredes interiores
 *   - Estimativa de paredes exteriores (perímetro do contorno externo
 *     da planta × pé direito)
 *
 * Sem dependências de Supabase / React. Testável.
 */

import type { PlanRoom, PlanOpening, PlanWall } from "@/types/plan-measurements";
import type { PlacedPlantElement } from "@/types/plan-symbols";

export const ROOM_PALETTE = [
  "#8b5cf6", "#06b6d4", "#f59e0b", "#22c55e",
  "#ec4899", "#ef4444", "#3b82f6", "#14b8a6",
];

const DEFAULT_CEILING_HEIGHT_M = 2.6;
const DEFAULT_DOOR_HEIGHT_M = 2.0;
const DEFAULT_DOOR_WIDTH_M = 0.8;
const DEFAULT_WINDOW_W_M = 1.2;
const DEFAULT_WINDOW_H_M = 1.2;

export type ElementKind = "porta" | "janela";

export interface RoomElementGroup {
  tipo: ElementKind;
  largura_cm: number;
  altura_cm: number;
  qtd: number;
  label: string; // "Porta 80×200"
}

export interface RoomEdgeInfo {
  index: number;
  length_m: number;
  tag?: "Rodapé" | "Soleira";
}

export interface PerRoomAnalysis {
  room_id: string;
  name: string;
  color: string;
  area_m2: number;
  perimeter_m: number;
  baseboard_m: number;
  walls_m2: number;
  is_exterior: boolean;
  elements: RoomElementGroup[];
  edges: RoomEdgeInfo[];
  centroid: { x: number; y: number };
  ceiling_height_m: number;
}

export interface GlobalTotals {
  doorsByDim: Array<{ largura_cm: number; altura_cm: number; qtd: number; label: string }>;
  windowsByDim: Array<{ largura_cm: number; altura_cm: number; qtd: number; label: string }>;
  baseboard_m_total: number;
  interior_walls_m2_total: number;
  exterior_walls_m2_estimate: number;
  exterior_perimeter_m: number;
  floor_area_m2_total: number;
  doors_qtd_total: number;
  windows_qtd_total: number;
  ceiling_height_m: number;
}

export interface PlanRoomAnalysis {
  perRoom: PerRoomAnalysis[];
  totals: GlobalTotals;
}

export interface AnalysisInput {
  rooms: PlanRoom[];
  walls?: PlanWall[];
  openings?: PlanOpening[];
  placedElements?: PlacedPlantElement[];
  pixelsPerMeter?: number | null;
  ceilingHeightM?: number;
  defaultDoorHeightM?: number;
  defaultDoorWidthM?: number;
}

// ── Geometry helpers ──

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function polygonPerimeterPx(coords: Array<{ x: number; y: number }>): number {
  if (coords.length < 2) return 0;
  let p = 0;
  for (let i = 0; i < coords.length; i++) {
    const a = coords[i];
    const b = coords[(i + 1) % coords.length];
    p += dist(a, b);
  }
  return p;
}

function polygonCentroid(coords: Array<{ x: number; y: number }>): { x: number; y: number } {
  if (coords.length === 0) return { x: 0, y: 0 };
  let cx = 0, cy = 0;
  for (const p of coords) { cx += p.x; cy += p.y; }
  return { x: cx / coords.length, y: cy / coords.length };
}

function pointInPolygon(p: { x: number; y: number }, poly: Array<{ x: number; y: number }>): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > p.y) !== (yj > p.y)) &&
      (p.x < ((xj - xi) * (p.y - yi)) / ((yj - yi) || 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Convex hull (Andrew's monotone chain). Devolve perímetro em px. */
function convexHullPerimeterPx(points: Array<{ x: number; y: number }>): number {
  if (points.length < 3) return 0;
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: any, a: any, b: any) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: any[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: any[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  return polygonPerimeterPx(hull);
}

// ── Element classification ──

function isDoorElement(el: PlacedPlantElement): boolean {
  if (el.category === "vaos") {
    const id = (el.symbolTypeId || "").toLowerCase();
    return id.includes("porta") || id.includes("portao");
  }
  return false;
}

function isWindowElement(el: PlacedPlantElement): boolean {
  if (el.category === "vaos") {
    const id = (el.symbolTypeId || "").toLowerCase();
    return id.includes("janela");
  }
  return false;
}

function inferDoorWidthFromSymbol(symbolId: string, defaultWidthM: number): number {
  const s = symbolId.toLowerCase();
  if (s.includes("portao_lote")) return 3.0;
  if (s.includes("portao_garagem")) return 2.4;
  if (s.includes("correr")) return 1.2;
  if (s.includes("exterior")) return 0.9;
  return defaultWidthM;
}

// ── Main entry ──

export function computePlanRoomAnalysis(input: AnalysisInput): PlanRoomAnalysis {
  const rooms = input.rooms ?? [];
  const openings = input.openings ?? [];
  const walls = input.walls ?? [];
  const placed = input.placedElements ?? [];
  const ppm = input.pixelsPerMeter && input.pixelsPerMeter > 0 ? input.pixelsPerMeter : 1;
  const ceiling = input.ceilingHeightM ?? DEFAULT_CEILING_HEIGHT_M;
  const doorH = input.defaultDoorHeightM ?? DEFAULT_DOOR_HEIGHT_M;
  const doorW = input.defaultDoorWidthM ?? DEFAULT_DOOR_WIDTH_M;

  // Walls for opening lookup
  const wallById = new Map(walls.map((w) => [w.id, w]));

  const perRoom: PerRoomAnalysis[] = rooms.map((r, idx) => {
    const color = ROOM_PALETTE[idx % ROOM_PALETTE.length];
    const coords = (r.boundary_coords ?? []) as Array<{ x: number; y: number }>;
    const perimeterPx = polygonPerimeterPx(coords);
    const perimeter_m = perimeterPx / ppm;

    // Edges
    const edges: RoomEdgeInfo[] = [];
    for (let i = 0; i < coords.length; i++) {
      const a = coords[i];
      const b = coords[(i + 1) % coords.length];
      edges.push({ index: i, length_m: dist(a, b) / ppm, tag: "Rodapé" });
    }

    // Elements that fall inside this room polygon
    const inside = placed.filter((el) => pointInPolygon({ x: el.x, y: el.y }, coords));

    // Doors via openings whose wall belongs to this room (db-side) OR via placed
    const wallOpeningsInRoom: PlanOpening[] = openings.filter((o) => {
      const w = wallById.get(o.wall_id);
      return w?.room_id === r.id;
    });

    type Bucket = { tipo: ElementKind; largura_cm: number; altura_cm: number; qtd: number };
    const bucketsMap = new Map<string, Bucket>();
    const addBucket = (tipo: ElementKind, w_cm: number, h_cm: number, qty = 1) => {
      const lw = Math.max(1, Math.round(w_cm));
      const lh = Math.max(1, Math.round(h_cm));
      const key = `${tipo}|${lw}x${lh}`;
      const ex = bucketsMap.get(key);
      if (ex) ex.qtd += qty;
      else bucketsMap.set(key, { tipo, largura_cm: lw, altura_cm: lh, qtd: qty });
    };

    for (const el of inside) {
      if (isDoorElement(el)) {
        const w_m = inferDoorWidthFromSymbol(el.symbolTypeId, doorW);
        addBucket("porta", w_m * 100, doorH * 100, el.quantity ?? 1);
      } else if (isWindowElement(el)) {
        addBucket("janela", DEFAULT_WINDOW_W_M * 100, DEFAULT_WINDOW_H_M * 100, el.quantity ?? 1);
      }
    }
    for (const o of wallOpeningsInRoom) {
      const tipo: ElementKind = o.tipo === "janela" || o.tipo === "claraboia" ? "janela" : "porta";
      const w = (o.largura_m || (tipo === "porta" ? doorW : DEFAULT_WINDOW_W_M)) * 100;
      const h = (o.altura_m || (tipo === "porta" ? doorH : DEFAULT_WINDOW_H_M)) * 100;
      addBucket(tipo, w, h, 1);
    }

    const elements: RoomElementGroup[] = Array.from(bucketsMap.values())
      .sort((a, b) => b.largura_cm - a.largura_cm || b.altura_cm - a.altura_cm)
      .map((b) => ({
        ...b,
        label: `${b.tipo === "porta" ? "Porta" : "Janela"} ${b.largura_cm}×${b.altura_cm}`,
      }));

    const totalDoorWidthM = elements
      .filter((e) => e.tipo === "porta")
      .reduce((s, e) => s + (e.largura_cm / 100) * e.qtd, 0);

    const totalOpeningsAreaM2 = elements
      .reduce((s, e) => s + (e.largura_cm / 100) * (e.altura_cm / 100) * e.qtd, 0);

    // Mark soleira on edges with a door near midpoint
    if (totalDoorWidthM > 0 && coords.length > 1) {
      // Heuristic: any edge that contains a door-element placed point gets "Soleira"
      const doorEls = inside.filter(isDoorElement);
      for (const de of doorEls) {
        let bestIdx = 0; let bestD = Infinity;
        for (let i = 0; i < coords.length; i++) {
          const a = coords[i], b = coords[(i + 1) % coords.length];
          // distance from point to segment midpoint as cheap proxy
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          const d = Math.hypot(de.x - mx, de.y - my);
          if (d < bestD) { bestD = d; bestIdx = i; }
        }
        edges[bestIdx].tag = "Soleira";
      }
    }

    const baseboard_m = Math.max(perimeter_m - totalDoorWidthM, 0);
    const grossWalls = perimeter_m * ceiling;
    const walls_m2 = Math.max(grossWalls - totalOpeningsAreaM2, 0);

    const tipo = (r as any).tipo_compartimento ?? "habitacao";

    return {
      room_id: r.id,
      name: r.nome,
      color,
      area_m2: Number(r.area_m2.toFixed(2)),
      perimeter_m: Number(perimeter_m.toFixed(2)),
      baseboard_m: Number(baseboard_m.toFixed(2)),
      walls_m2: Number(walls_m2.toFixed(2)),
      is_exterior: tipo === "exterior",
      elements,
      edges,
      centroid: polygonCentroid(coords),
      ceiling_height_m: ceiling,
    };
  });

  // ── Aggregates ──

  const allDoorPts = new Map<string, { largura_cm: number; altura_cm: number; qtd: number; label: string }>();
  const allWindowPts = new Map<string, { largura_cm: number; altura_cm: number; qtd: number; label: string }>();

  for (const room of perRoom) {
    for (const el of room.elements) {
      const target = el.tipo === "porta" ? allDoorPts : allWindowPts;
      const key = `${el.largura_cm}x${el.altura_cm}`;
      const ex = target.get(key);
      if (ex) ex.qtd += el.qtd;
      else target.set(key, {
        largura_cm: el.largura_cm,
        altura_cm: el.altura_cm,
        qtd: el.qtd,
        label: `${el.tipo === "porta" ? "Porta" : "Janela"} ${el.largura_cm}×${el.altura_cm}`,
      });
    }
  }

  const doorsByDim = Array.from(allDoorPts.values()).sort((a, b) => b.largura_cm - a.largura_cm);
  const windowsByDim = Array.from(allWindowPts.values()).sort((a, b) => b.largura_cm - a.largura_cm);

  const baseboard_m_total = perRoom.reduce((s, r) => s + r.baseboard_m, 0);
  const interior_walls_m2_total = perRoom
    .filter((r) => !r.is_exterior)
    .reduce((s, r) => s + r.walls_m2, 0);

  // Exterior wall estimate via convex hull of all room boundary vertices
  const allPts: Array<{ x: number; y: number }> = [];
  for (const r of rooms) {
    for (const c of (r.boundary_coords ?? [])) allPts.push(c);
  }
  const extPerimPx = convexHullPerimeterPx(allPts);
  const exterior_perimeter_m = extPerimPx / ppm;
  // Exterior openings = sum of openings whose wall.tipo_funcional === 'exterior'
  let exteriorOpeningArea = 0;
  for (const o of openings) {
    const w = wallById.get(o.wall_id);
    if (w?.tipo_funcional === "exterior") {
      exteriorOpeningArea += (o.largura_m || doorW) * (o.altura_m || doorH);
    }
  }
  const exterior_walls_m2_estimate = Math.max(exterior_perimeter_m * ceiling - exteriorOpeningArea, 0);

  return {
    perRoom,
    totals: {
      doorsByDim,
      windowsByDim,
      baseboard_m_total: Number(baseboard_m_total.toFixed(2)),
      interior_walls_m2_total: Number(interior_walls_m2_total.toFixed(2)),
      exterior_walls_m2_estimate: Number(exterior_walls_m2_estimate.toFixed(2)),
      exterior_perimeter_m: Number(exterior_perimeter_m.toFixed(2)),
      floor_area_m2_total: Number(perRoom.reduce((s, r) => s + r.area_m2, 0).toFixed(2)),
      doors_qtd_total: doorsByDim.reduce((s, d) => s + d.qtd, 0),
      windows_qtd_total: windowsByDim.reduce((s, d) => s + d.qtd, 0),
      ceiling_height_m: ceiling,
    },
  };
}
