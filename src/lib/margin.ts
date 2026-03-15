/**
 * Margin calculation utilities.
 *
 * IMPORTANT: "Margem" in Obra Sys means **real margin on the sale price**,
 * NOT markup on cost.
 *
 * Formula:  preço_venda = custo / (1 - margem%)
 * Example:  custo 100 €, margem 30% → preço_venda = 100 / 0.70 = 142.86 €
 */

/**
 * Calculate sale price from cost and margin %.
 * @param custo      Base cost (≥ 0)
 * @param margemPct  Margin percentage (0 ≤ m < 100)
 * @returns Sale price rounded to 2 decimals
 */
export function calcPrecoVenda(custo: number, margemPct: number): number {
  if (margemPct < 0) throw new Error('Margem não pode ser negativa');
  if (margemPct >= 100) throw new Error('Margem deve ser inferior a 100%');
  if (margemPct === 0) return Math.round(custo * 100) / 100;
  return Math.round((custo / (1 - margemPct / 100)) * 100) / 100;
}

/**
 * Calculate profit (lucro) from cost and margin %.
 */
export function calcLucro(custo: number, margemPct: number): number {
  return Math.round((calcPrecoVenda(custo, margemPct) - custo) * 100) / 100;
}

/**
 * Calculate real margin % given cost and sale price.
 */
export function calcMargemReal(custo: number, precoVenda: number): number {
  if (precoVenda === 0) return 0;
  return Math.round(((precoVenda - custo) / precoVenda) * 10000) / 100;
}

/**
 * Apply margin to a value (typically a subtotal).
 * Equivalent to: valor / (1 - margem/100)
 */
export function aplicarMargem(valor: number, margemPct: number): number {
  return calcPrecoVenda(valor, margemPct);
}

/**
 * Margin tooltip text for UX.
 */
export const MARGEM_TOOLTIP =
  'Margem é calculada sobre o preço de venda final. Ex: 30% de margem sobre custo de 100 € = preço de venda de 142,86 €. Não confundir com markup sobre o custo.';
