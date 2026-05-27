/**
 * Helpers financeiros transversais — Margem Bruta vs RAI.
 *
 * Glossário (Obra Sys):
 * - **Margem Bruta da Obra (MB)**: Receitas da obra − Custos da obra.
 * - **RAI da Empresa**: Σ(MB de todas as obras) − Custos de Estrutura (CE).
 *
 * Modos de margem ao precificar:
 * - **Markup sobre custo**: PV = Custo × (1 + margem)
 *     (margem expressa em fração do custo, ex.: 0,30 → +30% do custo)
 * - **Margem sobre venda (real)**: PV = Custo / (1 − margem)
 *     (margem expressa em fração do PV, ex.: 0,30 → 30% do PV é lucro)
 *
 * Regra do projeto: quando o utilizador diz "quero 30% de margem", ele
 * normalmente quer **margem sobre venda**. Usar sempre `priceFromMargin`.
 */

export type MarginMode = 'sale' | 'markup';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Calcula o preço de venda a partir do custo e percentagem de margem.
 *
 * @param cost custo unitário ou total
 * @param marginPercent percentagem (ex.: 30 para 30%)
 * @param mode 'sale' (padrão) = margem sobre venda · 'markup' = markup sobre custo
 */
export function priceFromMargin(cost: number, marginPercent: number, mode: MarginMode = 'sale'): number {
  if (!Number.isFinite(cost) || cost < 0) return 0;
  const m = (marginPercent ?? 0) / 100;
  if (mode === 'markup') return round2(cost * (1 + m));
  // sale: PV = Custo / (1 - m); guard m>=1 para evitar divisão por zero ou negativo
  if (m >= 1) return 0;
  return round2(cost / (1 - m));
}

/** Margem efetiva sobre a venda a partir de custo e PV. */
export function actualMarginOnSale(cost: number, salePrice: number): number {
  if (!Number.isFinite(salePrice) || salePrice <= 0) return 0;
  return round2(((salePrice - cost) / salePrice) * 100);
}

/** Margem Bruta = Receitas − Custos. */
export function calcMB(receitas: number, custos: number): { mb: number; mbPct: number } {
  const mb = round2((receitas ?? 0) - (custos ?? 0));
  const mbPct = receitas > 0 ? round2((mb / receitas) * 100) : 0;
  return { mb, mbPct };
}

/** RAI = Σ(MB das obras) − Custos de Estrutura. */
export function calcRAI(somaMBObras: number, custosEstrutura: number): number {
  return round2((somaMBObras ?? 0) - (custosEstrutura ?? 0));
}

export const fmtEUR = (n: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n ?? 0);
