// Server-side line/total recalculation. Client-supplied totals are IGNORED.

export interface RawLine {
  source_line_id?: string | null;
  code?: string | null;
  description: string;
  unit?: string | null;
  quantity: number;
  unit_price: number;
  discount_pct?: number;
  tax_rate: number;
  tax_exemption_code?: string | null;
  retention_rate?: number;
}

export interface ComputedLine extends RawLine {
  line_order: number;
  discount_pct: number;
  retention_rate: number;
  net_amount: number;
  tax_amount: number;
  retention_amount: number;
  gross_amount: number;
}

export interface ComputedTotals {
  lines: ComputedLine[];
  subtotal_net: number;
  total_tax: number;
  total_retention: number;
  total_gross: number;
  total_payable: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function computeTotals(raw: RawLine[]): ComputedTotals {
  const lines: ComputedLine[] = raw.map((l, i) => {
    const qty = Number(l.quantity) || 0;
    const price = Number(l.unit_price) || 0;
    const disc = Number(l.discount_pct ?? 0) || 0;
    const taxR = Number(l.tax_rate) || 0;
    const retR = Number(l.retention_rate ?? 0) || 0;

    const gross = qty * price;
    const net = r2(gross * (1 - disc / 100));
    const tax = r2(net * (taxR / 100));
    const ret = r2(net * (retR / 100));
    const grossWithTax = r2(net + tax);

    return {
      ...l,
      line_order: i,
      discount_pct: disc,
      retention_rate: retR,
      net_amount: net,
      tax_amount: tax,
      retention_amount: ret,
      gross_amount: grossWithTax,
    };
  });

  const subtotal_net = r2(lines.reduce((s, l) => s + l.net_amount, 0));
  const total_tax = r2(lines.reduce((s, l) => s + l.tax_amount, 0));
  const total_retention = r2(lines.reduce((s, l) => s + l.retention_amount, 0));
  const total_gross = r2(subtotal_net + total_tax);
  const total_payable = r2(total_gross - total_retention);

  return { lines, subtotal_net, total_tax, total_retention, total_gross, total_payable };
}

export async function computeIdempotencyKey(input: {
  organization_id: string; source_type: string; source_id: string | null;
  document_type: string; revision: number;
}): Promise<string> {
  const enc = new TextEncoder().encode(
    [input.organization_id, input.source_type, input.source_id ?? "_", input.document_type, String(input.revision)].join("|")
  );
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
