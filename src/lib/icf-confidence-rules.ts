/**
 * Fase 9 — Regras de confiança consolidadas (PDF + DXF).
 *
 * Política global única usada em todo o módulo Planta/ICF:
 *   ≥ 0.85   → confiável, pronto para orçamento
 *   0.60–0.85 → revisão obrigatória antes de avançar
 *   < 0.60   → bloqueado para uso automático (apenas pode avançar
 *              depois de revisão humana explícita)
 *
 * Adicionalmente, qualquer um destes casos força revisão obrigatória,
 * independentemente da confiança numérica:
 *   - escala/unidade DXF assumida sem confirmação
 *   - parede sem cota (`metodo_medicao === 'estimativa_visual'`)
 *   - parede sem altura útil legível
 */

import type { IcfPlantAnalysisResult } from "@/hooks/useIcfPlantAnalysis";
import type { IcfUnifiedQuantities } from "@/lib/icf-unified-quantities";

export const CONFIDENCE_THRESHOLDS = {
  TRUSTED: 0.85,
  REVIEW: 0.6,
} as const;

export type ConfidenceLevel = "trusted" | "review" | "blocked";

export function classifyConfidence(value: number | null | undefined): ConfidenceLevel {
  if (value === null || value === undefined) return "review";
  if (value >= CONFIDENCE_THRESHOLDS.TRUSTED) return "trusted";
  if (value >= CONFIDENCE_THRESHOLDS.REVIEW) return "review";
  return "blocked";
}

export interface ConfidenceGate {
  /** Pode ser carregado para orçamento sem nova revisão? */
  canSendToBudget: boolean;
  /** Está bloqueado por confiança crítica (<0.60) ou regra dura? */
  isBlocked: boolean;
  /** Razões legíveis (para UI). */
  reasons: string[];
  /** Razões críticas que bloqueiam mesmo após revisão visual (precisam edição). */
  blockingReasons: string[];
  /** Nível global recomendado. */
  level: ConfidenceLevel;
  /** Confiança média efetiva (0–1). */
  avgConfidence: number | null;
}

/**
 * Avalia a "porta de saída" para orçamento combinando resultado bruto +
 * quantitativos unificados. Determinístico — não chama BD.
 */
export function evaluateConfidenceGate(
  result: IcfPlantAnalysisResult | null,
  quants: IcfUnifiedQuantities | null,
): ConfidenceGate {
  const reasons: string[] = [];
  const blockingReasons: string[] = [];

  if (!result || !quants) {
    return {
      canSendToBudget: false,
      isBlocked: true,
      reasons: ["Sem análise consolidada."],
      blockingReasons: ["Sem análise consolidada."],
      level: "blocked",
      avgConfidence: null,
    };
  }

  const avg = quants.totais.confianca_media;
  const level = classifyConfidence(avg);

  // Regras duras (bloqueio)
  if (result.__requires_unit_confirmation) {
    blockingReasons.push("Escala/unidade DXF por confirmar.");
  }
  const semCota = result.paredes.filter(
    (p) => p.metodo_medicao === "estimativa_visual",
  ).length;
  if (semCota > 0) {
    blockingReasons.push(`${semCota} parede(s) sem cota fiável (estimativa visual).`);
  }
  const semAltura = result.paredes.filter(
    (p) => !p.altura_util || p.altura_util < 1.5,
  ).length;
  if (semAltura > 0) {
    blockingReasons.push(`${semAltura} parede(s) sem altura útil legível.`);
  }
  const baixaConf = result.paredes.filter(
    (p) => typeof p.confianca === "number" && p.confianca < CONFIDENCE_THRESHOLDS.REVIEW,
  ).length;
  if (baixaConf > 0) {
    blockingReasons.push(
      `${baixaConf} parede(s) com confiança < ${Math.round(CONFIDENCE_THRESHOLDS.REVIEW * 100)}%.`,
    );
  }

  // Regras de aviso (revisão obrigatória mas não bloqueio total)
  if (quants.totais.paredes_revisao > 0) {
    reasons.push(
      `${quants.totais.paredes_revisao} de ${quants.totais.paredes_total} parede(s) marcadas para revisão.`,
    );
  }
  if (level === "review") {
    reasons.push(
      `Confiança média ${avg === null ? "—" : Math.round(avg * 100) + "%"} — abaixo do mínimo recomendado (${Math.round(
        CONFIDENCE_THRESHOLDS.TRUSTED * 100,
      )}%).`,
    );
  }

  const isBlocked = blockingReasons.length > 0;
  const canSendToBudget = !isBlocked && quants.totais.paredes_revisao === 0;

  return {
    canSendToBudget,
    isBlocked,
    reasons: [...blockingReasons, ...reasons],
    blockingReasons,
    level: isBlocked ? "blocked" : level,
    avgConfidence: avg,
  };
}

export function confidenceBadgeProps(level: ConfidenceLevel): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  switch (level) {
    case "trusted":
      return { label: "Confiável", variant: "secondary" };
    case "review":
      return { label: "Revisão obrigatória", variant: "outline" };
    case "blocked":
    default:
      return { label: "Bloqueado", variant: "destructive" };
  }
}
