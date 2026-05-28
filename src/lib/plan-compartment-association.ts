/**
 * Plan compartment ↔ measurement association.
 *
 * Resolves measurements to rooms (compartments) using a 4-step heuristic:
 *  1) explicit link in `roomMeasurements`
 *  2) room name appearing in the measurement label/etiqueta
 *  3) geometric containment (centroid of measurement inside room polygon)
 *  4) nearest-room by centroid distance (only when reasonably close)
 *
 * Also produces:
 *  - de-duplicated display names ("QUARTO 1", "QUARTO 2", ...)
 *  - derived quantitatives (floor / ceiling / baseboard / walls) when those
 *    measurements are missing for a room that has area + perimeter.
 *
 * Pure functions - no React, no Supabase. Safe to unit-test.
 */
import type { PlanMeasurement, PlanRoom } from "@/types/plan-measurements";

export interface RoomMeasurementLink {
  id: string;
  room_id: string;
  measurement_id: string;
}

export interface ResolvedRoom extends PlanRoom {
  display_name: string;
  normalized_name: string;
}

export interface DerivedQuantity {
  id: string; // synthetic id: `derived:<room_id>:<kind>`
  room_id: string;
  kind: "pavimento" | "teto" | "rodape" | "paredes";
  label: string;
  unit: "m²" | "ml";
  value: number;
  estimated: boolean;
  basis: string; // explanation
}

export interface AssociationOptions {
  /** Default ceiling height when not informed (meters). */
  defaultCeilingHeight?: number;
  /** Default door width subtracted from baseboard per door (meters). */
  defaultDoorWidth?: number;
  /** Max normalized distance (0-1, image space) for nearest-room fallback. */
  maxNearestDistance?: number;
}

const DEFAULTS: Required<AssociationOptions> = {
  defaultCeilingHeight: 2.6,
  defaultDoorWidth: 0.8,
  maxNearestDistance: 0.15,
};

/** Normalize a string: lowercase, no accents, collapse spaces. */
export function normalizeName(input: string | null | undefined): string {
  return (input ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Produce display names where duplicate normalized names get numeric suffixes,
 * e.g. three rooms called "Quarto" become "QUARTO 1", "QUARTO 2", "QUARTO 3".
 * Original `nome` is preserved on the row; `display_name` is added.
 */
export function dedupeRoomNames(rooms: PlanRoom[]): ResolvedRoom[] {
  const counts = new Map<string, number>();
  rooms.forEach((r) => {
    const k = normalizeName(r.nome);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  });

  const seen = new Map<string, number>();
  return rooms.map((r) => {
    const key = normalizeName(r.nome);
    const total = counts.get(key) ?? 1;
    let displayName = r.nome;
    if (total > 1) {
      const next = (seen.get(key) ?? 0) + 1;
      seen.set(key, next);
      displayName = `${r.nome.trim().toUpperCase()} ${next}`;
    } else {
      displayName = r.nome.trim().toUpperCase();
    }
    return {
      ...r,
      display_name: displayName,
      normalized_name: key,
    };
  });
}

// ───── geometry helpers ────────────────────────────────────────────────

function polygonCentroid(points: Array<{ x: number; y: number }>): { x: number; y: number } | null {
  if (!points || points.length === 0) return null;
  let sx = 0;
  let sy = 0;
  points.forEach((p) => {
    sx += p.x;
    sy += p.y;
  });
  return { x: sx / points.length, y: sy / points.length };
}

function pointInPolygon(p: { x: number; y: number }, poly: Array<{ x: number; y: number }>): boolean {
  if (!poly || poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ───── core association ───────────────────────────────────────────────

export interface AssociationResult {
  /** Map measurement.id → array of room ids it belongs to. */
  measurementToRooms: Map<string, string[]>;
  /** Rooms with display_name resolved. */
  resolvedRooms: ResolvedRoom[];
  /** Diagnostics for logging. */
  stats: {
    explicit: number;
    byName: number;
    byGeometry: number;
    byNearest: number;
    unassigned: number;
  };
}

export function associateMeasurementsToCompartments(
  measurements: PlanMeasurement[],
  rooms: PlanRoom[],
  roomMeasurements: RoomMeasurementLink[] = [],
  opts: AssociationOptions = {},
): AssociationResult {
  const _opts = { ...DEFAULTS, ...opts };
  const resolvedRooms = dedupeRoomNames(rooms);

  // Step 1: explicit links
  const map = new Map<string, string[]>();
  roomMeasurements.forEach((rm) => {
    const arr = map.get(rm.measurement_id) ?? [];
    if (!arr.includes(rm.room_id)) arr.push(rm.room_id);
    map.set(rm.measurement_id, arr);
  });

  const stats = { explicit: 0, byName: 0, byGeometry: 0, byNearest: 0, unassigned: 0 };
  measurements.forEach((m) => {
    if (map.has(m.id)) stats.explicit++;
  });

  // Precompute room metadata used by name/geometry steps.
  const roomInfo = resolvedRooms.map((r) => ({
    room: r,
    nameKey: r.normalized_name,
    nameTokens: r.normalized_name.split(" ").filter(Boolean),
    centroid: polygonCentroid(r.boundary_coords ?? []),
    polygon: r.boundary_coords ?? [],
  }));

  for (const m of measurements) {
    if (map.has(m.id)) continue;

    const labelNorm = normalizeName(`${m.etiqueta ?? ""} ${m.observacao ?? ""} ${m.camada ?? ""}`);

    // Step 2: room name token appears in the label.
    if (labelNorm) {
      const nameMatches = roomInfo.filter(
        (ri) =>
          ri.nameKey.length >= 3 &&
          (labelNorm.includes(` ${ri.nameKey} `) ||
            labelNorm.startsWith(`${ri.nameKey} `) ||
            labelNorm.endsWith(` ${ri.nameKey}`) ||
            labelNorm === ri.nameKey ||
            ri.nameTokens.every((t) => t.length >= 3 && labelNorm.includes(t))),
      );
      if (nameMatches.length > 0) {
        map.set(
          m.id,
          nameMatches.map((ri) => ri.room.id),
        );
        stats.byName++;
        continue;
      }
    }

    // Step 3: geometric containment using measurement centroid.
    const mCentroid = polygonCentroid(m.coordinates ?? []);
    if (mCentroid) {
      const containing = roomInfo.filter(
        (ri) => ri.polygon.length >= 3 && pointInPolygon(mCentroid, ri.polygon),
      );
      if (containing.length > 0) {
        map.set(
          m.id,
          containing.map((ri) => ri.room.id),
        );
        stats.byGeometry++;
        continue;
      }

      // Step 4: nearest room centroid (only if reasonably close).
      const ranked = roomInfo
        .filter((ri) => ri.centroid)
        .map((ri) => ({ ri, d: distance(mCentroid, ri.centroid!) }))
        .sort((a, b) => a.d - b.d);
      if (ranked.length > 0 && ranked[0].d <= _opts.maxNearestDistance) {
        map.set(m.id, [ranked[0].ri.room.id]);
        stats.byNearest++;
        continue;
      }
    }

    stats.unassigned++;
  }

  return { measurementToRooms: map, resolvedRooms, stats };
}

// ───── derived quantitatives ──────────────────────────────────────────

/**
 * For a given room, list the kinds of measurements already present so we
 * don't generate duplicates. Matching is based on the measurement `camada`
 * or label keywords.
 */
function kindsPresentForRoom(
  roomId: string,
  measurements: PlanMeasurement[],
  measurementToRooms: Map<string, string[]>,
): Set<DerivedQuantity["kind"]> {
  const kinds = new Set<DerivedQuantity["kind"]>();
  measurements.forEach((m) => {
    const rooms = measurementToRooms.get(m.id);
    if (!rooms?.includes(roomId)) return;
    const tag = normalizeName(`${m.camada ?? ""} ${m.etiqueta ?? ""}`);
    if (/\bpavimento|piso|chao\b/.test(tag)) kinds.add("pavimento");
    if (/\bteto|tecto\b/.test(tag)) kinds.add("teto");
    if (/\brodape|rodapes\b/.test(tag)) kinds.add("rodape");
    if (/\bparede|paredes\b/.test(tag)) kinds.add("paredes");
  });
  return kinds;
}

/**
 * Generate derived floor/ceiling/baseboard/walls for each room when no
 * matching measurement exists yet. Uses area + perimeter from the room
 * and configurable defaults for ceiling height and door width.
 */
export function buildDerivedQuantitiesForRoom(
  room: ResolvedRoom,
  presentKinds: Set<DerivedQuantity["kind"]>,
  opts: AssociationOptions = {},
): DerivedQuantity[] {
  const _opts = { ...DEFAULTS, ...opts };
  const area = Number(room.area_m2) || 0;
  const perimeter = Number(room.perimetro_m) || 0;
  const height = Number(room.pe_direito_m) || _opts.defaultCeilingHeight;
  const out: DerivedQuantity[] = [];

  if (area <= 0 && perimeter <= 0) return out;

  if (area > 0 && !presentKinds.has("pavimento")) {
    out.push({
      id: `derived:${room.id}:pavimento`,
      room_id: room.id,
      kind: "pavimento",
      label: `Pavimento - ${room.display_name}`,
      unit: "m²",
      value: round2(area),
      estimated: false,
      basis: "Área do compartimento",
    });
  }
  if (area > 0 && !presentKinds.has("teto")) {
    out.push({
      id: `derived:${room.id}:teto`,
      room_id: room.id,
      kind: "teto",
      label: `Teto - ${room.display_name}`,
      unit: "m²",
      value: round2(area),
      estimated: false,
      basis: "Área do compartimento",
    });
  }
  if (perimeter > 0 && !presentKinds.has("rodape")) {
    // Subtract one standard door width as a conservative estimate.
    const baseboard = Math.max(perimeter - _opts.defaultDoorWidth, 0);
    out.push({
      id: `derived:${room.id}:rodape`,
      room_id: room.id,
      kind: "rodape",
      label: `Rodapé - ${room.display_name}`,
      unit: "ml",
      value: round2(baseboard),
      estimated: true,
      basis: `Perímetro − ${_opts.defaultDoorWidth} m (porta padrão)`,
    });
  }
  if (perimeter > 0 && !presentKinds.has("paredes")) {
    const walls = perimeter * height;
    out.push({
      id: `derived:${room.id}:paredes`,
      room_id: room.id,
      kind: "paredes",
      label: `Paredes - ${room.display_name}`,
      unit: "m²",
      value: round2(walls),
      estimated: !room.pe_direito_m,
      basis: room.pe_direito_m
        ? `Perímetro × pé-direito ${height} m`
        : `Perímetro × pé-direito padrão ${_opts.defaultCeilingHeight} m`,
    });
  }

  return out;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
