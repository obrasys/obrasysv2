// Fase 6: deteção de compartimentos (polilinhas fechadas) e associação aos textos.

import type { DxfText, TextClassification } from "./dxf-text.ts";
import { classifyText } from "./dxf-text.ts";

export interface Room {
  id: string;
  vertices: Array<{ x: number; y: number }>;
  centroid: { x: number; y: number };
  area_calc_m2: number;
  layer: string;
}

export interface RoomWithTexts {
  id: string;
  nome: string | null;
  area_declarada_m2: number | null;
  area_calculada_m2: number;
  centroide: { x: number; y: number };
  layer: string;
  textos_associados: Array<{
    text: string;
    kind: TextClassification["kind"];
    x: number;
    y: number;
    confidence: number;
  }>;
}

export interface AssociationResult {
  compartimentos: RoomWithTexts[];
  textos_nao_associados: Array<{
    text: string;
    kind: TextClassification["kind"];
    x: number;
    y: number;
    layer: string;
    entity_type: string;
    needs_review: boolean;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Deteção de salas: polilinhas FECHADAS a partir das entities.
// ─────────────────────────────────────────────────────────────────────────────
export function detectRooms(entities: any[], toMeters: (n: number) => number): Room[] {
  const rooms: Room[] = [];
  let i = 0;
  for (const e of entities ?? []) {
    const type = String(e.type || "").toUpperCase();
    if (!["LWPOLYLINE", "POLYLINE"].includes(type)) continue;
    if (!Array.isArray(e.vertices) || e.vertices.length < 3) continue;
    if (!e.shape && !isImplicitlyClosed(e.vertices)) continue;

    const verts = e.vertices.map((v: any) => ({ x: v.x, y: v.y }));
    const area = Math.abs(shoelaceArea(verts));
    const areaM2 = toMeters(toMeters(area)); // duas vezes por ser m²

    // Filtra polígonos absurdos
    if (areaM2 < 0.5 || areaM2 > 5000) continue;

    rooms.push({
      id: `room-${++i}`,
      vertices: verts,
      centroid: centroid(verts),
      area_calc_m2: Number(areaM2.toFixed(2)),
      layer: e.layer || "0",
    });
  }
  return rooms;
}

function isImplicitlyClosed(v: any[]): boolean {
  if (v.length < 3) return false;
  const a = v[0];
  const b = v[v.length - 1];
  return Math.hypot(a.x - b.x, a.y - b.y) < 1e-6;
}

function shoelaceArea(v: Array<{ x: number; y: number }>): number {
  let s = 0;
  for (let i = 0; i < v.length; i++) {
    const j = (i + 1) % v.length;
    s += v[i].x * v[j].y - v[j].x * v[i].y;
  }
  return s / 2;
}

function centroid(v: Array<{ x: number; y: number }>): { x: number; y: number } {
  let cx = 0;
  let cy = 0;
  for (const p of v) {
    cx += p.x;
    cy += p.y;
  }
  return { x: cx / v.length, y: cy / v.length };
}

function pointInPolygon(p: { x: number; y: number }, poly: Array<{ x: number; y: number }>): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect =
      ((yi > p.y) !== (yj > p.y)) &&
      p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// ─────────────────────────────────────────────────────────────────────────────
// Associação texto → compartimento
// ─────────────────────────────────────────────────────────────────────────────
export function associateTexts(
  rooms: Room[],
  texts: DxfText[],
  toMeters: (n: number) => number,
  maxDistRawForNearest: number,
): AssociationResult {
  const bucket: Map<string, RoomWithTexts> = new Map();
  for (const r of rooms) {
    bucket.set(r.id, {
      id: r.id,
      nome: null,
      area_declarada_m2: null,
      area_calculada_m2: r.area_calc_m2,
      centroide: { x: toMeters(r.centroid.x), y: toMeters(r.centroid.y) },
      layer: r.layer,
      textos_associados: [],
    });
  }

  const unassigned: AssociationResult["textos_nao_associados"] = [];

  for (const t of texts) {
    const cls = classifyText(t.normalized);
    if (cls.kind === "unknown" && t.normalized.length < 2) continue;

    // 1) ponto dentro de polígono
    let targetId: string | null = null;
    for (const r of rooms) {
      if (pointInPolygon({ x: t.x, y: t.y }, r.vertices)) {
        targetId = r.id;
        break;
      }
    }

    // 2) compartimento mais próximo (centroide) dentro do limite
    if (!targetId && rooms.length > 0) {
      let bestDist = Infinity;
      let best: Room | null = null;
      for (const r of rooms) {
        const d = Math.hypot(t.x - r.centroid.x, t.y - r.centroid.y);
        if (d < bestDist) {
          bestDist = d;
          best = r;
        }
      }
      if (best && bestDist <= maxDistRawForNearest) {
        targetId = best.id;
      }
    }

    if (targetId) {
      const room = bucket.get(targetId)!;
      room.textos_associados.push({
        text: t.normalized,
        kind: cls.kind,
        x: toMeters(t.x),
        y: toMeters(t.y),
        confidence: t.confidence,
      });
      if (cls.kind === "room_label" && !room.nome) {
        room.nome = cls.room_name ?? t.normalized;
      }
      if (cls.kind === "area" && cls.area_m2 != null && room.area_declarada_m2 == null) {
        room.area_declarada_m2 = cls.area_m2;
      }
    } else {
      unassigned.push({
        text: t.normalized,
        kind: cls.kind,
        x: toMeters(t.x),
        y: toMeters(t.y),
        layer: t.layer,
        entity_type: t.entity_type,
        needs_review: true,
      });
    }
  }

  // Nomes default
  let idx = 0;
  for (const room of bucket.values()) {
    idx++;
    if (!room.nome) room.nome = `Compartimento ${idx}`;
  }

  return {
    compartimentos: [...bucket.values()],
    textos_nao_associados: unassigned,
  };
}
