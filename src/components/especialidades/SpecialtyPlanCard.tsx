import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Image as ImageIcon, Trash2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { SPECIALTY_LABELS, type SpecialtyPlan } from "@/types/especialidades";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  uploaded: { label: "Carregada", variant: "secondary" },
  analyzing: { label: "A analisar", variant: "outline" },
  analyzed: { label: "Analisada", variant: "default" },
  review_required: { label: "Por rever", variant: "destructive" },
  validated: { label: "Validada", variant: "default" },
  sent_to_budget: { label: "Em orçamento", variant: "default" },
  failed: { label: "Falhou", variant: "destructive" },
};

interface Props {
  plan: SpecialtyPlan;
  onOpen: () => void;
  onDelete: () => void;
}

export function SpecialtyPlanCard({ plan, onOpen, onDelete }: Props) {
  const isPdf = plan.file_type === "pdf";
  const status = STATUS_MAP[plan.status] ?? STATUS_MAP.uploaded;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group rounded-xl" onClick={onOpen}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {isPdf ? <FileText className="w-8 h-8 text-destructive shrink-0" /> : <ImageIcon className="w-8 h-8 text-primary shrink-0" />}
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{plan.nome_ficheiro}</p>
              <p className="text-xs text-muted-foreground">
                {SPECIALTY_LABELS[plan.specialty_type]}
                {plan.floor_level ? ` · ${plan.floor_level}` : ""}
              </p>
            </div>
          </div>
          <Badge variant={status.variant} className="shrink-0 text-[10px]">{status.label}</Badge>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Carregada: {format(new Date(plan.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}</p>
          {plan.declared_scale && <p>Escala: {plan.declared_scale}</p>}
        </div>
        <div className="flex justify-between items-center pt-1">
          <Button
            variant="ghost" size="sm"
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
