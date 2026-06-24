// IVA regimes per região fiscal portuguesa
// Continente, Madeira (RAM) e Açores (RAA) têm taxas distintas.

export type RegiaoFiscal = 'continente' | 'madeira' | 'acores';

export interface IvaRegimeOption {
  value: number;
  label: string;
  description: string;
}

export const REGIAO_FISCAL_CONFIG: Record<RegiaoFiscal, { label: string; description: string }> = {
  continente: { label: 'Continente', description: 'Portugal Continental' },
  madeira: { label: 'Madeira', description: 'Região Autónoma da Madeira' },
  acores: { label: 'Açores', description: 'Região Autónoma dos Açores' },
};

// Taxas por região (Normal, Intermédio, Reduzido) + Autoliquidação (0%) comum
const REGIMES_POR_REGIAO: Record<RegiaoFiscal, IvaRegimeOption[]> = {
  continente: [
    { value: 23, label: 'IVA Normal', description: '23% - Regime geral' },
    { value: 13, label: 'IVA Intermédio', description: '13% - Taxa intermédia' },
    { value: 6, label: 'IVA Reduzido', description: '6% - Reabilitação/habitação' },
    { value: 0, label: 'Autoliquidação', description: '0% - Subempreitada (art. 2º)' },
  ],
  madeira: [
    { value: 22, label: 'IVA Normal', description: '22% - Regime geral (RAM)' },
    { value: 12, label: 'IVA Intermédio', description: '12% - Taxa intermédia (RAM)' },
    { value: 4, label: 'IVA Reduzido', description: '4% - Reabilitação/habitação (RAM)' },
    { value: 0, label: 'Autoliquidação', description: '0% - Subempreitada (art. 2º)' },
  ],
  acores: [
    { value: 16, label: 'IVA Normal', description: '16% - Regime geral (RAA)' },
    { value: 9, label: 'IVA Intermédio', description: '9% - Taxa intermédia (RAA)' },
    { value: 4, label: 'IVA Reduzido', description: '4% - Reabilitação/habitação (RAA)' },
    { value: 0, label: 'Autoliquidação', description: '0% - Subempreitada (art. 2º)' },
  ],
};

export function getIvaRegimesByRegion(regiao: RegiaoFiscal): IvaRegimeOption[] {
  return REGIMES_POR_REGIAO[regiao] ?? REGIMES_POR_REGIAO.continente;
}

export function getNormalRate(regiao: RegiaoFiscal): number {
  return getIvaRegimesByRegion(regiao)[0].value;
}

// Tenta inferir a região a partir de uma taxa existente (para retro-compatibilidade).
export function inferRegionFromRate(rate: number): RegiaoFiscal {
  if ([22, 12, 4].includes(rate)) return 'madeira';
  if ([16, 9].includes(rate)) return 'acores';
  return 'continente';
}
