/**
 * ICF Steel (Aço) Calculation Engine
 * Calculates reinforcement weight based on rebar diameter, spacing, and geometry.
 */

// Peso linear por diâmetro (kg/m) — norma EN 10080
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
export const REBAR_SPACINGS = [10, 15, 20, 25, 30] as const; // cm

export type RebarDiameter = typeof REBAR_DIAMETERS[number];
export type RebarSpacing = typeof REBAR_SPACINGS[number];

export interface FundacaoArmaduraParams {
  tipo: 'sapata_continua' | 'sapata_isolada';
  comprimento: number; // m
  largura: number;     // m
  altura: number;      // m
  quantidade: number;
  recobrimento_mm: number; // mm

  // Armadura longitudinal (inferior)
  diam_long: RebarDiameter;
  espac_long: RebarSpacing; // cm

  // Armadura transversal
  diam_trans: RebarDiameter;
  espac_trans: RebarSpacing; // cm

  // Fatores da configuração
  fator_perdas: number;      // ex: 0.05 = 5%
  fator_transpasse: number;  // ex: 0.10 = 10%
}

export interface SteelBreakdown {
  long_num_bars: number;
  long_bar_length: number; // m
  long_total_length: number; // m
  long_weight_kg: number;

  trans_num_bars: number;
  trans_bar_length: number; // m
  trans_total_length: number; // m
  trans_weight_kg: number;

  subtotal_kg: number;
  perdas_kg: number;
  transpasse_kg: number;
  total_kg: number;
  total_all_qty_kg: number;
  ratio_kg_m3: number;
}

export function calcFundacaoSteel(p: FundacaoArmaduraParams): SteelBreakdown {
  const rec = p.recobrimento_mm / 1000; // m
  const comp_util = p.comprimento - 2 * rec;
  const larg_util = p.largura - 2 * rec;

  // ── Armadura Longitudinal (ao longo do comprimento) ──
  // Barras paralelas ao comprimento, distribuídas na largura
  const espac_long_m = p.espac_long / 100;
  const long_num = Math.max(2, Math.floor(larg_util / espac_long_m) + 1);
  const long_bar_len = comp_util;
  const long_total = long_num * long_bar_len;
  const long_w = long_total * (REBAR_WEIGHT_PER_METER[p.diam_long] ?? 0);

  // ── Armadura Transversal (ao longo da largura) ──
  // Barras paralelas à largura, distribuídas no comprimento
  const espac_trans_m = p.espac_trans / 100;
  let trans_num: number;
  let trans_bar_len: number;

  if (p.tipo === 'sapata_continua') {
    // Sapata contínua: transversais distribuídas ao longo do comprimento
    trans_num = Math.max(2, Math.floor(comp_util / espac_trans_m) + 1);
    trans_bar_len = larg_util;
  } else {
    // Sapata isolada: armadura em ambas as direções (malha)
    trans_num = Math.max(2, Math.floor(comp_util / espac_trans_m) + 1);
    trans_bar_len = larg_util;
  }

  const trans_total = trans_num * trans_bar_len;
  const trans_w = trans_total * (REBAR_WEIGHT_PER_METER[p.diam_trans] ?? 0);

  const subtotal = long_w + trans_w;
  const perdas = subtotal * p.fator_perdas;
  const transpasse = subtotal * p.fator_transpasse;
  const total = subtotal + perdas + transpasse;
  const total_all = total * p.quantidade;

  const vol_unit = p.comprimento * p.largura * p.altura;
  const vol_total = vol_unit * p.quantidade;

  return {
    long_num_bars: long_num,
    long_bar_length: Math.round(long_bar_len * 1000) / 1000,
    long_total_length: Math.round(long_total * 100) / 100,
    long_weight_kg: Math.round(long_w * 10) / 10,

    trans_num_bars: trans_num,
    trans_bar_length: Math.round(trans_bar_len * 1000) / 1000,
    trans_total_length: Math.round(trans_total * 100) / 100,
    trans_weight_kg: Math.round(trans_w * 10) / 10,

    subtotal_kg: Math.round(subtotal * 10) / 10,
    perdas_kg: Math.round(perdas * 10) / 10,
    transpasse_kg: Math.round(transpasse * 10) / 10,
    total_kg: Math.round(total * 10) / 10,
    total_all_qty_kg: Math.round(total_all * 10) / 10,
    ratio_kg_m3: vol_total > 0 ? Math.round((total_all / vol_total) * 10) / 10 : 0,
  };
}
