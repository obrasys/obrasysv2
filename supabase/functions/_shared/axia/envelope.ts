// Axia technical envelope schema + lightweight validator (no external deps).
// Used by edge functions that want a uniform contract for AI outputs.

import { CONFIDENCE } from "./model-router.ts";

export interface AxiaSourceReference {
  page?: number | string;
  zone?: string;
  room?: string;
  sheet?: string;
}

export interface AxiaEnvelope<TItem = unknown> {
  confidence_score: number;
  review_required: boolean;
  assumptions: string[];
  missing_data: string[];
  warnings: string[];
  calculation_basis: string[];
  extracted_items: TItem[];
  source_reference: AxiaSourceReference[];
  // Added by validator (server-side):
  block_auto_submit?: boolean;
  model_used?: string;
  validation_notes?: string[];
}

function asArray(v: unknown): any[] {
  return Array.isArray(v) ? v : [];
}
function asStringArray(v: unknown): string[] {
  return asArray(v).map((x) => String(x ?? "")).filter(Boolean);
}

export function normalizeEnvelope<T = unknown>(raw: any, modelUsed?: string): AxiaEnvelope<T> {
  const env: AxiaEnvelope<T> = {
    confidence_score: clamp01(Number(raw?.confidence_score)),
    review_required: Boolean(raw?.review_required),
    assumptions: asStringArray(raw?.assumptions),
    missing_data: asStringArray(raw?.missing_data),
    warnings: asStringArray(raw?.warnings),
    calculation_basis: asStringArray(raw?.calculation_basis),
    extracted_items: asArray(raw?.extracted_items) as T[],
    source_reference: asArray(raw?.source_reference) as AxiaSourceReference[],
    model_used: modelUsed,
    validation_notes: [],
  };

  // Apply confidence-based flags
  if (env.confidence_score < CONFIDENCE.reviewThreshold) {
    env.review_required = true;
    env.validation_notes!.push(
      `confidence_score ${env.confidence_score} < ${CONFIDENCE.reviewThreshold} → review_required`,
    );
  }
  if (env.confidence_score < CONFIDENCE.blockThreshold) {
    env.block_auto_submit = true;
    env.validation_notes!.push(
      `confidence_score ${env.confidence_score} < ${CONFIDENCE.blockThreshold} → block_auto_submit`,
    );
  }
  if (env.missing_data.length > 0 && env.review_required === false) {
    env.review_required = true;
    env.validation_notes!.push("missing_data presente → review_required");
  }
  return env;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
