import type { PlanMeasurement, AxiaNote, AxiaStatus } from "@/types/plan-measurements";

export interface AxiaAnalysisResult {
  status: AxiaStatus;
  notes: AxiaNote[];
}

/**
 * Rule-based Axia analysis for a single plan_measurement.
 * Pure function - no IO, no IA call. Safe to run on every save.
 */
export function analyzePlanMeasurement(m: PlanMeasurement): AxiaAnalysisResult {
  const notes: AxiaNote[] = [];

  const isSegment = m.tipo === "linha" && !!m.action_type;
  const isPolygon = m.tipo === "area" && !m.action_type;

  // Segment-specific checks
  if (isSegment) {
    if (!m.ceiling_height || m.ceiling_height <= 0) {
      notes.push({
        severity: "error",
        type: "missing_ceiling_height",
        message: "Falta altura do pé direito.",
        explanation: "Sem o pé direito não consigo calcular a área da parede.",
        suggested_action: "Edite o segmento e indique o pé direito.",
        related_field: "ceiling_height",
      });
    }

    if (m.action_type === "demolir") {
      if (!m.wall_thickness_cm || m.wall_thickness_cm <= 0) {
        notes.push({
          severity: "error",
          type: "missing_wall_thickness",
          message: "Demolição sem espessura definida.",
          explanation: "Para calcular o volume de demolição preciso de comprimento, altura e espessura da parede.",
          suggested_action: "Adicione a espessura da parede.",
          related_field: "wall_thickness_cm",
        });
      }
    }

    if (m.action_type === "construir") {
      if (!m.material_id && !m.material_label) {
        notes.push({
          severity: "warning",
          type: "missing_material",
          message: "Construção sem material definido.",
          explanation: "Sem material não consigo sugerir o artigo de orçamento mais adequado.",
          suggested_action: "Escolha o material da parede (tijolo, bloco, pladur, madeira…).",
          related_field: "material_id",
        });
      }
    }

    // Suspiciously large area for a single isolated wall
    if (
      m.wall_area &&
      m.wall_area > 100 &&
      ["pintar", "barrar", "revestir"].includes(m.action_type)
    ) {
      notes.push({
        severity: "warning",
        type: "area_high",
        message: "Área da parede parece elevada.",
        explanation: `Calculei ${m.wall_area.toFixed(2)} m² para uma parede isolada - confirme a escala da planta.`,
        suggested_action: "Verifique a calibração ou divida em vários segmentos.",
        related_field: "wall_area",
      });
    }
  }

  // Polygon-specific checks
  if (isPolygon) {
    if (!m.baseboard_length || m.baseboard_length <= 0) {
      notes.push({
        severity: "info",
        type: "missing_baseboard",
        message: "Polígono sem rodapé calculado.",
        explanation: "Reabra a medição para recalcular o rodapé (perímetro).",
        related_field: "baseboard_length",
      });
    }
  }

  // Budget link reminder (only when measurement is otherwise valid)
  if (
    notes.every((n) => n.severity !== "error") &&
    m.action_type &&
    (m.budget_link_status ?? "not_linked") === "not_linked"
  ) {
    notes.push({
      severity: "info",
      type: "unlinked_to_budget",
      message: "Esta medição ainda não está num orçamento.",
      explanation: "Pode gerar um item de orçamento a partir desta parede.",
      suggested_action: "Use o painel de Orçamento para criar ou associar.",
    });
  }

  // Compute aggregate status
  const hasError = notes.some((n) => n.severity === "error");
  const hasWarning = notes.some((n) => n.severity === "warning");
  const status: AxiaStatus = hasError ? "error" : hasWarning ? "warning" : "valid";

  // If everything is perfect and there are no notes at all, add a positive confirmation
  if (notes.length === 0) {
    notes.push({
      severity: "info",
      type: "complete",
      message: "Medição completa e pronta para orçamento.",
    });
  }

  return { status, notes };
}
