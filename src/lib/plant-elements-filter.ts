import type { PlantElement } from "@/types/planta-leitura";

export const VALID_BUDGET_UNITS = ["un", "m", "m2", "m3", "ml"] as const;
export const BUDGETABLE_STATUSES = [
  "ok",
  "review",
  "proposed",
  "approved",
  "edited",
] as const;

/**
 * Returns only elements that may be sent to a budget.
 * Excludes `ignored` (those originated from `ignored_regions` of the Axia output).
 */
export function getBudgetableElements(elements: PlantElement[]): PlantElement[] {
  return elements.filter(
    (el) =>
      !!el &&
      el.status !== "ignored" &&
      el.status !== "error" &&
      Number(el.quantity ?? 0) > 0 &&
      !!el.unit &&
      (VALID_BUDGET_UNITS as readonly string[]).includes(el.unit) &&
      (BUDGETABLE_STATUSES as readonly string[]).includes(el.status),
  );
}

export function getIgnoredElements(elements: PlantElement[]): PlantElement[] {
  return elements.filter((el) => el?.status === "ignored");
}
