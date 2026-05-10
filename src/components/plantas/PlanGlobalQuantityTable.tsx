import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DoorOpen, AppWindow, Ruler, Square, SquareDashed, Sigma, LayoutGrid, Hash } from "lucide-react";
import type { GlobalTotals } from "@/lib/plan-room-analysis";

interface Props {
  totals: GlobalTotals;
}

function KpiBlock({
  icon: Icon,
  label,
  value,
  unit,
  hint,
  tone = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  tone?: "primary" | "emerald" | "amber" | "indigo" | "rose" | "sky" | "violet";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
    indigo: "bg-indigo-500/10 text-indigo-600",
    rose: "bg-rose-500/10 text-rose-600",
    sky: "bg-sky-500/10 text-sky-600",
    violet: "bg-violet-500/10 text-violet-600",
  };
  return (
    <div className="rounded-xl border bg-card p-3 flex items-start gap-3">
      <div className={`rounded-lg p-2 ${tones[tone]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">{label}</div>
        <div className="text-xl font-bold tabular-nums leading-tight">
          {value}
          {unit && <span className="text-xs font-medium text-muted-foreground ml-1">{unit}</span>}
        </div>
        {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
      </div>
    </div>
  );
}

function GroupedTable({
  title,
  icon: Icon,
  items,
  totalQtd,
  emptyLabel,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Array<{ largura_cm: number; altura_cm: number; qtd: number; label: string }>;
  totalQtd: number;
  emptyLabel: string;
}) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b">
        <Icon className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold">{title}</span>
        <Badge variant="secondary" className="ml-auto text-[10px] h-5">
          Total: {totalQtd}
        </Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground p-3">{emptyLabel}</p>
      ) : (
        <table className="w-full text-xs">
          <thead className="text-[10px] uppercase text-muted-foreground bg-muted/20">
            <tr>
              <th className="text-left px-3 py-1.5 font-medium">Largura</th>
              <th className="text-left px-3 py-1.5 font-medium">Altura</th>
              <th className="text-right px-3 py-1.5 font-medium">Quantidade</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx} className="border-t">
                <td className="px-3 py-1.5 tabular-nums">{it.largura_cm} cm</td>
                <td className="px-3 py-1.5 tabular-nums">{it.altura_cm} cm</td>
                <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{it.qtd}×</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function PlanGlobalQuantityTable({ totals }: Props) {
  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sigma className="w-4 h-4 text-primary" />
          Quadro geral de quantitativos
          <span className="ml-auto text-[11px] font-normal text-muted-foreground">
            consolidado da planta
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* KPI strip — métricas principais */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <KpiBlock
            icon={LayoutGrid}
            label="Área de piso total"
            value={totals.floor_area_m2_total.toFixed(2)}
            unit="m²"
            tone="primary"
          />
          <KpiBlock
            icon={Ruler}
            label="Rodapé total"
            value={totals.baseboard_m_total.toFixed(2)}
            unit="m"
            hint="perímetro − vãos de portas"
            tone="emerald"
          />
          <KpiBlock
            icon={Square}
            label="Paredes interiores"
            value={totals.interior_walls_m2_total.toFixed(2)}
            unit="m²"
            hint={`pé direito ${totals.ceiling_height_m.toFixed(2)} m`}
            tone="indigo"
          />
          <KpiBlock
            icon={SquareDashed}
            label="Paredes exteriores (estim.)"
            value={totals.exterior_walls_m2_estimate.toFixed(2)}
            unit="m²"
            hint={`perímetro ext. ${totals.exterior_perimeter_m.toFixed(2)} m`}
            tone="amber"
          />
          <KpiBlock
            icon={DoorOpen}
            label="Total portas"
            value={String(totals.doors_qtd_total)}
            unit="un"
            tone="rose"
          />
          <KpiBlock
            icon={AppWindow}
            label="Total janelas"
            value={String(totals.windows_qtd_total)}
            unit="un"
            tone="sky"
          />
          <KpiBlock
            icon={Hash}
            label="Tipos de portas"
            value={String(totals.doorsByDim.length)}
            unit="dim."
            tone="violet"
          />
          <KpiBlock
            icon={Hash}
            label="Tipos de janelas"
            value={String(totals.windowsByDim.length)}
            unit="dim."
            tone="primary"
          />
        </div>

        {/* Doors / Windows grouped */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <GroupedTable
            title="Portas — agrupadas por tamanho"
            icon={DoorOpen}
            items={totals.doorsByDim}
            totalQtd={totals.doors_qtd_total}
            emptyLabel="Sem portas detetadas."
          />
          <GroupedTable
            title="Janelas — agrupadas por tamanho"
            icon={AppWindow}
            items={totals.windowsByDim}
            totalQtd={totals.windows_qtd_total}
            emptyLabel="Sem janelas detetadas."
          />
        </div>

        <p className="text-[10px] text-muted-foreground">
          Paredes interiores: Σ por compartimento (perímetro × pé direito − vãos). Paredes exteriores: estimativa via contorno externo da planta ({totals.exterior_perimeter_m.toFixed(2)} m) × pé direito ({totals.ceiling_height_m.toFixed(2)} m) − vãos exteriores.
        </p>
      </CardContent>
    </Card>
  );
}
