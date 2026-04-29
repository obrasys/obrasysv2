import type { SegmentActionType, PlanMeasurement } from "@/types/plan-measurements";

export interface BudgetMappingRule {
  capitulo: string;
  unit: string;
  /** Which field of the measurement provides the quantity */
  source: "demolition_volume" | "wall_area" | "valor_bruto";
  description: string;
}

export const PLAN_BUDGET_MAP: Record<SegmentActionType, BudgetMappingRule> = {
  demolir: {
    capitulo: "Demolições",
    unit: "m³",
    source: "demolition_volume",
    description: "Demolição de parede",
  },
  construir: {
    capitulo: "Alvenarias",
    unit: "m²",
    source: "wall_area",
    description: "Construção de parede",
  },
  barrar: {
    capitulo: "Preparação de superfícies",
    unit: "m²",
    source: "wall_area",
    description: "Barramento de parede",
  },
  pintar: {
    capitulo: "Pinturas",
    unit: "m²",
    source: "wall_area",
    description: "Pintura de parede",
  },
  revestir: {
    capitulo: "Revestimentos",
    unit: "m²",
    source: "wall_area",
    description: "Revestimento de parede",
  },
};

export interface BudgetSuggestion {
  capitulo: string;
  unit: string;
  description: string;
  quantity: number;
}

/** Build a budget item suggestion for a measurement that has an action_type. Returns null if not applicable. */
export function suggestBudgetItem(m: PlanMeasurement): BudgetSuggestion | null {
  if (!m.action_type) return null;
  const rule = PLAN_BUDGET_MAP[m.action_type];
  if (!rule) return null;

  let quantity = 0;
  if (rule.source === "demolition_volume") quantity = m.demolition_volume ?? 0;
  else if (rule.source === "wall_area") quantity = m.wall_area ?? 0;
  else quantity = m.valor_bruto ?? 0;

  if (quantity <= 0) return null;

  // Tailor description if material is known
  let description = rule.description;
  if (m.action_type === "construir" && m.material_label) {
    description = `Construção de parede em ${m.material_label}`;
  }

  return {
    capitulo: rule.capitulo,
    unit: rule.unit,
    description,
    quantity: parseFloat(quantity.toFixed(4)),
  };
}
