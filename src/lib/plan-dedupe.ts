/**
 * Utilitário de deduplicação para envios Planta → Orçamento.
 *
 * Gera uma chave determinística e estável a partir das características técnicas
 * do quantitativo (planta, página, pavimento, compartimento, ação, unidade,
 * dimensão e origem). Usada como `dedupe_key` em `plan_budget_links` com
 * unique index parcial `(orcamento_id, dedupe_key) WHERE dedupe_key IS NOT NULL`.
 */

/** Normalização de nomes de compartimentos / etiquetas:
 *  - lowercase
 *  - trim
 *  - remoção de acentos
 *  - colapso de espaços múltiplos
 *  - remoção de pontuação irrelevante
 */
export function normalizeName(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type DedupeSourceType =
  | "manual_measurement"
  | "structured_wall"
  | "structured_opening"
  | "axia_room"
  | "axia_baseboard"
  | "axia_wall_surface"
  | "axia_opening"
  | "compartimento"
  | "installation"
  | "other";

export interface BuildDedupeKeyInput {
  planImportId: string;
  pageId?: string | null;
  floorId?: string | null;
  /** Nome do compartimento ou room_id (preferir room_id quando exista). */
  roomId?: string | null;
  roomName?: string | null;
  actionType?: string | null;
  unidade?: string | null;
  /** Dimensão principal (m, m², m³ ou nº un). Arredondada a 3 casas. */
  primaryDimension?: number | null;
  sourceType: DedupeSourceType;
  /** Identificador técnico da origem (measurement_id, wall_id, etc.). Opcional. */
  sourceId?: string | null;
  /** Artigo de orçamento de destino (quando vinculado a artigo específico). */
  artigoOrcamentoId?: string | null;
}

export function buildDedupeKey(input: BuildDedupeKeyInput): string {
  const dim =
    typeof input.primaryDimension === "number" && Number.isFinite(input.primaryDimension)
      ? Math.round(input.primaryDimension * 1000) / 1000
      : "";
  const room = input.roomId ?? normalizeName(input.roomName) ?? "";
  const parts = [
    "p",
    input.planImportId,
    input.pageId ?? "_",
    input.floorId ?? "_",
    room || "_",
    normalizeName(input.actionType) || "_",
    normalizeName(input.unidade) || "_",
    String(dim),
    input.sourceType,
    input.artigoOrcamentoId ?? "_",
  ];
  return parts.join("|");
}

/** Metadados sugeridos para insert em plan_budget_links. */
export interface DedupePayload {
  dedupe_key: string;
  source_type: DedupeSourceType;
  source_id: string | null;
  quantity_origin: string | null;
  validation_status: string | null;
}

export function buildDedupePayload(
  input: BuildDedupeKeyInput,
  opts?: { quantityOrigin?: string | null; validationStatus?: string | null },
): DedupePayload {
  return {
    dedupe_key: buildDedupeKey(input),
    source_type: input.sourceType,
    source_id: input.sourceId ?? null,
    quantity_origin: opts?.quantityOrigin ?? null,
    validation_status: opts?.validationStatus ?? null,
  };
}
