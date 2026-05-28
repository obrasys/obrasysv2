// Shared column configuration for the advanced budget chapter tables
// Used by CapituloAccordion (UI), ArtigoRow (UI) and orcamento-pdf.ts (PDF export)

export type CapituloColumnKey =
  | 'item'
  | 'unidade'
  | 'qtd'
  | 'mo_un'
  | 'mat_un'
  | 'sub_un'
  | 'srv_un'
  | 'alu_un'
  | 'div_un'
  | 'tot_mo'
  | 'tot_mat'
  | 'tot_sub'
  | 'tot_srv'
  | 'tot_alu'
  | 'tot_div'
  | 'subtotal';

export interface CapituloColumnDef {
  key: CapituloColumnKey;
  label: string;
  group: 'id' | 'unit' | 'total' | 'final';
  /** Cannot be toggled off */
  required?: boolean;
  /** Visible by default */
  defaultVisible: boolean;
  /** Relative weight for column width computation */
  weight: number;
  /** Right-aligned numeric column */
  numeric: boolean;
}

export const CAPITULO_COLUMNS: CapituloColumnDef[] = [
  { key: 'item',     label: 'Item',         group: 'id',    required: true,  defaultVisible: true,  weight: 5, numeric: false },
  { key: 'unidade',  label: 'Unidade',      group: 'id',    defaultVisible: true,  weight: 1, numeric: false },
  { key: 'qtd',      label: 'Qtd',          group: 'id',    defaultVisible: true,  weight: 1, numeric: true  },

  { key: 'mo_un',    label: 'MO €/un',      group: 'unit',  defaultVisible: false, weight: 1.4, numeric: true },
  { key: 'mat_un',   label: 'MAT €/un',     group: 'unit',  defaultVisible: false, weight: 1.4, numeric: true },
  { key: 'sub_un',   label: 'SUB €/un',     group: 'unit',  defaultVisible: false, weight: 1.4, numeric: true },
  { key: 'srv_un',   label: 'SRV €/un',     group: 'unit',  defaultVisible: false, weight: 1.4, numeric: true },
  { key: 'alu_un',   label: 'ALU €/un',     group: 'unit',  defaultVisible: false, weight: 1.4, numeric: true },
  { key: 'div_un',   label: 'DIV €/un',     group: 'unit',  defaultVisible: false, weight: 1.4, numeric: true },

  { key: 'tot_mo',   label: 'Tot. MO',      group: 'total', defaultVisible: true,  weight: 1.4, numeric: true },
  { key: 'tot_mat',  label: 'Tot. MAT',     group: 'total', defaultVisible: true,  weight: 1.4, numeric: true },
  { key: 'tot_sub',  label: 'Tot. SUB',     group: 'total', defaultVisible: false, weight: 1.4, numeric: true },
  { key: 'tot_srv',  label: 'Tot. SRV',     group: 'total', defaultVisible: false, weight: 1.4, numeric: true },
  { key: 'tot_alu',  label: 'Tot. ALU',     group: 'total', defaultVisible: false, weight: 1.4, numeric: true },
  { key: 'tot_div',  label: 'Tot. DIV',     group: 'total', defaultVisible: false, weight: 1.4, numeric: true },

  { key: 'subtotal', label: 'Subtotal',     group: 'final', required: true, defaultVisible: true, weight: 1.6, numeric: true },
];

export const GROUP_LABELS: Record<CapituloColumnDef['group'], string> = {
  id: 'Identificação',
  unit: 'Preços unitários',
  total: 'Totais por categoria',
  final: 'Total',
};

export const STORAGE_KEY = 'avancado_capitulo_columns';

export const DEFAULT_VISIBLE_COLUMNS: CapituloColumnKey[] = CAPITULO_COLUMNS
  .filter((c) => c.defaultVisible)
  .map((c) => c.key);

export function loadVisibleColumns(): CapituloColumnKey[] {
  if (typeof window === 'undefined') return DEFAULT_VISIBLE_COLUMNS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VISIBLE_COLUMNS;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_VISIBLE_COLUMNS;
    const validKeys = new Set(CAPITULO_COLUMNS.map((c) => c.key));
    const cleaned = parsed.filter((k): k is CapituloColumnKey => typeof k === 'string' && validKeys.has(k as CapituloColumnKey));
    // Ensure required columns are always present
    CAPITULO_COLUMNS.filter((c) => c.required).forEach((c) => {
      if (!cleaned.includes(c.key)) cleaned.push(c.key);
    });
    return cleaned.length > 0 ? cleaned : DEFAULT_VISIBLE_COLUMNS;
  } catch {
    return DEFAULT_VISIBLE_COLUMNS;
  }
}

export function saveVisibleColumns(cols: CapituloColumnKey[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cols));
  } catch {
    // ignore
  }
}

export interface ArtigoLikeForCell {
  descricao: string;
  codigo?: string | null;
  unidade: string;
  quantidade: number;
  preco_unitario: number;
  valor_total: number;
  custo_mo?: number;
  custo_mat?: number;
  custo_sub?: number;
  custo_srv?: number;
  custo_alu?: number;
  custo_div?: number;
}

const fmtEur = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);
const fmtQty = (v: number) =>
  new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(v);

/** Format a cell value for a given column. Returns "-" for zero-value decomposition cells. */
export function getCellValue(
  artigo: ArtigoLikeForCell,
  key: CapituloColumnKey,
  opts: { marginMultiplier?: number } = {}
): string {
  const m = opts.marginMultiplier ?? 1;
  const q = artigo.quantidade || 0;
  const cMo  = artigo.custo_mo  ?? 0;
  const cMat = artigo.custo_mat ?? 0;
  const cSub = artigo.custo_sub ?? 0;
  const cSrv = artigo.custo_srv ?? 0;
  const cAlu = artigo.custo_alu ?? 0;
  const cDiv = artigo.custo_div ?? 0;
  const dash = '-';

  switch (key) {
    case 'item':     return artigo.descricao;
    case 'unidade':  return artigo.unidade;
    case 'qtd':      return fmtQty(q);
    case 'mo_un':    return cMo  > 0 ? fmtEur(cMo  * m) : dash;
    case 'mat_un':   return cMat > 0 ? fmtEur(cMat * m) : dash;
    case 'sub_un':   return cSub > 0 ? fmtEur(cSub * m) : dash;
    case 'srv_un':   return cSrv > 0 ? fmtEur(cSrv * m) : dash;
    case 'alu_un':   return cAlu > 0 ? fmtEur(cAlu * m) : dash;
    case 'div_un':   return cDiv > 0 ? fmtEur(cDiv * m) : dash;
    case 'tot_mo':   return cMo  > 0 ? fmtEur(q * cMo  * m) : dash;
    case 'tot_mat':  return cMat > 0 ? fmtEur(q * cMat * m) : dash;
    case 'tot_sub':  return cSub > 0 ? fmtEur(q * cSub * m) : dash;
    case 'tot_srv':  return cSrv > 0 ? fmtEur(q * cSrv * m) : dash;
    case 'tot_alu':  return cAlu > 0 ? fmtEur(q * cAlu * m) : dash;
    case 'tot_div':  return cDiv > 0 ? fmtEur(q * cDiv * m) : dash;
    case 'subtotal': {
      const raw = artigo.valor_total ?? (q * artigo.preco_unitario);
      return fmtEur(raw * m);
    }
  }
}
