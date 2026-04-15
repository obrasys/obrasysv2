/**
 * ICF Steel (Aço) Calculation Engine
 * Calculates reinforcement weight based on rebar diameter, spacing, and geometry.
 * Supports inferior/superior longitudinal & transversal + lateral (estribos + barras verticais).
 */

export const REBAR_WEIGHT_PER_METER: Record<number, number> = {
  6: 0.222,
  8: 0.395,
  10: 0.617,
  12: 0.888,
  16: 1.578,
  20: 2.466,
  25: 3.854,
};

export const REBAR_DIAMETERS = [6, 8, 10, 12, 16, 20, 25] as const;
export const REBAR_SPACINGS = [10, 15, 20, 25, 30] as const;

export type RebarDiameter = typeof REBAR_DIAMETERS[number];
export type RebarSpacing = typeof REBAR_SPACINGS[number];

export interface FundacaoArmaduraParams {
  tipo: 'sapata_continua' | 'sapata_isolada';
  comprimento: number;
  largura: number;
  altura: number;
  quantidade: number;
  recobrimento_mm: number;

  // Armadura longitudinal inferior
  diam_long_inf: RebarDiameter;
  espac_long_inf: RebarSpacing;

  // Armadura longitudinal superior
  usar_arm_sup: boolean;
  diam_long_sup: RebarDiameter;
  espac_long_sup: RebarSpacing;

  // Armadura transversal inferior
  diam_trans_inf: RebarDiameter;
  espac_trans_inf: RebarSpacing;

  // Armadura transversal superior
  usar_trans_sup: boolean;
  diam_trans_sup: RebarDiameter;
  espac_trans_sup: RebarSpacing;

  // Estribos (cintas)
  usar_estribos: boolean;
  diam_estribo: RebarDiameter;
  espac_estribo: RebarSpacing;

  // Barras verticais laterais
  usar_barras_laterais: boolean;
  diam_lateral: RebarDiameter;
  espac_lateral: RebarSpacing;

  fator_perdas: number;
  fator_transpasse: number;
}

export interface LayerBreakdown {
  num_bars: number;
  bar_length: number;
  total_length: number;
  weight_kg: number;
  diameter: number;
  spacing: number;
}

export interface SteelBreakdown {
  long_inf: LayerBreakdown;
  trans_inf: LayerBreakdown;
  long_sup: LayerBreakdown;
  trans_sup: LayerBreakdown;
  estribos: LayerBreakdown;
  barras_laterais: LayerBreakdown;

  // Legacy compat
  long_num_bars: number;
  long_bar_length: number;
  long_total_length: number;
  long_weight_kg: number;
  trans_num_bars: number;
  trans_bar_length: number;
  trans_total_length: number;
  trans_weight_kg: number;

  subtotal_kg: number;
  perdas_kg: number;
  transpasse_kg: number;
  total_kg: number;
  total_all_qty_kg: number;
  ratio_kg_m3: number;
}

function calcLayer(
  diam: RebarDiameter,
  espac_cm: RebarSpacing,
  distribuicao_m: number,
  comprimento_barra_m: number,
): LayerBreakdown {
  const espac_m = espac_cm / 100;
  const num = Math.max(2, Math.floor(distribuicao_m / espac_m) + 1);
  const total = num * comprimento_barra_m;
  const w = total * (REBAR_WEIGHT_PER_METER[diam] ?? 0);
  return {
    num_bars: num,
    bar_length: Math.round(comprimento_barra_m * 1000) / 1000,
    total_length: Math.round(total * 100) / 100,
    weight_kg: Math.round(w * 10) / 10,
    diameter: diam,
    spacing: espac_cm,
  };
}

const EMPTY_LAYER: LayerBreakdown = { num_bars: 0, bar_length: 0, total_length: 0, weight_kg: 0, diameter: 0, spacing: 0 };

export function calcFundacaoSteel(p: FundacaoArmaduraParams): SteelBreakdown {
  const rec = p.recobrimento_mm / 1000;
  const comp_util = p.comprimento - 2 * rec;
  const larg_util = p.largura - 2 * rec;
  const alt_util = p.altura - 2 * rec;

  // ── Armadura Inferior ──
  const long_inf = calcLayer(p.diam_long_inf, p.espac_long_inf, larg_util, comp_util);
  const trans_inf = calcLayer(p.diam_trans_inf, p.espac_trans_inf, comp_util, larg_util);

  // ── Armadura Superior ──
  const long_sup = p.usar_arm_sup
    ? calcLayer(p.diam_long_sup, p.espac_long_sup, larg_util, comp_util)
    : { ...EMPTY_LAYER };
  const trans_sup = p.usar_trans_sup
    ? calcLayer(p.diam_trans_sup, p.espac_trans_sup, comp_util, larg_util)
    : { ...EMPTY_LAYER };

  // ── Estribos (cintas) ──
  // Perímetro: 2×(largura_util + altura_util) + ganchos (~0.10m)
  let estribos: LayerBreakdown = { ...EMPTY_LAYER };
  if (p.usar_estribos) {
    const perimetro_estribo = 2 * (larg_util + alt_util) + 0.10;
    estribos = calcLayer(p.diam_estribo, p.espac_estribo, comp_util, perimetro_estribo);
  }

  // ── Barras Laterais (horizontais nas faces laterais) ──
  // Distribuídas ao longo da altura, correm ao longo do comprimento.
  // Desconta 4 cantos (2 por face) já contabilizados nas camadas inf/sup.
  // Ex: h=0.50, esp=0.10 → 50/10=5 por face × 2 = 10 − 4 = 6 barras
  let barras_laterais: LayerBreakdown = { ...EMPTY_LAYER };
  if (p.usar_barras_laterais) {
    const espac_m = p.espac_lateral / 100;
    const num_por_face = Math.floor(p.altura / espac_m); // posições excluindo a base (0)
    const num_total = Math.max(0, num_por_face * 2 - 4); // 2 faces, menos 4 cantos
    const bar_len = comp_util; // barras correm ao longo do comprimento
    const total_len = num_total * bar_len;
    const w = total_len * (REBAR_WEIGHT_PER_METER[p.diam_lateral] ?? 0);
    barras_laterais = {
      num_bars: num_total,
      bar_length: Math.round(bar_len * 1000) / 1000,
      total_length: Math.round(total_len * 100) / 100,
      weight_kg: Math.round(w * 10) / 10,
      diameter: p.diam_lateral,
      spacing: p.espac_lateral,
    };
  }

  const subtotal = long_inf.weight_kg + trans_inf.weight_kg
    + long_sup.weight_kg + trans_sup.weight_kg
    + estribos.weight_kg + barras_laterais.weight_kg;
  const perdas = subtotal * p.fator_perdas;
  const transpasse = subtotal * p.fator_transpasse;
  const total = subtotal + perdas + transpasse;
  const total_all = total * p.quantidade;

  const vol_unit = p.comprimento * p.largura * p.altura;
  const vol_total = vol_unit * p.quantidade;

  return {
    long_inf,
    trans_inf,
    long_sup,
    trans_sup,
    estribos,
    barras_laterais,

    long_num_bars: long_inf.num_bars + long_sup.num_bars,
    long_bar_length: long_inf.bar_length,
    long_total_length: long_inf.total_length + long_sup.total_length,
    long_weight_kg: Math.round((long_inf.weight_kg + long_sup.weight_kg) * 10) / 10,
    trans_num_bars: trans_inf.num_bars + trans_sup.num_bars,
    trans_bar_length: trans_inf.bar_length,
    trans_total_length: trans_inf.total_length + trans_sup.total_length,
    trans_weight_kg: Math.round((trans_inf.weight_kg + trans_sup.weight_kg) * 10) / 10,

    subtotal_kg: Math.round(subtotal * 10) / 10,
    perdas_kg: Math.round(perdas * 10) / 10,
    transpasse_kg: Math.round(transpasse * 10) / 10,
    total_kg: Math.round(total * 10) / 10,
    total_all_qty_kg: Math.round(total_all * 10) / 10,
    ratio_kg_m3: vol_total > 0 ? Math.round((total_all / vol_total) * 10) / 10 : 0,
  };
}
