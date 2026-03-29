import { Badge } from "@/components/ui/badge";
import { User, Clock, Coins, Building2, Users } from "lucide-react";
import type { Worker } from "@/types/livro-ponto";

interface WorkerSummaryCardProps {
  worker: Worker;
  workedMinutes?: number;
}

export function WorkerSummaryCard({ worker, workedMinutes }: WorkerSummaryCardProps) {
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

  const isSalary = worker.compensation_type === "salary";
  const baseValue = isSalary ? worker.monthly_salary : (worker.hourly_rate || worker.default_hourly_cost);

  const estimatedDailyCost =
    !isSalary && workedMinutes && workedMinutes > 0
      ? (workedMinutes / 60) * baseValue
      : null;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{worker.full_name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {worker.role || "Sem função definida"}
          </p>
        </div>
        <Badge variant={worker.active ? "default" : "secondary"} className="text-xs">
          {worker.active ? "Ativo" : "Inativo"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {worker.subempreiteiro && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{worker.subempreiteiro.nome}</span>
          </div>
        )}
        {worker.equipa_membro && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{worker.equipa_membro.nome}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Coins className="h-3.5 w-3.5 shrink-0" />
          <span>
            {isSalary
              ? `Ordenado · ${formatCurrency(baseValue)}/mês`
              : `Por hora · ${formatCurrency(baseValue)}/h`}
          </span>
        </div>
        {estimatedDailyCost !== null && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>Custo estimado: {formatCurrency(estimatedDailyCost)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
