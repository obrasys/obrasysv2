// Axia ModelRouter — selects the AI model for each task type.
// Defaults are conservative; can be overridden via env vars:
//   AXIA_MODEL_<TASK_TYPE>_PRIMARY
//   AXIA_MODEL_<TASK_TYPE>_VALIDATOR
//   AXIA_MODEL_<TASK_TYPE>_FALLBACK
// (TASK_TYPE in UPPER_SNAKE_CASE)

export type AxiaTaskType =
  | "critical_vision_analysis"
  | "plan_measurements"
  | "budget_import"
  | "budget_validation"
  | "close_sheet_analysis"
  | "icf_analysis"
  | "specialties_analysis"
  | "simple_chat"
  | "classification"
  | "summary"
  | "suggestions"
  | "rephrase"
  | "fallback";

export type AxiaRole = "primary" | "validator" | "fallback";

interface RouteEntry {
  primary: string;
  validator?: string;
  fallback: string;
}

// NOTE: Lovable AI Gateway model identifiers. Keep in sync with platform catalog.
const DEFAULTS: Record<AxiaTaskType, RouteEntry> = {
  critical_vision_analysis: {
    primary: "openai/gpt-5.5",
    validator: "openai/gpt-5.5",
    fallback: "google/gemini-2.5-pro",
  },
  plan_measurements: {
    primary: "openai/gpt-5.5",
    validator: "openai/gpt-5.5",
    fallback: "google/gemini-2.5-pro",
  },
  budget_import: {
    primary: "openai/gpt-5.5",
    fallback: "google/gemini-2.5-flash",
  },
  budget_validation: {
    primary: "openai/gpt-5.5",
    validator: "openai/gpt-5.5",
    fallback: "google/gemini-2.5-pro",
  },
  close_sheet_analysis: {
    primary: "openai/gpt-5.5",
    fallback: "google/gemini-2.5-pro",
  },
  icf_analysis: {
    primary: "openai/gpt-5.5",
    validator: "openai/gpt-5.5",
    fallback: "google/gemini-2.5-pro",
  },
  specialties_analysis: {
    primary: "openai/gpt-5.5",
    fallback: "google/gemini-2.5-pro",
  },
  simple_chat: {
    primary: "openai/gpt-5.4-mini",
    fallback: "google/gemini-2.5-flash",
  },
  classification: {
    primary: "openai/gpt-5-nano",
    fallback: "google/gemini-2.5-flash-lite",
  },
  summary: {
    primary: "openai/gpt-5.4-mini",
    fallback: "google/gemini-2.5-flash",
  },
  suggestions: {
    primary: "openai/gpt-5.4-mini",
    fallback: "google/gemini-2.5-flash",
  },
  rephrase: {
    primary: "openai/gpt-5-nano",
    fallback: "google/gemini-2.5-flash-lite",
  },
  fallback: {
    primary: "google/gemini-2.5-flash",
    fallback: "google/gemini-2.5-flash-lite",
  },
};

function envOverride(taskType: AxiaTaskType, role: AxiaRole): string | undefined {
  const key = `AXIA_MODEL_${taskType.toUpperCase()}_${role.toUpperCase()}`;
  const v = (globalThis as any).Deno?.env?.get?.(key);
  return v && v.length > 0 ? v : undefined;
}

export function resolveModel(taskType: AxiaTaskType, role: AxiaRole = "primary"): string {
  const entry = DEFAULTS[taskType] ?? DEFAULTS.fallback;
  return envOverride(taskType, role) ?? entry[role] ?? entry.primary;
}

export function resolveChain(taskType: AxiaTaskType): { primary: string; validator?: string; fallback: string } {
  return {
    primary: resolveModel(taskType, "primary"),
    validator: DEFAULTS[taskType]?.validator ? resolveModel(taskType, "validator") : undefined,
    fallback: resolveModel(taskType, "fallback"),
  };
}

export const CONFIDENCE = {
  reviewThreshold: Number(
    (globalThis as any).Deno?.env?.get?.("AXIA_CONFIDENCE_REVIEW_THRESHOLD") ?? 0.75,
  ),
  blockThreshold: Number(
    (globalThis as any).Deno?.env?.get?.("AXIA_CONFIDENCE_BLOCK_THRESHOLD") ?? 0.55,
  ),
};
