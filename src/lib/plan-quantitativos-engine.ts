/**
 * Plan Quantitativos Engine
 * --------------------------
 * Pega no JSON estruturado da Axia (axia-plan-vision) e devolve linhas
 * prontas a injetar na Tabela Unificada / Orçamento, com quantidades
 * calculadas:
 *   - Vãos agrupados por dimensão (Porta interior 80×210 = 6 un)
 *   - Rodapé por compartimento (perímetro − Σ larguras de portas que abrem)
 *   - Paredes em m² (perímetro × pé direito − Σ vãos)
 *   - Pavimento e teto em m² (já vinha do compartimento)
 *
 * Funções puras, sem dependências de Supabase. Testável.
 */

const DEFAULT_CEILING_HEIGHT_M = 2.7;

const DEFAULT_DOOR_WIDTH_CM_BY_TYPE: Record<string, number> = {
  porta: 80,
  porta_interior: 80,
  porta_exterior: 90,
  porta_correr: 120,
  portao_garagem: 240,
  portao_lote: 300,
  vao_indefinido: 80,
};

const DEFAULT_DOOR_HEIGHT_CM = 210;
const DEFAULT_WINDOW_WIDTH_CM = 120;
const DEFAULT_WINDOW_HEIGHT_CM = 120;

export interface AxiaRoomLike {
  name: string;
  tipo_normalizado?: string;
  estimated_area?: number;
  perimetro_estimado_m?: number;
  area_legivel?: boolean;
  bbox?: { x_min: number; y_min: number; x_max: number; y_max: number };
  center_x?: number;
  center_y?: number;
  vaos_porta_associados?: string[];
  confidence?: number;
  review_required?: boolean;
}

export interface AxiaElementLike {
  type: string;
  label: string;
  count?: number;
  largura_cm?: number;
  altura_cm?: number;
  dimensao_legivel?: boolean;
  parede_associada?: string;
  compartimentos_conectados?: string[];
  position_x?: number;
  position_y?: number;
  confidence_score?: number;
  review_required?: boolean;
}

export interface BudgetableQuantities {
  rooms: Array<{
    name: string;
    tipo_normalizado?: string;
    area_m2: number;
    perimetro_m: number;
    pe_direito_m: number;
    confidence?: number;
    review_required?: boolean;
    source: AxiaRoomLike;
  }>;
  baseboards: Array<{
    room_name: string;
    valor: number; // metros lineares
    raw_perimeter: number;
    discounted_openings_m: number;
  }>;
  wallSurfaces: Array<{
    room_name: string;
    valor: number; // m² líquidos para revestir/pintar/barrar
    raw_area: number;
    openings_area_m2: number;
  }>;
  openingsByDim: Array<{
    type: string;
    largura_cm: number;
    altura_cm: number;
    qtd: number;
    label: string; // "Porta interior 80×210"
    review_required: boolean;
    elements: AxiaElementLike[];
  }>;
}

const DOOR_TYPES = new Set([
  "porta",
  "porta_interior",
  "porta_exterior",
  "porta_correr",
  "portao_garagem",
  "portao_lote",
  "vao_indefinido",
]);

const WINDOW_TYPES = new Set(["janela"]);

function inferDoorWidthCm(type: string): number {
  return DEFAULT_DOOR_WIDTH_CM_BY_TYPE[type] ?? 80;
}

function isDoor(type: string): boolean {
  return DOOR_TYPES.has(type);
}

function isWindow(type: string): boolean {
  return WINDOW_TYPES.has(type);
}

function defaultsForElement(el: AxiaElementLike): { largura_cm: number; altura_cm: number; inferred: boolean } {
  if (el.largura_cm && el.altura_cm) {
    return { largura_cm: el.largura_cm, altura_cm: el.altura_cm, inferred: false };
  }
  if (isDoor(el.type)) {
    return {
      largura_cm: el.largura_cm ?? inferDoorWidthCm(el.type),
      altura_cm: el.altura_cm ?? DEFAULT_DOOR_HEIGHT_CM,
      inferred: !el.largura_cm || !el.altura_cm,
    };
  }
  if (isWindow(el.type)) {
    return {
      largura_cm: el.largura_cm ?? DEFAULT_WINDOW_WIDTH_CM,
      altura_cm: el.altura_cm ?? DEFAULT_WINDOW_HEIGHT_CM,
      inferred: !el.largura_cm || !el.altura_cm,
    };
  }
  return { largura_cm: el.largura_cm ?? 0, altura_cm: el.altura_cm ?? 0, inferred: true };
}

/**
 * Estima perímetro do compartimento.
 * Prioridade: perimetro_estimado_m da Axia → perímetro do bbox em m
 *   (assumindo bbox normalizado com proporção m≈1m: aproximação grosseira) →
 *   4·√área (último recurso).
 */
function estimateRoomPerimeter(room: AxiaRoomLike, sheetWidthM = 20): number {
  if (room.perimetro_estimado_m && room.perimetro_estimado_m > 0) {
    return Number(room.perimetro_estimado_m);
  }
  const area = Number(room.estimated_area) || 0;
  if (room.bbox) {
    // Quando temos área legível mas não perímetro, usamos a proporção do bbox
    // para aproximar dimensões reais via shape ratio × √área.
    const bboxW = room.bbox.x_max - room.bbox.x_min;
    const bboxH = room.bbox.y_max - room.bbox.y_min;
    if (bboxW > 0 && bboxH > 0 && area > 0) {
      const ratio = bboxW / bboxH;
      // Resolve w*h = area, w/h = ratio  → h = √(area/ratio), w = ratio·h
      const h = Math.sqrt(area / ratio);
      const w = ratio * h;
      return Number((2 * (w + h)).toFixed(2));
    }
  }
  if (area > 0) return Number((4 * Math.sqrt(area)).toFixed(2));
  return 0;
}

/**
 * Para cada compartimento, calcula soma das larguras (m) das portas que
 * abrem para ele. Procura em `compartimentos_conectados` o nome do
 * compartimento (case-insensitive, trim).
 */
function sumDoorOpeningsForRoom(roomName: string, elements: AxiaElementLike[]): number {
  const target = (roomName || "").toLowerCase().trim();
  if (!target) return 0;
  let total = 0;
  for (const el of elements) {
    if (!isDoor(el.type)) continue;
    const conn = (el.compartimentos_conectados ?? []).map((c) => (c || "").toLowerCase().trim());
    if (!conn.includes(target)) continue;
    const { largura_cm } = defaultsForElement(el);
    total += (largura_cm / 100) * (Number(el.count) || 1);
  }
  return Number(total.toFixed(2));
}

/**
 * Soma área de TODOS os vãos (portas + janelas) que pertencem ao
 * compartimento (m²) — para descontar das paredes.
 */
function sumOpeningsAreaForRoom(roomName: string, elements: AxiaElementLike[]): number {
  const target = (roomName || "").toLowerCase().trim();
  if (!target) return 0;
  let total = 0;
  for (const el of elements) {
    if (!isDoor(el.type) && !isWindow(el.type)) continue;
    const conn = (el.compartimentos_conectados ?? []).map((c) => (c || "").toLowerCase().trim());
    if (!conn.includes(target)) continue;
    const { largura_cm, altura_cm } = defaultsForElement(el);
    const areaPorVao = (largura_cm / 100) * (altura_cm / 100);
    total += areaPorVao * (Number(el.count) || 1);
  }
  return Number(total.toFixed(2));
}

export interface BuildOptions {
  ceilingHeightM?: number;
  /** Permite saltar o agrupamento de vãos (mantém output 1‑a‑1). */
  groupOpeningsByDim?: boolean;
}

export function buildBudgetableQuantities(
  analysis: { rooms?: AxiaRoomLike[]; elements?: AxiaElementLike[] } | null | undefined,
  opts: BuildOptions = {},
): BudgetableQuantities {
  const ceiling = opts.ceilingHeightM ?? DEFAULT_CEILING_HEIGHT_M;
  const groupDims = opts.groupOpeningsByDim ?? true;

  const rooms = (analysis?.rooms ?? []).filter(Boolean);
  const elements = (analysis?.elements ?? []).filter(Boolean);

  const out: BudgetableQuantities = {
    rooms: [],
    baseboards: [],
    wallSurfaces: [],
    openingsByDim: [],
  };

  // 1. Rooms (pavimento/teto) com perímetro já calculado
  for (const r of rooms) {
    const area = Number(r.estimated_area) || 0;
    const perimetro = estimateRoomPerimeter(r);
    out.rooms.push({
      name: r.name || "Compartimento",
      tipo_normalizado: r.tipo_normalizado,
      area_m2: Number(area.toFixed(2)),
      perimetro_m: perimetro,
      pe_direito_m: ceiling,
      confidence: r.confidence,
      review_required: r.review_required,
      source: r,
    });

    // 2. Rodapé = perímetro − Σ larguras das portas que abrem para o compartimento
    const desconto = sumDoorOpeningsForRoom(r.name, elements);
    const rodape = Math.max(perimetro - desconto, 0);
    out.baseboards.push({
      room_name: r.name || "Compartimento",
      valor: Number(rodape.toFixed(2)),
      raw_perimeter: perimetro,
      discounted_openings_m: Number(desconto.toFixed(2)),
    });

    // 3. Paredes m² = perímetro × pé direito − área de vãos
    const grossWall = perimetro * ceiling;
    const vaosArea = sumOpeningsAreaForRoom(r.name, elements);
    const liquido = Math.max(grossWall - vaosArea, 0);
    out.wallSurfaces.push({
      room_name: r.name || "Compartimento",
      valor: Number(liquido.toFixed(2)),
      raw_area: Number(grossWall.toFixed(2)),
      openings_area_m2: Number(vaosArea.toFixed(2)),
    });
  }

  // 4. Vãos agrupados por (tipo, largura, altura)
  if (groupDims) {
    const buckets = new Map<string, BudgetableQuantities["openingsByDim"][number]>();
    for (const el of elements) {
      if (!isDoor(el.type) && !isWindow(el.type)) continue;
      const { largura_cm, altura_cm } = defaultsForElement(el);
      const key = `${el.type}|${largura_cm}x${altura_cm}`;
      const niceType = el.type.replace(/_/g, " ");
      const niceLabel =
        niceType.charAt(0).toUpperCase() + niceType.slice(1) + ` ${largura_cm}×${altura_cm}`;
      const existing = buckets.get(key);
      const qty = Number(el.count) || 1;
      if (existing) {
        existing.qtd += qty;
        existing.elements.push(el);
        if (el.review_required) existing.review_required = true;
      } else {
        buckets.set(key, {
          type: el.type,
          largura_cm,
          altura_cm,
          qtd: qty,
          label: niceLabel,
          review_required: !!el.review_required,
          elements: [el],
        });
      }
    }
    out.openingsByDim = Array.from(buckets.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }

  return out;
}
