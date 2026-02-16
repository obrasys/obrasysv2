import {
  type Specialty,
  type Profile,
  type Complexity,
  type PackageFormData,
  type EstimationResult,
  type GeneratedItem,
  type InstallationCatalogItem,
  PROFILE_MULTIPLIERS,
  COMPLEXITY_MULTIPLIERS,
  DEFAULT_COEFFICIENTS,
} from '@/types/instalacoes';

type CoeffMap = Record<string, number>;

function getCoeff(coeffs: CoeffMap, key: string, specialty: Specialty): number {
  if (coeffs[key] !== undefined) return coeffs[key];
  const def = DEFAULT_COEFFICIENTS[specialty].find(c => c.key === key);
  return def?.value ?? 0;
}

export function calculateElectricalPoints(data: PackageFormData, coeffs: CoeffMap): { points: number; linearM: number } {
  const s: Specialty = 'electrical';
  const socketPoints = Math.round(data.area_m2 * getCoeff(coeffs, 'socket_factor', s));
  const lightingPoints = Math.round(data.area_m2 * getCoeff(coeffs, 'lighting_factor', s));

  const kitchenExtra = data.kitchen_count * (getCoeff(coeffs, 'kitchen_extra_sockets', s) + getCoeff(coeffs, 'kitchen_extra_points', s));
  const wcExtra = data.bathrooms * (getCoeff(coeffs, 'wc_sockets', s) + getCoeff(coeffs, 'wc_lights', s));
  const bedroomExtra = data.bedrooms * (getCoeff(coeffs, 'bedroom_sockets', s) + getCoeff(coeffs, 'bedroom_lights', s));

  const basePoints = socketPoints + lightingPoints + Math.round(kitchenExtra) + Math.round(wcExtra) + Math.round(bedroomExtra);
  const mult = PROFILE_MULTIPLIERS[data.profile] * COMPLEXITY_MULTIPLIERS[data.complexity];
  const points = Math.round(basePoints * mult);
  const linearM = Math.round(data.area_m2 * getCoeff(coeffs, 'linear_m_factor', s) * mult);

  return { points, linearM };
}

export function calculatePlumbingPoints(data: PackageFormData, coeffs: CoeffMap): { points: number; linearM: number } {
  const s: Specialty = 'plumbing';
  const waterPoints = data.bathrooms * getCoeff(coeffs, 'wc_water_points', s)
    + data.kitchen_count * getCoeff(coeffs, 'kitchen_water_points', s)
    + (data.has_laundry ? getCoeff(coeffs, 'laundry_water_points', s) : 0);

  const drainPoints = data.bathrooms * getCoeff(coeffs, 'wc_drain_points', s)
    + data.kitchen_count * getCoeff(coeffs, 'kitchen_drain_points', s);

  const basePoints = Math.round(waterPoints + drainPoints);
  const mult = PROFILE_MULTIPLIERS[data.profile] * COMPLEXITY_MULTIPLIERS[data.complexity];
  const points = Math.round(basePoints * mult);

  const waterLinear = data.area_m2 * getCoeff(coeffs, 'water_linear_factor', s);
  const drainLinear = data.area_m2 * getCoeff(coeffs, 'drain_linear_factor', s);
  const linearM = Math.round((waterLinear + drainLinear) * mult);

  return { points, linearM };
}

export function calculateTelecomPoints(data: PackageFormData, coeffs: CoeffMap): { points: number; linearM: number } {
  const s: Specialty = 'telecom';
  const rj45 = getCoeff(coeffs, 'living_room_rj45', s)
    + data.bedrooms * getCoeff(coeffs, 'bedroom_rj45', s)
    + (data.extra_rooms > 0 ? getCoeff(coeffs, 'office_rj45', s) : 0);

  const coax = getCoeff(coeffs, 'living_room_coax', s)
    + data.bedrooms * getCoeff(coeffs, 'bedroom_coax', s);

  const basePoints = Math.round(rj45 + coax);
  const mult = PROFILE_MULTIPLIERS[data.profile] * COMPLEXITY_MULTIPLIERS[data.complexity];
  const points = Math.round(basePoints * mult);
  const linearM = Math.round(data.area_m2 * getCoeff(coeffs, 'linear_m_factor', s) * mult);

  return { points, linearM };
}

export function calculateEstimation(
  data: PackageFormData,
  coeffs: CoeffMap,
  catalogItems: InstallationCatalogItem[]
): EstimationResult {
  let calc: { points: number; linearM: number };

  switch (data.specialty) {
    case 'electrical':
      calc = calculateElectricalPoints(data, coeffs);
      break;
    case 'plumbing':
      calc = calculatePlumbingPoints(data, coeffs);
      break;
    case 'telecom':
      calc = calculateTelecomPoints(data, coeffs);
      break;
  }

  const relevantItems = catalogItems.filter(
    i => i.specialty === data.specialty && i.profile === data.profile && i.is_active
  );

  const items: GeneratedItem[] = relevantItems.map(ci => {
    let qty = 0;
    if (ci.base_qty_type === 'points') qty = calc.points;
    else if (ci.base_qty_type === 'linear') qty = calc.linearM;
    else qty = 1; // fixed

    const unitTotal = ci.cost_material + ci.cost_labor;
    const totalCost = Math.round(qty * unitTotal * (1 + ci.margin_percent / 100) * 100) / 100;

    return {
      catalogItemId: ci.id,
      name: ci.name,
      unit: ci.unit,
      qty,
      unitCostMaterial: ci.cost_material,
      unitCostLabor: ci.cost_labor,
      marginPercent: ci.margin_percent,
      totalCost,
    };
  });

  const totalCost = Math.round(items.reduce((sum, i) => sum + i.totalCost, 0) * 100) / 100;

  return {
    points: calc.points,
    linearMeters: calc.linearM,
    items,
    totalCost,
  };
}
