import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Image, Trash2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { PlanImport } from "@/types/plan-measurements";
import { DISCIPLINE_META } from "@/lib/plan-discipline";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pendente: { label: "Pendente", variant: "secondary" },
  calibrada: { label: "Calibrada", variant: "outline" },
  medida: { label: "Medida", variant: "default" },
  validada: { label: "Validada", variant: "default" },
};

interface PlanCardProps {
  plan: PlanImport;
  onOpen: () => void;
  onDelete: () => void;
}

export function PlanCard({ plan, onOpen, onDelete }: PlanCardProps) {
  const isPdf = plan.file_type === "pdf";
  const status = STATUS_MAP[plan.status] ?? STATUS_MAP.pendente;
  const meta = DISCIPLINE_META[plan.disciplina] ?? DISCIPLINE_META.outra;
  const DiscIcon = meta.icon;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={onOpen}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {isPdf ? (
              <FileText className="w-8 h-8 text-destructive shrink-0" />
            ) : (
              <Image className="w-8 h-8 text-primary shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate text-foreground">{plan.nome_ficheiro}</p>
              <p className="text-xs text-muted-foreground">Rev. {plan.revision_number}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant={status.variant} className="text-[10px]">{status.label}</Badge>
            <Badge variant="outline" className={`text-[10px] gap-1 ${meta.badgeClass}`}>
              <DiscIcon className="w-3 h-3" />
              {meta.label}
            </Badge>
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          {plan.data_planta && (
            <p>Data: {format(new Date(plan.data_planta), "dd/MM/yyyy", { locale: pt })}</p>
          )}
          <p>Importado: {format(new Date(plan.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}</p>
          {plan.observacoes && <p className="truncate">Obs: {plan.observacoes}</p>}
        </div>

        <div className="flex justify-between items-center pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="w-3 h-3 mr-1" /> Eliminar
          </Button>
          <Button variant="ghost" size="sm" className="text-xs">
            <ExternalLink className="w-3 h-3 mr-1" /> Abrir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
