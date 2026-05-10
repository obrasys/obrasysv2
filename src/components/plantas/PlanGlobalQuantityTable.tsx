import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DoorOpen, AppWindow, Ruler, Square, SquareDashed, Sigma } from "lucide-react";
import type { GlobalTotals } from "@/lib/plan-room-analysis";

interface Props {
  totals: GlobalTotals;
}

function KpiBlock({
  icon: Icon,
  label,
  value,
  unit,
  tone = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  unit?: string;
  tone?: "primary" | "emerald" | "amber" | "indigo" | "rose";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
    indigo: "bg-indigo-500/10 text-indigo-600",
    rose: "bg-rose-500/10 text-rose-600",
  };
  return (
    <div className="rounded-xl border bg-card p-3 flex items-start gap-3">
      <div className={`rounded-lg p-2 ${tones[tone]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-xl font-bold tabular-nums leading-tight">
          {value}
          {unit && <span className="text-xs font-medium text-muted-foreground ml-1">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

function GroupedList({
  title,
  icon: Icon,
  items,
  emptyLabel,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Array<{ qtd: number; label: string }>;
  emptyLabel: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2 text-xs font-semibold mb-2">
        <Icon className="w-3.5 h-3.5 text-primary" />
        {title}
        <span className="ml-auto text-[10px] text-muted-foreground font-normal">
          Total: {items.reduce((s, i) => s + i.qtd, 0)}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((it, idx) => (
            <li key={idx} className="flex items-center justify-between text-xs">
              <span className="text-foreground">{it.label}</span>
              <span className="font-semibold tabular-nums">{it.qtd}×</span>
            </li>
          ))}
        </ul>
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
        {/* KPI strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KpiBlock
            icon={Ruler}
            label="Rodapé total"
            value={totals.baseboard_m_total.toFixed(2)}
            unit="m"
            tone="emerald"
          />
          <KpiBlock
            icon={Square}
            label="Paredes interiores"
            value={totals.interior_walls_m2_total.toFixed(2)}
            unit="m²"
            tone="indigo"
          />
          <KpiBlock
            icon={SquareDashed}
            label="Paredes exteriores (estim.)"
            value={totals.exterior_walls_m2_estimate.toFixed(2)}
            unit="m²"
            tone="amber"
          />
        </div>

        {/* Doors / Windows grouped */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <GroupedList
            title="Portas — total por tamanho"
            icon={DoorOpen}
            items={totals.doorsByDim}
            emptyLabel="Sem portas detetadas."
          />
          <GroupedList
            title="Janelas — total por tamanho"
            icon={AppWindow}
            items={totals.windowsByDim}
            emptyLabel="Sem janelas detetadas."
          />
        </div>

        <p className="text-[10px] text-muted-foreground">
          Estimativa de paredes exteriores: perímetro do contorno externo da planta ({totals.exterior_perimeter_m.toFixed(2)} m) × pé direito − vãos exteriores.
        </p>
      </CardContent>
    </Card>
  );
}
