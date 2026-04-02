import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Image, Trash2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { PlanImport } from "@/types/plan-measurements";
import { DISCIPLINA_OPTIONS } from "@/types/plan-measurements";

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
  const disciplina = DISCIPLINA_OPTIONS.find((d) => d.value === plan.disciplina)?.label ?? plan.disciplina;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={onOpen}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {isPdf ? (
              <FileText className="w-8 h-8 text-red-500 shrink-0" />
            ) : (
              <Image className="w-8 h-8 text-blue-500 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate text-foreground">{plan.nome_ficheiro}</p>
              <p className="text-xs text-muted-foreground">Rev. {plan.revision_number} · {disciplina}</p>
            </div>
          </div>
          <Badge variant={status.variant} className="shrink-0 text-[10px]">{status.label}</Badge>
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
