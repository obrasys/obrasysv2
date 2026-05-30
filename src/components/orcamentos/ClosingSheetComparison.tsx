import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, ArrowUpRight, GitCompare, Minus } from "lucide-react";
import type { ClosingSheet } from "@/hooks/useClosingSheets";
import { computeClosingTotals, mergeDetails } from "@/types/closing-sheet";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v ?? 0);
const pct = (v: number) => `${((v ?? 0) * 100).toFixed(2).replace(".", ",")}%`;

interface Row {
  label: string;
  initial: number;
  final: number;
  type?: "currency" | "percent";
  inverse?: boolean; // when true, increase is bad (e.g. costs)
}

function DeltaCell({ row }: { row: Row }) {
  const delta = row.final - row.initial;
  const deltaPct = row.initial !== 0 ? delta / Math.abs(row.initial) : 0;
  const isZero = Math.abs(delta) < 0.005;
  const inverse = row.inverse ?? true; // cost rows by default
  const isBad = inverse ? delta > 0 : delta < 0;
  const color = isZero
    ? "text-muted-foreground"
    : isBad
      ? "text-rose-600"
      : "text-emerald-600";
  const Icon = isZero ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const format = row.type === "percent" ? pct : fmt;
  return (
    <div className={`flex items-center justify-end gap-1 font-semibold tabular-nums ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>
        {delta >= 0 ? "+" : ""}
        {format(delta)}
      </span>
      {row.type !== "percent" && row.initial !== 0 && (
        <span className="text-[10px] opacity-70">({deltaPct >= 0 ? "+" : ""}{(deltaPct * 100).toFixed(1)}%)</span>
      )}
    </div>
  );
}

export function ClosingSheetComparison({
  initial,
  final,
}: {
  initial: ClosingSheet;
  final: ClosingSheet;
}) {
  const ti = computeClosingTotals(mergeDetails(initial.details));
  const tf = computeClosingTotals(mergeDetails(final.details));

  const rows: Row[] = [
    { label: "Custos Diretos", initial: ti.total_directos, final: tf.total_directos },
    { label: "Estaleiro", initial: ti.total_estaleiro, final: tf.total_estaleiro },
    { label: "Custo Industrial", initial: ti.custo_industrial, final: tf.custo_industrial },
    { label: "Terreno", initial: ti.total_terreno, final: tf.total_terreno },
    { label: "Indirectos", initial: ti.total_indirectos, final: tf.total_indirectos },
    { label: "Outros", initial: ti.total_outros, final: tf.total_outros },
    { label: "Administrativos", initial: ti.total_admin, final: tf.total_admin },
    { label: "IVA", initial: ti.total_iva, final: tf.total_iva },
    { label: "CUSTO TOTAL", initial: ti.custo_total, final: tf.custo_total },
    { label: "Valor de Vendas", initial: ti.valor_vendas, final: tf.valor_vendas, inverse: false },
    { label: "RAI €", initial: ti.rai_eur, final: tf.rai_eur, inverse: false },
    { label: "RAI %", initial: ti.rai_pct, final: tf.rai_pct, type: "percent", inverse: false },
  ];

  const desvioTotal = tf.custo_total - ti.custo_total;
  const desvioRai = tf.rai_eur - ti.rai_eur;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitCompare className="h-5 w-5 text-primary" />
          Comparativo - Inicial vs Final
          <Badge variant="outline" className="ml-auto">
            Desvio Custo: {desvioTotal >= 0 ? "+" : ""}
            {fmt(desvioTotal)}
          </Badge>
          <Badge
            variant="outline"
            className={
              desvioRai >= 0
                ? "border-emerald-300 text-emerald-700"
                : "border-rose-300 text-rose-700"
            }
          >
            Desvio RAI: {desvioRai >= 0 ? "+" : ""}
            {fmt(desvioRai)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[11px] uppercase text-muted-foreground border-b">
                <th className="text-left py-2 font-medium">Rubrica</th>
                <th className="text-right py-2 font-medium">Inicial</th>
                <th className="text-right py-2 font-medium">Final</th>
                <th className="text-right py-2 font-medium">Desvio</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isTotal = r.label === "CUSTO TOTAL";
                const format = r.type === "percent" ? pct : fmt;
                return (
                  <tr
                    key={r.label}
                    className={`border-b last:border-0 ${isTotal ? "bg-primary/5 font-bold" : ""}`}
                  >
                    <td className="py-2">{r.label}</td>
                    <td className="text-right tabular-nums py-2">{format(r.initial)}</td>
                    <td className="text-right tabular-nums py-2">{format(r.final)}</td>
                    <td className="py-2">
                      <DeltaCell row={r} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
